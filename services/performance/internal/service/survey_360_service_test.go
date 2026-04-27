package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
)

// ============================================================================
// fakeSurvey360Repo — in-memory implementation for tests (no DB needed).
// ============================================================================

type fakeSurvey360Repo struct {
	camps map[uuid.UUID]*domain.Survey360Campaign
	invs  map[uuid.UUID]*domain.Survey360Invitation
	resps map[uuid.UUID][]domain.Survey360Response // keyed by invitation_id
}

func newFakeS360Repo() *fakeSurvey360Repo {
	return &fakeSurvey360Repo{
		camps: map[uuid.UUID]*domain.Survey360Campaign{},
		invs:  map[uuid.UUID]*domain.Survey360Invitation{},
		resps: map[uuid.UUID][]domain.Survey360Response{},
	}
}

func (r *fakeSurvey360Repo) CreateCampaign(_ context.Context, c *domain.Survey360Campaign) error {
	r.camps[c.ID] = c
	return nil
}

func (r *fakeSurvey360Repo) UpdateCampaignStatus(_ context.Context, tenantID, id uuid.UUID, s domain.CampaignStatus) error {
	c, ok := r.camps[id]
	if !ok || c.TenantID != tenantID {
		return domain.ErrNotFound
	}
	c.Status = s
	now := time.Now().UTC()
	switch s {
	case domain.CampDistributed:
		c.DistributedAt = &now
	case domain.CampComplete:
		c.CompletedAt = &now
	}
	return nil
}

func (r *fakeSurvey360Repo) GetCampaign(_ context.Context, tenantID, id uuid.UUID) (*domain.Survey360Campaign, error) {
	c, ok := r.camps[id]
	if !ok || c.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	clone := *c
	return &clone, nil
}

func (r *fakeSurvey360Repo) ListCampaignsBySubject(_ context.Context, tenantID, subj uuid.UUID) ([]*domain.Survey360Campaign, error) {
	out := []*domain.Survey360Campaign{}
	for _, c := range r.camps {
		if c.TenantID != tenantID {
			continue
		}
		if subj != uuid.Nil && c.SubjectUserID != subj {
			continue
		}
		clone := *c
		out = append(out, &clone)
	}
	return out, nil
}

func (r *fakeSurvey360Repo) AddInvitation(_ context.Context, inv *domain.Survey360Invitation) error {
	// Enforce unique (campaign_id, reviewer_user_id).
	for _, e := range r.invs {
		if e.CampaignID == inv.CampaignID && e.ReviewerUserID == inv.ReviewerUserID {
			return domain.ErrConflict
		}
	}
	r.invs[inv.ID] = inv
	return nil
}

func (r *fakeSurvey360Repo) GetInvitation(_ context.Context, tenantID, id uuid.UUID) (*domain.Survey360Invitation, error) {
	inv, ok := r.invs[id]
	if !ok || inv.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	clone := *inv
	return &clone, nil
}

func (r *fakeSurvey360Repo) ListInvitationsByCampaign(_ context.Context, tenantID, cid uuid.UUID) ([]*domain.Survey360Invitation, error) {
	out := []*domain.Survey360Invitation{}
	for _, inv := range r.invs {
		if inv.TenantID != tenantID || inv.CampaignID != cid {
			continue
		}
		clone := *inv
		out = append(out, &clone)
	}
	return out, nil
}

func (r *fakeSurvey360Repo) ListInvitationsByReviewer(_ context.Context, tenantID, reviewer uuid.UUID) ([]*domain.Survey360Invitation, error) {
	out := []*domain.Survey360Invitation{}
	for _, inv := range r.invs {
		if inv.TenantID != tenantID || inv.ReviewerUserID != reviewer {
			continue
		}
		clone := *inv
		out = append(out, &clone)
	}
	return out, nil
}

func (r *fakeSurvey360Repo) MarkInvitationResponded(_ context.Context, tenantID, id uuid.UUID) error {
	inv, ok := r.invs[id]
	if !ok || inv.TenantID != tenantID {
		return domain.ErrNotFound
	}
	if inv.Status == domain.InvResponded {
		return domain.ErrConflict
	}
	inv.Status = domain.InvResponded
	now := time.Now().UTC()
	inv.RespondedAt = &now
	return nil
}

func (r *fakeSurvey360Repo) AppendResponses(_ context.Context, tenantID, invID, cid uuid.UUID, items []domain.Survey360Response) error {
	existing := r.resps[invID]
	// unique (invitation_id, competency_code).
	for _, it := range items {
		for _, e := range existing {
			if e.CompetencyCode == it.CompetencyCode {
				return domain.ErrConflict
			}
		}
	}
	r.resps[invID] = append(existing, items...)
	return nil
}

func (r *fakeSurvey360Repo) ListResponsesByCampaign(_ context.Context, tenantID, cid uuid.UUID) ([]*domain.Survey360Response, map[uuid.UUID]domain.Relation, error) {
	out := []*domain.Survey360Response{}
	relMap := map[uuid.UUID]domain.Relation{}
	for invID, items := range r.resps {
		inv, ok := r.invs[invID]
		if !ok || inv.CampaignID != cid {
			continue
		}
		for i := range items {
			clone := items[i]
			out = append(out, &clone)
		}
	}
	for _, inv := range r.invs {
		if inv.TenantID == tenantID && inv.CampaignID == cid {
			relMap[inv.ID] = inv.Relation
		}
	}
	return out, relMap, nil
}

// ============================================================================
// Helpers
// ============================================================================

func newSvc360(t *testing.T) (*Survey360Service, *fakeSurvey360Repo) {
	t.Helper()
	repo := newFakeS360Repo()
	return NewSurvey360Service(repo, zerolog.Nop()), repo
}

func createDraftCampaign(t *testing.T, svc *Survey360Service, tid, actor, subj uuid.UUID) *domain.Survey360Campaign {
	t.Helper()
	c, err := svc.CreateCampaign(context.Background(), tid, actor, CreateCampaignRequest{
		CycleID:       uuid.New(),
		SubjectUserID: subj,
		AnonymityMode: "anonymous",
		DueDate:       time.Now().Add(14 * 24 * time.Hour).Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("CreateCampaign: %v", err)
	}
	return c
}

// ============================================================================
// Tests
// ============================================================================

func TestSurvey360_CreateCampaign_Validates(t *testing.T) {
	svc, _ := newSvc360(t)
	tid := uuid.New()
	actor := uuid.New()
	_, err := svc.CreateCampaign(context.Background(), tid, actor, CreateCampaignRequest{})
	var ve *domain.ValidationError
	if !errorsAs(err, &ve) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if ve.Fields["due_date"] == "" {
		t.Errorf("due_date should be flagged, got %+v", ve.Fields)
	}
}

func TestSurvey360_CreateCampaign_RequiresAuth(t *testing.T) {
	svc, _ := newSvc360(t)
	_, err := svc.CreateCampaign(context.Background(), uuid.Nil, uuid.Nil, CreateCampaignRequest{})
	if err != domain.ErrForbidden {
		t.Fatalf("want ErrForbidden, got %v", err)
	}
}

func TestSurvey360_CreateCampaign_Ok(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	c := createDraftCampaign(t, svc, tid, actor, subj)
	if c.Status != domain.CampDraft {
		t.Errorf("expected draft, got %s", c.Status)
	}
	if c.MinResponses != 3 {
		t.Errorf("default min_responses = 3, got %d", c.MinResponses)
	}
	if c.AnonymityMode != domain.AnonModeAnonymous {
		t.Errorf("expected anonymous default")
	}
}

func TestSurvey360_AddInvitation_RejectsSelfAsReviewer(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	// Peer reviewer cannot be the subject.
	_, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{
		ReviewerUserID: subj,
		Relation:       "peer",
	})
	var ve *domain.ValidationError
	if !errorsAs(err, &ve) {
		t.Fatalf("expected validation error, got %v", err)
	}
	if ve.Fields["reviewer_user_id"] == "" {
		t.Errorf("expected reviewer_user_id flag, got %+v", ve.Fields)
	}
}

func TestSurvey360_AddInvitation_SelfMustBeSubject(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	_, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{
		ReviewerUserID: uuid.New(), // someone else
		Relation:       "self",
	})
	var ve *domain.ValidationError
	if !errorsAs(err, &ve) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestSurvey360_AddInvitation_DuplicateConflict(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	peer := uuid.New()
	if _, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: peer, Relation: "peer"}); err != nil {
		t.Fatalf("first invite: %v", err)
	}
	_, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: peer, Relation: "peer"})
	if err != domain.ErrConflict {
		t.Fatalf("want ErrConflict, got %v", err)
	}
}

func TestSurvey360_Distribute_RequiresMinPeersAndManager(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	// Only 2 peers, no manager → fail.
	_, _ = svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: uuid.New(), Relation: "peer"})
	_, _ = svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: uuid.New(), Relation: "peer"})
	_, err := svc.Distribute(context.Background(), tid, camp.ID)
	var ve *domain.ValidationError
	if !errorsAs(err, &ve) {
		t.Fatalf("want validation error, got %v", err)
	}
}

func TestSurvey360_Distribute_Ok(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	// 3 peers + 1 manager
	for i := 0; i < 3; i++ {
		if _, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{
			ReviewerUserID: uuid.New(), Relation: "peer",
		}); err != nil {
			t.Fatalf("peer invite: %v", err)
		}
	}
	if _, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{
		ReviewerUserID: uuid.New(), Relation: "manager",
	}); err != nil {
		t.Fatalf("manager invite: %v", err)
	}
	c2, err := svc.Distribute(context.Background(), tid, camp.ID)
	if err != nil {
		t.Fatalf("Distribute: %v", err)
	}
	if c2.Status != domain.CampDistributed {
		t.Errorf("expected distributed, got %s", c2.Status)
	}
}

func TestSurvey360_Report_LockedUntilMin(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	rep, err := svc.Report(context.Background(), tid, camp.ID)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if rep.Unlocked {
		t.Errorf("expected locked report when no responses")
	}
	if rep.LockedReason == "" {
		t.Errorf("expected LockedReason")
	}
}

func TestSurvey360_Report_UnlocksAfterMin(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)

	peers := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	manager := uuid.New()
	for _, p := range peers {
		if _, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: p, Relation: "peer"}); err != nil {
			t.Fatalf("peer invite: %v", err)
		}
	}
	_, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: manager, Relation: "manager"})
	if err != nil {
		t.Fatalf("manager invite: %v", err)
	}
	if _, err := svc.Distribute(context.Background(), tid, camp.ID); err != nil {
		t.Fatalf("distribute: %v", err)
	}

	// Each reviewer submits.
	submit := func(reviewer uuid.UUID) {
		invs, _ := svc.ListInvitationsForReviewer(context.Background(), tid, reviewer)
		if len(invs) != 1 {
			t.Fatalf("want 1 invitation, got %d", len(invs))
		}
		err := svc.SubmitResponse(context.Background(), tid, invs[0].ID, reviewer, SubmitResponseRequest{
			Items: []ResponseItem{
				{CompetencyCode: "COMM", CompetencyNameTR: "İletişim", Score: 4},
				{CompetencyCode: "COLL", CompetencyNameTR: "İşbirliği", Score: 3},
			},
		})
		if err != nil {
			t.Fatalf("submit: %v", err)
		}
	}
	for _, p := range peers {
		submit(p)
	}
	submit(manager)

	rep, err := svc.Report(context.Background(), tid, camp.ID)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if !rep.Unlocked {
		t.Fatalf("expected unlocked, got locked: %s", rep.LockedReason)
	}
	if len(rep.Competencies) != 2 {
		t.Fatalf("expected 2 competencies, got %d", len(rep.Competencies))
	}
	if rep.ReviewerCount != 4 {
		t.Errorf("expected 4 reviewers, got %d", rep.ReviewerCount)
	}
	if len(rep.Strengths) == 0 {
		t.Errorf("expected strengths populated")
	}
}

func TestSurvey360_SubmitResponse_RejectsWrongReviewer(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	reviewer := uuid.New()
	other := uuid.New()
	inv, err := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: reviewer, Relation: "peer"})
	if err != nil {
		t.Fatalf("invite: %v", err)
	}
	err = svc.SubmitResponse(context.Background(), tid, inv.ID, other, SubmitResponseRequest{
		Items: []ResponseItem{{CompetencyCode: "X", CompetencyNameTR: "X", Score: 3}},
	})
	if err != domain.ErrForbidden {
		t.Fatalf("want ErrForbidden, got %v", err)
	}
}

func TestSurvey360_SubmitResponse_IdempotentRejection(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	reviewer := uuid.New()
	inv, _ := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: reviewer, Relation: "peer"})
	if err := svc.SubmitResponse(context.Background(), tid, inv.ID, reviewer, SubmitResponseRequest{
		Items: []ResponseItem{{CompetencyCode: "X", CompetencyNameTR: "X", Score: 3}},
	}); err != nil {
		t.Fatalf("first submit: %v", err)
	}
	err := svc.SubmitResponse(context.Background(), tid, inv.ID, reviewer, SubmitResponseRequest{
		Items: []ResponseItem{{CompetencyCode: "Y", CompetencyNameTR: "Y", Score: 3}},
	})
	if err != domain.ErrConflict {
		t.Fatalf("want ErrConflict (double submit), got %v", err)
	}
}

func TestSurvey360_SubmitResponse_RejectsInvalidScore(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	reviewer := uuid.New()
	inv, _ := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: reviewer, Relation: "peer"})
	err := svc.SubmitResponse(context.Background(), tid, inv.ID, reviewer, SubmitResponseRequest{
		Items: []ResponseItem{{CompetencyCode: "X", CompetencyNameTR: "X", Score: 9}},
	})
	if err == nil {
		t.Fatalf("expected validation error for score=9")
	}
}

func TestSurvey360_SubmitResponse_EmptyItemsRejected(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	reviewer := uuid.New()
	inv, _ := svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: reviewer, Relation: "peer"})
	err := svc.SubmitResponse(context.Background(), tid, inv.ID, reviewer, SubmitResponseRequest{Items: nil})
	if err == nil {
		t.Fatalf("expected validation error for empty items")
	}
}

func TestSurvey360_StatusTransitionsStrict(t *testing.T) {
	cases := []struct {
		from, to domain.CampaignStatus
		ok       bool
	}{
		{domain.CampDraft, domain.CampDistributed, true},
		{domain.CampDraft, domain.CampComplete, false},
		{domain.CampDistributed, domain.CampCollecting, true},
		{domain.CampCollecting, domain.CampComplete, true},
		{domain.CampComplete, domain.CampDistributed, false},
		{domain.CampCancelled, domain.CampDistributed, false},
	}
	for _, c := range cases {
		if got := c.from.CanTransitionTo(c.to); got != c.ok {
			t.Errorf("%s → %s: want %v, got %v", c.from, c.to, c.ok, got)
		}
	}
}

func TestSurvey360_AnonymousReportCarriesMode(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	rep, err := svc.Report(context.Background(), tid, camp.ID)
	if err != nil {
		t.Fatalf("Report: %v", err)
	}
	if rep.AnonymityMode != domain.AnonModeAnonymous {
		t.Errorf("expected anonymous mode in report, got %s", rep.AnonymityMode)
	}
}

func TestSurvey360_ListCampaignsBySubject(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor := uuid.New(), uuid.New()
	subj := uuid.New()
	createDraftCampaign(t, svc, tid, actor, subj)
	createDraftCampaign(t, svc, tid, actor, subj)
	items, err := svc.ListCampaignsForSubject(context.Background(), tid, subj)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(items) != 2 {
		t.Errorf("expected 2, got %d", len(items))
	}
}

func TestSurvey360_CreateCampaign_DefaultAnonymityWhenBlank(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	c, err := svc.CreateCampaign(context.Background(), tid, actor, CreateCampaignRequest{
		CycleID:       uuid.New(),
		SubjectUserID: subj,
		AnonymityMode: "",
		DueDate:       time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if c.AnonymityMode != domain.AnonModeAnonymous {
		t.Errorf("expected default anonymous, got %s", c.AnonymityMode)
	}
}

func TestSurvey360_CreateCampaign_NamedMode(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	c, err := svc.CreateCampaign(context.Background(), tid, actor, CreateCampaignRequest{
		CycleID:       uuid.New(),
		SubjectUserID: subj,
		AnonymityMode: "named",
		DueDate:       time.Now().Add(7 * 24 * time.Hour).Format("2006-01-02"),
	})
	if err != nil {
		t.Fatalf("create named: %v", err)
	}
	if c.AnonymityMode != domain.AnonModeNamed {
		t.Errorf("expected named, got %s", c.AnonymityMode)
	}
	if c.IsAnonymous() {
		t.Errorf("IsAnonymous must be false for named mode")
	}
}

func TestSurvey360_InvitationsByReviewer(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	reviewer := uuid.New()
	_, _ = svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: reviewer, Relation: "peer"})
	invs, err := svc.ListInvitationsForReviewer(context.Background(), tid, reviewer)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(invs) != 1 {
		t.Fatalf("want 1, got %d", len(invs))
	}
}

func TestSurvey360_Distribute_AlreadyDistributedFails(t *testing.T) {
	svc, _ := newSvc360(t)
	tid, actor, subj := uuid.New(), uuid.New(), uuid.New()
	camp := createDraftCampaign(t, svc, tid, actor, subj)
	for i := 0; i < 3; i++ {
		_, _ = svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: uuid.New(), Relation: "peer"})
	}
	_, _ = svc.AddInvitation(context.Background(), tid, camp.ID, InviteRequest{ReviewerUserID: uuid.New(), Relation: "manager"})
	if _, err := svc.Distribute(context.Background(), tid, camp.ID); err != nil {
		t.Fatalf("first distribute: %v", err)
	}
	_, err := svc.Distribute(context.Background(), tid, camp.ID)
	if err != domain.ErrInvalidStatus {
		t.Fatalf("expected ErrInvalidStatus on re-distribute, got %v", err)
	}
}
