// Package service — 360° feedback orchestrator.
package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/event"
	"github.com/upcore/performance/internal/repository"
)

// Survey 360 event topics.
const (
	TopicS360CampaignCreated    = "performance.survey_360.campaign.created.v1"
	TopicS360CampaignDistributed = "performance.survey_360.campaign.distributed.v1"
	TopicS360CampaignCompleted  = "performance.survey_360.campaign.completed.v1"
	TopicS360InvitationCreated  = "performance.survey_360.invitation.created.v1"
	TopicS360InvitationSubmitted = "performance.survey_360.invitation.submitted.v1"
	TopicS360Invitation          = "performance.survey_360.invitation.v1" // reviewer e-posta tetikleyicisi
)

// Survey360Service orchestrates 360 campaigns.
type Survey360Service struct {
	repo      repository.Survey360Repository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewSurvey360Service constructs the service.
func NewSurvey360Service(repo repository.Survey360Repository, log zerolog.Logger) *Survey360Service {
	return &Survey360Service{repo: repo, log: log}
}

// WithPublisher wires an audit-log publisher.
func (s *Survey360Service) WithPublisher(p event.Publisher) *Survey360Service {
	s.publisher = p
	return s
}

func (s *Survey360Service) emit(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Error().Err(err).Str("topic", topic).Msg("survey 360 audit publish failed")
	}
}

// ============================================================================
// Requests
// ============================================================================

// CreateCampaignRequest is the POST body.
type CreateCampaignRequest struct {
	CycleID       uuid.UUID `json:"cycle_id"`
	SubjectUserID uuid.UUID `json:"subject_user_id"`
	AnonymityMode string    `json:"anonymity_mode"`
	DueDate       string    `json:"due_date"`
	MinResponses  int       `json:"min_responses,omitempty"`
}

// InviteRequest is a single reviewer invitation.
type InviteRequest struct {
	ReviewerUserID uuid.UUID `json:"reviewer_user_id"`
	Relation       string    `json:"relation"`
}

// ResponseItem is a competency-level score + optional comment.
type ResponseItem struct {
	CompetencyCode   string `json:"competency_code"`
	CompetencyNameTR string `json:"competency_name_tr"`
	Score            int16  `json:"score"`
	Comment          string `json:"comment,omitempty"`
}

// SubmitResponseRequest bundles all competency scores for one reviewer.
type SubmitResponseRequest struct {
	Items []ResponseItem `json:"items"`
}

// ============================================================================
// Methods
// ============================================================================

// CreateCampaign drafts a new 360 campaign.
func (s *Survey360Service) CreateCampaign(ctx context.Context, tenantID, actorID uuid.UUID, req CreateCampaignRequest) (*domain.Survey360Campaign, error) {
	if tenantID == uuid.Nil || actorID == uuid.Nil {
		return nil, domain.ErrForbidden
	}
	due, err := parseDate(req.DueDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"due_date": "invalid"})
	}
	c := &domain.Survey360Campaign{
		TenantID:      tenantID,
		CycleID:       req.CycleID,
		SubjectUserID: req.SubjectUserID,
		CreatedBy:     actorID,
		AnonymityMode: domain.AnonymityMode(strings.TrimSpace(req.AnonymityMode)),
		DueDate:       due,
		MinResponses:  req.MinResponses,
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.CreateCampaign(ctx, c); err != nil {
		return nil, err
	}
	s.emit(ctx, TopicS360CampaignCreated, map[string]any{
		"campaign_id":     c.ID,
		"tenant_id":       tenantID,
		"cycle_id":        c.CycleID,
		"subject_user_id": c.SubjectUserID,
		"created_by":      c.CreatedBy,
		"anonymity_mode":  c.AnonymityMode,
		"due_date":        c.DueDate.Format(time.RFC3339),
	})
	return c, nil
}

// ListCampaignsForSubject returns campaigns where the user is the subject.
func (s *Survey360Service) ListCampaignsForSubject(ctx context.Context, tenantID, subjectUserID uuid.UUID) ([]*domain.Survey360Campaign, error) {
	return s.repo.ListCampaignsBySubject(ctx, tenantID, subjectUserID)
}

// GetCampaign returns a campaign by id.
func (s *Survey360Service) GetCampaign(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Campaign, error) {
	return s.repo.GetCampaign(ctx, tenantID, id)
}

// AddInvitation attaches a reviewer. Distribution rules:
//   • Campaign must be draft or distributed.
//   • Relation must be valid.
//   • Reviewer cannot be the subject (unless relation=self).
func (s *Survey360Service) AddInvitation(ctx context.Context, tenantID, campaignID uuid.UUID, req InviteRequest) (*domain.Survey360Invitation, error) {
	camp, err := s.repo.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return nil, err
	}
	if camp.Status == domain.CampComplete || camp.Status == domain.CampCancelled {
		return nil, domain.ErrInvalidStatus
	}
	rel := domain.Relation(strings.TrimSpace(req.Relation))
	if !rel.IsValid() {
		return nil, domain.NewValidationError(map[string]string{"relation": "invalid"})
	}
	// Self-review must match subject.
	if rel == domain.RelSelf && req.ReviewerUserID != camp.SubjectUserID {
		return nil, domain.NewValidationError(map[string]string{"reviewer_user_id": "self_must_be_subject"})
	}
	// Non-self reviewer must differ from subject.
	if rel != domain.RelSelf && req.ReviewerUserID == camp.SubjectUserID {
		return nil, domain.NewValidationError(map[string]string{"reviewer_user_id": "cannot_review_yourself"})
	}
	inv := &domain.Survey360Invitation{
		TenantID:       tenantID,
		CampaignID:     campaignID,
		ReviewerUserID: req.ReviewerUserID,
		Relation:       rel,
	}
	inv.ApplyDefaults()
	if err := inv.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.AddInvitation(ctx, inv); err != nil {
		return nil, err
	}
	s.emit(ctx, TopicS360InvitationCreated, map[string]any{
		"invitation_id":    inv.ID,
		"campaign_id":      campaignID,
		"tenant_id":        tenantID,
		"reviewer_user_id": inv.ReviewerUserID,
		"relation":         inv.Relation,
	})
	return inv, nil
}

// Distribute validates the reviewer mix (min 3 peers + 1 manager) then moves
// the campaign into "distributed" and emits per-invitation notification events.
func (s *Survey360Service) Distribute(ctx context.Context, tenantID, campaignID uuid.UUID) (*domain.Survey360Campaign, error) {
	camp, err := s.repo.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return nil, err
	}
	if !camp.Status.CanTransitionTo(domain.CampDistributed) {
		return nil, domain.ErrInvalidStatus
	}
	invs, err := s.repo.ListInvitationsByCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return nil, err
	}
	peers, managers := 0, 0
	for _, i := range invs {
		switch i.Relation {
		case domain.RelPeer:
			peers++
		case domain.RelManager:
			managers++
		}
	}
	if peers < 3 {
		return nil, domain.NewValidationError(map[string]string{"peers": "min_3_required"})
	}
	if managers < 1 {
		return nil, domain.NewValidationError(map[string]string{"manager": "min_1_required"})
	}
	if err := s.repo.UpdateCampaignStatus(ctx, tenantID, campaignID, domain.CampDistributed); err != nil {
		return nil, err
	}
	camp.Status = domain.CampDistributed
	now := time.Now().UTC()
	camp.DistributedAt = &now
	s.emit(ctx, TopicS360CampaignDistributed, map[string]any{
		"campaign_id":     camp.ID,
		"tenant_id":       tenantID,
		"subject_user_id": camp.SubjectUserID,
		"due_date":        camp.DueDate.Format(time.RFC3339),
		"reviewer_count":  len(invs),
	})
	// Emit per-invitation notification event (notification service konsümü).
	for _, i := range invs {
		s.emit(ctx, TopicS360Invitation, map[string]any{
			"invitation_id":    i.ID,
			"campaign_id":      camp.ID,
			"tenant_id":        tenantID,
			"subject_user_id":  camp.SubjectUserID,
			"reviewer_user_id": i.ReviewerUserID,
			"relation":         i.Relation,
			"due_date":         camp.DueDate.Format(time.RFC3339),
			"anonymity_mode":   camp.AnonymityMode,
		})
	}
	return camp, nil
}

// ListInvitationsForReviewer returns the reviewer's open invitations.
func (s *Survey360Service) ListInvitationsForReviewer(ctx context.Context, tenantID, reviewerUserID uuid.UUID) ([]*domain.Survey360Invitation, error) {
	return s.repo.ListInvitationsByReviewer(ctx, tenantID, reviewerUserID)
}

// InvitationsByCampaign returns every invitation attached to a campaign.
func (s *Survey360Service) InvitationsByCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) ([]*domain.Survey360Invitation, error) {
	return s.repo.ListInvitationsByCampaign(ctx, tenantID, campaignID)
}

// GetInvitation returns one invitation.
func (s *Survey360Service) GetInvitation(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Invitation, error) {
	return s.repo.GetInvitation(ctx, tenantID, id)
}

// SubmitResponse persists reviewer answers. Idempotent: second submit rejected
// with ErrConflict. Only the invitation's own reviewer_user_id may submit.
func (s *Survey360Service) SubmitResponse(ctx context.Context, tenantID, invitationID, reviewerUserID uuid.UUID, req SubmitResponseRequest) error {
	if len(req.Items) == 0 {
		return domain.NewValidationError(map[string]string{"items": "empty"})
	}
	inv, err := s.repo.GetInvitation(ctx, tenantID, invitationID)
	if err != nil {
		return err
	}
	if inv.ReviewerUserID != reviewerUserID {
		return domain.ErrForbidden
	}
	if inv.Status == domain.InvResponded {
		return domain.ErrConflict
	}
	// Validate every item.
	items := make([]domain.Survey360Response, 0, len(req.Items))
	for i, it := range req.Items {
		resp := domain.Survey360Response{
			InvitationID:     inv.ID,
			CampaignID:       inv.CampaignID,
			CompetencyCode:   strings.TrimSpace(it.CompetencyCode),
			CompetencyNameTR: strings.TrimSpace(it.CompetencyNameTR),
			Score:            it.Score,
		}
		if c := strings.TrimSpace(it.Comment); c != "" {
			resp.Comment = &c
		}
		resp.ApplyDefaults()
		if err := resp.Validate(); err != nil {
			return fmt.Errorf("item %d: %w", i, err)
		}
		items = append(items, resp)
	}
	if err := s.repo.AppendResponses(ctx, tenantID, inv.ID, inv.CampaignID, items); err != nil {
		return err
	}
	if err := s.repo.MarkInvitationResponded(ctx, tenantID, inv.ID); err != nil {
		return err
	}
	s.emit(ctx, TopicS360InvitationSubmitted, map[string]any{
		"invitation_id":    inv.ID,
		"campaign_id":      inv.CampaignID,
		"tenant_id":        tenantID,
		"reviewer_user_id": reviewerUserID,
		"relation":         inv.Relation,
		"item_count":       len(items),
	})
	// Transition campaign to 'collecting' on first submit, 'complete' when all invitations responded.
	s.maybeAdvanceCampaign(ctx, tenantID, inv.CampaignID)
	return nil
}

// maybeAdvanceCampaign flips draft/distributed → collecting → complete based on responses.
// Failures are logged only; submit itself already succeeded.
func (s *Survey360Service) maybeAdvanceCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) {
	camp, err := s.repo.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		s.log.Warn().Err(err).Msg("maybeAdvanceCampaign: get failed")
		return
	}
	invs, err := s.repo.ListInvitationsByCampaign(ctx, tenantID, campaignID)
	if err != nil {
		s.log.Warn().Err(err).Msg("maybeAdvanceCampaign: list invs failed")
		return
	}
	responded := 0
	for _, i := range invs {
		if i.Status == domain.InvResponded {
			responded++
		}
	}
	// First response brings status to collecting.
	if camp.Status == domain.CampDistributed && responded > 0 {
		if err := s.repo.UpdateCampaignStatus(ctx, tenantID, campaignID, domain.CampCollecting); err == nil {
			camp.Status = domain.CampCollecting
		}
	}
	// All responded → complete.
	if len(invs) > 0 && responded == len(invs) && camp.Status != domain.CampComplete {
		if err := s.repo.UpdateCampaignStatus(ctx, tenantID, campaignID, domain.CampComplete); err == nil {
			s.emit(ctx, TopicS360CampaignCompleted, map[string]any{
				"campaign_id":     campaignID,
				"tenant_id":       tenantID,
				"subject_user_id": camp.SubjectUserID,
				"response_count":  responded,
			})
		}
	}
}

// Report aggregates responses into a radar-ready payload.
// Access control (subject/manager/HR) is enforced by the handler layer; this
// method returns data. Anonymous campaigns always strip reviewer identity:
// the response table never stored reviewer_user_id, so leakage is impossible.
func (s *Survey360Service) Report(ctx context.Context, tenantID, campaignID uuid.UUID) (*domain.Survey360Report, error) {
	camp, err := s.repo.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return nil, err
	}
	resps, relMap, err := s.repo.ListResponsesByCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return nil, err
	}
	uniqueReviewers := map[uuid.UUID]struct{}{}
	for _, r := range resps {
		uniqueReviewers[r.InvitationID] = struct{}{}
	}
	rep := &domain.Survey360Report{
		CampaignID:    camp.ID,
		SubjectUserID: camp.SubjectUserID,
		AnonymityMode: camp.AnonymityMode,
		Status:        camp.Status,
		ResponseCount: len(resps),
		ReviewerCount: len(uniqueReviewers),
		MinResponses:  camp.MinResponses,
	}
	if len(uniqueReviewers) < camp.MinResponses {
		rep.Unlocked = false
		rep.LockedReason = "Yeterli cevap toplanmadı"
		rep.Competencies = []domain.CompetencyAggregate{}
		return rep, nil
	}
	rep.Unlocked = true
	// Aggregate by competency.
	type acc struct {
		NameTR   string
		Sum      int
		Count    int
		ByRel    map[domain.Relation]float64
		RelCount map[domain.Relation]int
		RelSum   map[domain.Relation]int
	}
	byCode := map[string]*acc{}
	for _, r := range resps {
		a, ok := byCode[r.CompetencyCode]
		if !ok {
			a = &acc{
				NameTR:   r.CompetencyNameTR,
				ByRel:    map[domain.Relation]float64{},
				RelCount: map[domain.Relation]int{},
				RelSum:   map[domain.Relation]int{},
			}
			byCode[r.CompetencyCode] = a
		}
		a.Sum += int(r.Score)
		a.Count++
		if rel, ok := relMap[r.InvitationID]; ok {
			a.RelSum[rel] += int(r.Score)
			a.RelCount[rel]++
		}
	}
	codes := make([]string, 0, len(byCode))
	for k := range byCode {
		codes = append(codes, k)
	}
	sort.Strings(codes)
	aggs := make([]domain.CompetencyAggregate, 0, len(codes))
	for _, code := range codes {
		a := byCode[code]
		avg := 0.0
		if a.Count > 0 {
			avg = float64(a.Sum) / float64(a.Count)
		}
		relAvg := map[domain.Relation]float64{}
		for rel, n := range a.RelCount {
			if n > 0 {
				relAvg[rel] = float64(a.RelSum[rel]) / float64(n)
			}
		}
		aggs = append(aggs, domain.CompetencyAggregate{
			CompetencyCode:   code,
			CompetencyNameTR: a.NameTR,
			Average:          round2(avg),
			SampleSize:       a.Count,
			ByRelation:       relAvg,
		})
	}
	rep.Competencies = aggs
	// Derive top 3 strengths + bottom 3 growth areas.
	sorted := make([]domain.CompetencyAggregate, len(aggs))
	copy(sorted, aggs)
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].Average > sorted[j].Average })
	for i := 0; i < len(sorted) && i < 3; i++ {
		rep.Strengths = append(rep.Strengths, sorted[i].CompetencyNameTR)
	}
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].Average < sorted[j].Average })
	for i := 0; i < len(sorted) && i < 3; i++ {
		rep.GrowthAreas = append(rep.GrowthAreas, sorted[i].CompetencyNameTR)
	}
	return rep, nil
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100.0
}

// errSentinel keeps errors.As usable for sentinel wrapping in future callers.
var _ = errors.New
