// Package service bundles the performance domain use cases.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/event"
	"github.com/upcore/performance/internal/repository"
)

// jsonMarshal indirection to let marshalJSON stay testable (and avoid an unused import).
var jsonMarshal = json.Marshal

func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, errors.New("empty")
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("unparseable date: %q", s)
}

func parseOptionalDate(s string) (*time.Time, error) {
	if strings.TrimSpace(s) == "" {
		return nil, nil
	}
	t, err := parseDate(s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// ============================================================================
// Cycle Service
// ============================================================================

// CycleService manages performance cycles.
type CycleService struct {
	repo repository.CycleRepository
	log  zerolog.Logger
}

// NewCycleService constructs the service.
func NewCycleService(repo repository.CycleRepository, log zerolog.Logger) *CycleService {
	return &CycleService{repo: repo, log: log}
}

// CycleRequest is the Create/Update body.
type CycleRequest struct {
	NameTR           string `json:"name_tr"`
	CycleType        string `json:"cycle_type"`
	PeriodStart      string `json:"period_start"`
	PeriodEnd        string `json:"period_end"`
	GoalSettingStart string `json:"goal_setting_start,omitempty"`
	GoalSettingEnd   string `json:"goal_setting_end,omitempty"`
	ReviewStart      string `json:"review_start,omitempty"`
	ReviewEnd        string `json:"review_end,omitempty"`
	Description      string `json:"description,omitempty"`
}

// Create drafts a new cycle (status=planning).
func (s *CycleService) Create(ctx context.Context, tenantID, actorID uuid.UUID, req CycleRequest) (*domain.PerformanceCycle, error) {
	start, err := parseDate(req.PeriodStart)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"period_start": "invalid"})
	}
	end, err := parseDate(req.PeriodEnd)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"period_end": "invalid"})
	}
	c := &domain.PerformanceCycle{
		TenantID:    tenantID,
		NameTR:      strings.TrimSpace(req.NameTR),
		CycleType:   domain.CycleType(strings.TrimSpace(req.CycleType)),
		PeriodStart: start,
		PeriodEnd:   end,
	}
	c.GoalSettingStart, _ = parseOptionalDate(req.GoalSettingStart)
	c.GoalSettingEnd, _ = parseOptionalDate(req.GoalSettingEnd)
	c.ReviewStart, _ = parseOptionalDate(req.ReviewStart)
	c.ReviewEnd, _ = parseOptionalDate(req.ReviewEnd)
	if v := strings.TrimSpace(req.Description); v != "" {
		c.Description = &v
	}
	if actorID != uuid.Nil {
		c.CreatedBy = &actorID
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// Get returns a single cycle.
func (s *CycleService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceCycle, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns paginated cycles.
func (s *CycleService) List(ctx context.Context, tenantID uuid.UUID, status string, page, limit int) ([]*domain.PerformanceCycle, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if page < 0 {
		page = 0
	}
	return s.repo.List(ctx, tenantID, status, limit, page*limit)
}

// Advance transitions the cycle to the next logical status.
func (s *CycleService) Advance(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceCycle, error) {
	c, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	next := c.AdvanceStatus()
	if next == c.Status {
		return c, nil
	}
	c.Status = next
	if err := s.repo.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// ============================================================================
// Goal Service
// ============================================================================

// GoalService manages SMART performance goals.
type GoalService struct {
	repo repository.GoalRepository
	log  zerolog.Logger
}

// NewGoalService constructs the service.
func NewGoalService(repo repository.GoalRepository, log zerolog.Logger) *GoalService {
	return &GoalService{repo: repo, log: log}
}

// GoalRequest is the Create body.
type GoalRequest struct {
	CycleID       uuid.UUID `json:"cycle_id"`
	EmployeeID    uuid.UUID `json:"employee_id"`
	Category      string    `json:"category"`
	TitleTR       string    `json:"title_tr"`
	Description   string    `json:"description,omitempty"`
	MetricType    string    `json:"metric_type"`
	TargetValue   *float64  `json:"target_value,omitempty"`
	CurrentValue  float64   `json:"current_value,omitempty"`
	Unit          string    `json:"unit,omitempty"`
	WeightPct     int       `json:"weight_pct,omitempty"`
	DueDate       string    `json:"due_date,omitempty"`
	AlignedWithID *uuid.UUID `json:"aligned_with_id,omitempty"`
	ManagerID     *uuid.UUID `json:"manager_id,omitempty"`
}

// GoalUpdateRequest is the PATCH body (progress tracking).
type GoalUpdateRequest struct {
	Status       string   `json:"status,omitempty"`
	CurrentValue *float64 `json:"current_value,omitempty"`
	ProgressPct  *int     `json:"progress_pct,omitempty"`
	Description  string   `json:"description,omitempty"`
}

// Create adds a new goal.
func (s *GoalService) Create(ctx context.Context, tenantID uuid.UUID, req GoalRequest) (*domain.PerformanceGoal, error) {
	g := &domain.PerformanceGoal{
		TenantID:      tenantID,
		CycleID:       req.CycleID,
		EmployeeID:    req.EmployeeID,
		Category:      domain.GoalCategory(strings.TrimSpace(req.Category)),
		TitleTR:       strings.TrimSpace(req.TitleTR),
		MetricType:    domain.MetricType(strings.TrimSpace(req.MetricType)),
		TargetValue:   req.TargetValue,
		CurrentValue:  req.CurrentValue,
		WeightPct:     req.WeightPct,
		AlignedWithID: req.AlignedWithID,
		ManagerID:     req.ManagerID,
	}
	if v := strings.TrimSpace(req.Description); v != "" {
		g.Description = &v
	}
	if v := strings.TrimSpace(req.Unit); v != "" {
		g.Unit = &v
	}
	if due, err := parseOptionalDate(req.DueDate); err == nil {
		g.DueDate = due
	}
	g.ApplyDefaults()
	if err := g.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

// Update applies progress/status changes.
func (s *GoalService) Update(ctx context.Context, tenantID, id uuid.UUID, req GoalUpdateRequest) (*domain.PerformanceGoal, error) {
	g, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v := strings.TrimSpace(req.Status); v != "" {
		status := domain.GoalStatus(v)
		if !status.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"status": "invalid"})
		}
		g.Status = status
	}
	if req.CurrentValue != nil {
		g.CurrentValue = *req.CurrentValue
		g.ProgressPct = g.ComputeProgress()
	}
	if req.ProgressPct != nil {
		if *req.ProgressPct < 0 || *req.ProgressPct > 100 {
			return nil, domain.NewValidationError(map[string]string{"progress_pct": "must_be_0_to_100"})
		}
		g.ProgressPct = *req.ProgressPct
	}
	if v := strings.TrimSpace(req.Description); v != "" {
		g.Description = &v
	}
	if err := g.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Update(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

// Get returns a single goal.
func (s *GoalService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceGoal, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns goals for a cycle/employee.
func (s *GoalService) List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, status string) ([]*domain.PerformanceGoal, error) {
	return s.repo.List(ctx, tenantID, cycleID, employeeID, status)
}

// ============================================================================
// OKR Service
// ============================================================================

// OKRService manages company/department/individual OKRs.
type OKRService struct {
	repo      repository.OKRRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewOKRService constructs the service.
// publisher may be nil — the service treats it as a no-op for audit events.
func NewOKRService(repo repository.OKRRepository, log zerolog.Logger) *OKRService {
	return &OKRService{repo: repo, log: log}
}

// WithPublisher wires an audit-log publisher. Returns the receiver to allow
// fluent initialisation in wiring code without breaking existing callers.
func (s *OKRService) WithPublisher(p event.Publisher) *OKRService {
	s.publisher = p
	return s
}

func (s *OKRService) emit(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Error().Err(err).Str("topic", topic).Msg("okr audit publish failed")
	}
}

// OKRRequest is the Create body.
type OKRRequest struct {
	CycleID      uuid.UUID          `json:"cycle_id"`
	OwnerType    string             `json:"owner_type"`
	OwnerID      *uuid.UUID         `json:"owner_id,omitempty"`
	ParentOKRID  *uuid.UUID         `json:"parent_okr_id,omitempty"`
	ObjectiveTR  string             `json:"objective_tr"`
	Description  string             `json:"description,omitempty"`
	QuarterLabel string             `json:"quarter_label,omitempty"`
	KeyResults   []OKRKeyReqItem    `json:"key_results,omitempty"`
}

// OKRKeyReqItem is one key-result entry inside an OKR request.
type OKRKeyReqItem struct {
	TitleTR     string  `json:"title_tr"`
	MetricType  string  `json:"metric_type"`
	StartValue  float64 `json:"start_value,omitempty"`
	TargetValue float64 `json:"target_value"`
	Unit        string  `json:"unit,omitempty"`
}

// OKRProgressRequest is the progress update body.
type OKRProgressRequest struct {
	ObjectiveTR     string `json:"objective_tr,omitempty"`
	Description     string `json:"description,omitempty"`
	Status          string `json:"status,omitempty"`
	ProgressPct     *int   `json:"progress_pct,omitempty"`
	ConfidenceScore *int   `json:"confidence_score,omitempty"`
}

// Create adds a new OKR with its key results.
func (s *OKRService) Create(ctx context.Context, tenantID, actorID uuid.UUID, req OKRRequest) (*domain.OKR, error) {
	o := &domain.OKR{
		TenantID:    tenantID,
		CycleID:     req.CycleID,
		OwnerType:   domain.OKROwnerType(strings.TrimSpace(req.OwnerType)),
		OwnerID:     req.OwnerID,
		ParentOKRID: req.ParentOKRID,
		ObjectiveTR: strings.TrimSpace(req.ObjectiveTR),
	}
	if v := strings.TrimSpace(req.Description); v != "" {
		o.Description = &v
	}
	if v := strings.TrimSpace(req.QuarterLabel); v != "" {
		o.QuarterLabel = &v
	}
	if actorID != uuid.Nil {
		o.CreatedBy = &actorID
	}
	o.ApplyDefaults()
	if err := o.Validate(); err != nil {
		return nil, err
	}
	krs := make([]domain.OKRKeyResult, 0, len(req.KeyResults))
	for i, kr := range req.KeyResults {
		item := domain.OKRKeyResult{
			TitleTR:     strings.TrimSpace(kr.TitleTR),
			MetricType:  domain.MetricType(strings.TrimSpace(kr.MetricType)),
			StartValue:  kr.StartValue,
			TargetValue: kr.TargetValue,
			OrderIndex:  i,
		}
		if v := strings.TrimSpace(kr.Unit); v != "" {
			item.Unit = &v
		}
		item.ApplyDefaults()
		krs = append(krs, item)
	}
	if err := s.repo.Create(ctx, o, krs); err != nil {
		return nil, err
	}
	s.emit(ctx, event.TopicOKRCreated, map[string]any{
		"okr_id":        o.ID,
		"tenant_id":     tenantID,
		"cycle_id":      o.CycleID,
		"owner_type":    o.OwnerType,
		"owner_id":      o.OwnerID,
		"actor_id":      actorID,
		"kr_count":      len(krs),
		"parent_okr_id": o.ParentOKRID,
	})
	return o, nil
}

// Get returns a single OKR with its KRs.
func (s *OKRService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.OKR, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns OKRs for a cycle filtered by owner.
func (s *OKRService) List(ctx context.Context, tenantID, cycleID uuid.UUID, ownerType string, ownerID uuid.UUID) ([]*domain.OKR, error) {
	return s.repo.List(ctx, tenantID, cycleID, ownerType, ownerID)
}

// ListPaged is the keyset-paginated version of List.
func (s *OKRService) ListPaged(ctx context.Context, f repository.OKRListFilter) ([]*domain.OKR, error) {
	return s.repo.ListPaged(ctx, f)
}

// OKRTreeNode is a cascaded OKR with its children and resolved key-results.
type OKRTreeNode struct {
	*domain.OKR
	Children []*OKRTreeNode `json:"children"`
}

// Tree returns the parent→child cascade for a single cycle.
// Key-results are hydrated for every node via bulk load (one query per OKR id is
// acceptable here because cycle scope is small, <200 OKRs in practice).
func (s *OKRService) Tree(ctx context.Context, tenantID, cycleID uuid.UUID) ([]*OKRTreeNode, error) {
	if cycleID == uuid.Nil {
		return nil, domain.NewValidationError(map[string]string{"cycle_id": "required"})
	}
	all, err := s.repo.List(ctx, tenantID, cycleID, "", uuid.Nil)
	if err != nil {
		return nil, err
	}
	// Bulk-hydrate KRs per OKR. Repository currently exposes GetByID for the
	// KR-joined projection; reuse it per id to avoid a new repo method.
	// (Cycle scope is bounded so the fan-out is cheap.)
	byID := make(map[uuid.UUID]*OKRTreeNode, len(all))
	for _, o := range all {
		full, err := s.repo.GetByID(ctx, tenantID, o.ID)
		if err != nil {
			return nil, err
		}
		byID[o.ID] = &OKRTreeNode{OKR: full, Children: []*OKRTreeNode{}}
	}
	roots := make([]*OKRTreeNode, 0)
	for _, node := range byID {
		if node.ParentOKRID == nil {
			roots = append(roots, node)
			continue
		}
		parent, ok := byID[*node.ParentOKRID]
		if !ok {
			// Parent not in same cycle — treat as root so the tree stays complete.
			roots = append(roots, node)
			continue
		}
		parent.Children = append(parent.Children, node)
	}
	// Deterministic order: company > department > team > individual, then created_at.
	orderRank := func(t domain.OKROwnerType) int {
		switch t {
		case domain.OKROwnerType("company"):
			return 0
		case domain.OKROwnerType("department"):
			return 1
		case domain.OKROwnerType("team"):
			return 2
		case domain.OKROwnerType("individual"):
			return 3
		}
		return 4
	}
	var sortNodes func(nodes []*OKRTreeNode)
	sortNodes = func(nodes []*OKRTreeNode) {
		// Insertion sort — n is tiny.
		for i := 1; i < len(nodes); i++ {
			j := i
			for j > 0 {
				a, b := nodes[j-1], nodes[j]
				if orderRank(a.OwnerType) < orderRank(b.OwnerType) {
					break
				}
				if orderRank(a.OwnerType) == orderRank(b.OwnerType) && a.CreatedAt.Before(b.CreatedAt) {
					break
				}
				nodes[j-1], nodes[j] = b, a
				j--
			}
		}
		for _, n := range nodes {
			sortNodes(n.Children)
		}
	}
	sortNodes(roots)
	return roots, nil
}

// UpdateProgress applies progress/status/confidence changes.
func (s *OKRService) UpdateProgress(ctx context.Context, tenantID, id uuid.UUID, req OKRProgressRequest) (*domain.OKR, error) {
	o, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v := strings.TrimSpace(req.ObjectiveTR); v != "" {
		o.ObjectiveTR = v
	}
	if v := strings.TrimSpace(req.Description); v != "" {
		o.Description = &v
	}
	if v := strings.TrimSpace(req.Status); v != "" {
		st := domain.OKRStatus(v)
		if !st.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"status": "invalid"})
		}
		o.Status = st
	}
	if req.ProgressPct != nil {
		o.ProgressPct = *req.ProgressPct
	}
	if req.ConfidenceScore != nil {
		o.ConfidenceScore = req.ConfidenceScore
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateOKR(ctx, o); err != nil {
		return nil, err
	}
	s.emit(ctx, event.TopicOKRUpdated, map[string]any{
		"okr_id":           o.ID,
		"tenant_id":        tenantID,
		"cycle_id":         o.CycleID,
		"status":           o.Status,
		"progress_pct":     o.ProgressPct,
		"confidence_score": o.ConfidenceScore,
	})
	return o, nil
}

// UpdateKR persists a key-result progress update and recomputes the parent progress.
func (s *OKRService) UpdateKR(ctx context.Context, tenantID, okrID uuid.UUID, kr domain.OKRKeyResult) (*domain.OKR, error) {
	parent, err := s.repo.GetByID(ctx, tenantID, okrID)
	if err != nil {
		return nil, err
	}
	kr.OKRID = okrID
	kr.ProgressPct = kr.ComputeProgress()
	kr.ApplyDefaults()
	if err := s.repo.UpsertKR(ctx, tenantID, &kr); err != nil {
		return nil, err
	}
	fresh, err := s.repo.GetByID(ctx, tenantID, okrID)
	if err != nil {
		return nil, err
	}
	fresh.ProgressPct = fresh.ComputeProgressFromKRs()
	_ = parent
	if err := s.repo.UpdateOKR(ctx, fresh); err != nil {
		return nil, err
	}
	s.emit(ctx, event.TopicOKRKRUpdated, map[string]any{
		"okr_id":           okrID,
		"key_result_id":    kr.ID,
		"tenant_id":        tenantID,
		"progress_pct":     kr.ProgressPct,
		"confidence_score": kr.ConfidenceScore,
		"status":           kr.Status,
	})
	return fresh, nil
}

// ============================================================================
// Review Service
// ============================================================================

// ReviewService manages performance reviews + 360° feedback.
type ReviewService struct {
	repo repository.ReviewRepository
	log  zerolog.Logger
}

// NewReviewService constructs the service.
func NewReviewService(repo repository.ReviewRepository, log zerolog.Logger) *ReviewService {
	return &ReviewService{repo: repo, log: log}
}

// ReviewRequest is the Create body.
type ReviewRequest struct {
	CycleID          uuid.UUID `json:"cycle_id"`
	EmployeeID       uuid.UUID `json:"employee_id"`
	ReviewerID       uuid.UUID `json:"reviewer_id"`
	ReviewType       string    `json:"review_type"`
	PerformanceRating *float64 `json:"performance_rating,omitempty"`
	PotentialRating   *float64 `json:"potential_rating,omitempty"`
	OverallComment    string   `json:"overall_comment,omitempty"`
	Strengths         string   `json:"strengths,omitempty"`
	GrowthAreas       string   `json:"growth_areas,omitempty"`
	GoalsAchievedPct  *int     `json:"goals_achieved_pct,omitempty"`
}

// ReviewContentRequest is the PATCH body used before submission.
type ReviewContentRequest struct {
	PerformanceRating *float64 `json:"performance_rating,omitempty"`
	PotentialRating   *float64 `json:"potential_rating,omitempty"`
	OverallComment    string   `json:"overall_comment,omitempty"`
	Strengths         string   `json:"strengths,omitempty"`
	GrowthAreas       string   `json:"growth_areas,omitempty"`
	GoalsAchievedPct  *int     `json:"goals_achieved_pct,omitempty"`
}

// FeedbackRequest adds a competency-level 360 rating.
type FeedbackRequest struct {
	CompetencyCode   string  `json:"competency_code"`
	CompetencyNameTR string  `json:"competency_name_tr"`
	Rating           float64 `json:"rating"`
	Comment          string  `json:"comment,omitempty"`
	Evidence         string  `json:"evidence,omitempty"`
}

// Create adds a new review (status=draft).
func (s *ReviewService) Create(ctx context.Context, tenantID uuid.UUID, req ReviewRequest) (*domain.PerformanceReview, error) {
	rv := &domain.PerformanceReview{
		TenantID:          tenantID,
		CycleID:           req.CycleID,
		EmployeeID:        req.EmployeeID,
		ReviewerID:        req.ReviewerID,
		ReviewType:        domain.ReviewType(strings.TrimSpace(req.ReviewType)),
		PerformanceRating: req.PerformanceRating,
		PotentialRating:   req.PotentialRating,
		GoalsAchievedPct:  req.GoalsAchievedPct,
	}
	if v := strings.TrimSpace(req.OverallComment); v != "" {
		rv.OverallComment = &v
	}
	if v := strings.TrimSpace(req.Strengths); v != "" {
		rv.Strengths = &v
	}
	if v := strings.TrimSpace(req.GrowthAreas); v != "" {
		rv.GrowthAreas = &v
	}
	rv.ApplyDefaults()
	if err := rv.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, rv); err != nil {
		return nil, err
	}
	return rv, nil
}

// UpdateContent applies ratings + text while still in draft.
func (s *ReviewService) UpdateContent(ctx context.Context, tenantID, id uuid.UUID, req ReviewContentRequest) (*domain.PerformanceReview, error) {
	rv, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if rv.Status != domain.ReviewDraft && rv.Status != domain.ReviewDisputed {
		return nil, domain.ErrInvalidStatus
	}
	if req.PerformanceRating != nil {
		rv.PerformanceRating = req.PerformanceRating
	}
	if req.PotentialRating != nil {
		rv.PotentialRating = req.PotentialRating
	}
	if req.GoalsAchievedPct != nil {
		rv.GoalsAchievedPct = req.GoalsAchievedPct
	}
	if v := strings.TrimSpace(req.OverallComment); v != "" {
		rv.OverallComment = &v
	}
	if v := strings.TrimSpace(req.Strengths); v != "" {
		rv.Strengths = &v
	}
	if v := strings.TrimSpace(req.GrowthAreas); v != "" {
		rv.GrowthAreas = &v
	}
	if err := rv.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateContent(ctx, rv); err != nil {
		return nil, err
	}
	return rv, nil
}

// Transition applies a status change using the CanTransitionTo rules.
func (s *ReviewService) Transition(ctx context.Context, tenantID, id uuid.UUID, next domain.ReviewStatus) (*domain.PerformanceReview, error) {
	rv, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !rv.CanTransitionTo(next) {
		return nil, domain.ErrInvalidStatus
	}
	if err := s.repo.UpdateStatus(ctx, tenantID, id, next); err != nil {
		return nil, err
	}
	rv.Status = next
	return rv, nil
}

// Get returns a review with its feedback.
func (s *ReviewService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceReview, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns reviews for a cycle/employee.
func (s *ReviewService) List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, reviewType string) ([]*domain.PerformanceReview, error) {
	return s.repo.List(ctx, tenantID, cycleID, employeeID, reviewType)
}

// AddFeedback appends a competency rating.
func (s *ReviewService) AddFeedback(ctx context.Context, tenantID, reviewID uuid.UUID, req FeedbackRequest) (*domain.ReviewFeedback, error) {
	f := &domain.ReviewFeedback{
		TenantID:         tenantID,
		ReviewID:         reviewID,
		CompetencyCode:   strings.TrimSpace(req.CompetencyCode),
		CompetencyNameTR: strings.TrimSpace(req.CompetencyNameTR),
		Rating:           req.Rating,
	}
	if v := strings.TrimSpace(req.Comment); v != "" {
		f.Comment = &v
	}
	if v := strings.TrimSpace(req.Evidence); v != "" {
		f.Evidence = &v
	}
	f.ApplyDefaults()
	if err := f.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.AddFeedback(ctx, f); err != nil {
		return nil, err
	}
	return f, nil
}

// ============================================================================
// Nine-Box Service
// ============================================================================

// ============================================================================
// Competency Service
// ============================================================================

// CompetencyService serves the competency catalog (global + tenant overrides).
type CompetencyService struct {
	repo repository.CompetencyRepository
}

// NewCompetencyService constructs the service.
func NewCompetencyService(repo repository.CompetencyRepository) *CompetencyService {
	return &CompetencyService{repo: repo}
}

// CompetencyRequest is the tenant override body.
type CompetencyRequest struct {
	Code          string                    `json:"code"`
	NameTR        string                    `json:"name_tr"`
	NameEN        string                    `json:"name_en,omitempty"`
	DescriptionTR string                    `json:"description_tr,omitempty"`
	Category      domain.CompetencyCategory `json:"category"`
	AppliesTo     []string                  `json:"applies_to,omitempty"`
	Anchors       map[string]any            `json:"anchors,omitempty"`
	IsActive      *bool                     `json:"is_active,omitempty"`
}

// List returns the effective catalog for the tenant.
func (s *CompetencyService) List(ctx context.Context, tenantID uuid.UUID, category string, activeOnly bool) ([]*domain.Competency, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrForbidden
	}
	return s.repo.List(ctx, tenantID, category, activeOnly)
}

// Upsert creates or updates a tenant-level override.
func (s *CompetencyService) Upsert(ctx context.Context, tenantID uuid.UUID, req CompetencyRequest) (*domain.Competency, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrForbidden
	}
	c := &domain.Competency{
		TenantID: &tenantID,
		Code:     strings.TrimSpace(req.Code),
		NameTR:   strings.TrimSpace(req.NameTR),
		Category: req.Category,
		IsActive: true,
	}
	if v := strings.TrimSpace(req.NameEN); v != "" {
		c.NameEN = &v
	}
	if v := strings.TrimSpace(req.DescriptionTR); v != "" {
		c.DescriptionTR = &v
	}
	if len(req.AppliesTo) > 0 {
		c.AppliesTo = req.AppliesTo
	}
	if req.Anchors != nil {
		c.Anchors = marshalJSON(req.Anchors)
	}
	if req.IsActive != nil {
		c.IsActive = *req.IsActive
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Upsert(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func marshalJSON(v map[string]any) domain.JSONB {
	if v == nil {
		return domain.JSONB("{}")
	}
	raw, err := jsonMarshal(v)
	if err != nil {
		return domain.JSONB("{}")
	}
	return domain.JSONB(raw)
}

// NineBoxService orchestrates 9-box grid assignments.
type NineBoxService struct {
	repo repository.NineBoxRepository
	log  zerolog.Logger
}

// NewNineBoxService constructs the service.
func NewNineBoxService(repo repository.NineBoxRepository, log zerolog.Logger) *NineBoxService {
	return &NineBoxService{repo: repo, log: log}
}

// NineBoxRequest is the Upsert body.
type NineBoxRequest struct {
	CycleID           uuid.UUID `json:"cycle_id"`
	EmployeeID        uuid.UUID `json:"employee_id"`
	PerformanceBand   string    `json:"performance_band"`
	PotentialBand     string    `json:"potential_band"`
	CalibrationNotes  string    `json:"calibration_notes,omitempty"`
	RecommendedAction string    `json:"recommended_action,omitempty"`
}

// Upsert stores or updates an assignment; calibrated_at is stamped when setBy is supplied.
func (s *NineBoxService) Upsert(ctx context.Context, tenantID, setBy uuid.UUID, req NineBoxRequest) (*domain.NineBoxAssignment, error) {
	a := &domain.NineBoxAssignment{
		TenantID:        tenantID,
		CycleID:         req.CycleID,
		EmployeeID:      req.EmployeeID,
		PerformanceBand: domain.Band(strings.TrimSpace(req.PerformanceBand)),
		PotentialBand:   domain.Band(strings.TrimSpace(req.PotentialBand)),
	}
	if v := strings.TrimSpace(req.CalibrationNotes); v != "" {
		a.CalibrationNotes = &v
	}
	if v := strings.TrimSpace(req.RecommendedAction); v != "" {
		a.RecommendedAction = &v
	}
	if setBy != uuid.Nil {
		a.SetBy = &setBy
		now := time.Now().UTC()
		a.CalibratedAt = &now
	}
	a.ApplyDefaults()
	if err := a.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Upsert(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

// UpsertFromRatings derives bands from rating values then upserts.
func (s *NineBoxService) UpsertFromRatings(ctx context.Context, tenantID, setBy uuid.UUID, cycleID, employeeID uuid.UUID, perfRating, potRating float64, notes string) (*domain.NineBoxAssignment, error) {
	req := NineBoxRequest{
		CycleID:          cycleID,
		EmployeeID:       employeeID,
		PerformanceBand:  string(domain.BandFromRating(perfRating)),
		PotentialBand:    string(domain.BandFromRating(potRating)),
		CalibrationNotes: notes,
	}
	return s.Upsert(ctx, tenantID, setBy, req)
}

// Grid returns the full heatmap for a cycle.
func (s *NineBoxService) Grid(ctx context.Context, tenantID, cycleID uuid.UUID, segment string) ([]*domain.NineBoxAssignment, error) {
	return s.repo.List(ctx, tenantID, cycleID, segment)
}

// Get returns one assignment.
func (s *NineBoxService) Get(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID) (*domain.NineBoxAssignment, error) {
	return s.repo.GetByCycleEmployee(ctx, tenantID, cycleID, employeeID)
}
