package repository

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/performance/internal/domain"
)

// InMemoryPipRepository is an in-memory implementation of PipRepository used
// for handler + service state-machine tests. It is safe for concurrent use by
// multiple goroutines but is NOT suitable for production.
type InMemoryPipRepository struct {
	mu       sync.Mutex
	Cases    map[uuid.UUID]*domain.PipCase
	Goals    map[uuid.UUID][]domain.PipGoal // case_id → goals
	Checkins map[uuid.UUID][]domain.PipCheckin
	Outcome  map[uuid.UUID]*domain.PipOutcome
}

// NewInMemoryPipRepository constructs an empty fake.
func NewInMemoryPipRepository() *InMemoryPipRepository {
	return &InMemoryPipRepository{
		Cases:    map[uuid.UUID]*domain.PipCase{},
		Goals:    map[uuid.UUID][]domain.PipGoal{},
		Checkins: map[uuid.UUID][]domain.PipCheckin{},
		Outcome:  map[uuid.UUID]*domain.PipOutcome{},
	}
}

// Compile-time guard: we implement PipRepository.
var _ PipRepository = (*InMemoryPipRepository)(nil)

// CreateCaseWithGoals stores a case + bundled goals atomically (in-memory).
func (r *InMemoryPipRepository) CreateCaseWithGoals(_ context.Context, c *domain.PipCase, goals []*domain.PipGoal) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c.ApplyDefaults()
	if _, exists := r.Cases[c.ID]; exists {
		return domain.ErrConflict
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	c.UpdatedAt = c.CreatedAt
	cpy := *c
	r.Cases[c.ID] = &cpy
	for _, g := range goals {
		g.ApplyDefaults()
		if g.CreatedAt.IsZero() {
			g.CreatedAt = time.Now().UTC()
		}
		r.Goals[c.ID] = append(r.Goals[c.ID], *g)
	}
	return nil
}

// UpdateCaseStatus mutates case status + optional flags.
func (r *InMemoryPipRepository) UpdateCaseStatus(
	_ context.Context,
	tenantID, caseID uuid.UUID,
	legalReviewerID *uuid.UUID, legalReviewed *bool,
	legalFileURL *string, outcomeReason *string,
	nextStatus domain.PipStatus,
) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return domain.ErrNotFound
	}
	c.Status = nextStatus
	c.UpdatedAt = time.Now().UTC()
	if legalReviewerID != nil {
		v := *legalReviewerID
		c.LegalReviewerID = &v
	}
	if legalReviewed != nil {
		c.LegalReviewed = *legalReviewed
	}
	if legalFileURL != nil {
		v := *legalFileURL
		c.LegalFileURL = &v
	}
	if outcomeReason != nil {
		v := *outcomeReason
		c.OutcomeReason = &v
	}
	return nil
}

// SetHRReviewer stores the HR reviewer on a case.
func (r *InMemoryPipRepository) SetHRReviewer(_ context.Context, tenantID, caseID, hrReviewerID uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return domain.ErrNotFound
	}
	v := hrReviewerID
	c.HRReviewerID = &v
	c.UpdatedAt = time.Now().UTC()
	return nil
}

// SetDurationDays updates duration_days on a case.
func (r *InMemoryPipRepository) SetDurationDays(_ context.Context, tenantID, caseID uuid.UUID, durationDays int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return domain.ErrNotFound
	}
	c.DurationDays = durationDays
	c.UpdatedAt = time.Now().UTC()
	return nil
}

// GetCase returns the case by (tenant, id).
func (r *InMemoryPipRepository) GetCase(_ context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	cpy := *c
	return &cpy, nil
}

// GetCaseWithRelations returns the case hydrated with goals/checkins/outcome.
func (r *InMemoryPipRepository) GetCaseWithRelations(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	c, err := r.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	c.Goals = r.snapshotGoals(caseID)
	c.Checkins = r.snapshotCheckins(caseID)
	c.Outcome = r.snapshotOutcome(caseID)
	return c, nil
}

func (r *InMemoryPipRepository) snapshotGoals(caseID uuid.UUID) []domain.PipGoal {
	r.mu.Lock()
	defer r.mu.Unlock()
	src := r.Goals[caseID]
	out := make([]domain.PipGoal, len(src))
	copy(out, src)
	return out
}

func (r *InMemoryPipRepository) snapshotCheckins(caseID uuid.UUID) []domain.PipCheckin {
	r.mu.Lock()
	defer r.mu.Unlock()
	src := r.Checkins[caseID]
	out := make([]domain.PipCheckin, len(src))
	copy(out, src)
	sort.Slice(out, func(i, j int) bool { return out[i].WeekNumber < out[j].WeekNumber })
	return out
}

func (r *InMemoryPipRepository) snapshotOutcome(caseID uuid.UUID) *domain.PipOutcome {
	r.mu.Lock()
	defer r.mu.Unlock()
	o, ok := r.Outcome[caseID]
	if !ok {
		return nil
	}
	cpy := *o
	return &cpy
}

// ListCases returns filtered cases.
func (r *InMemoryPipRepository) ListCases(_ context.Context, tenantID uuid.UUID, filter PipListFilter, limit, offset int) ([]*domain.PipCase, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []*domain.PipCase{}
	for _, c := range r.Cases {
		if c.TenantID != tenantID {
			continue
		}
		if filter.EmployeeID != uuid.Nil && c.EmployeeID != filter.EmployeeID {
			continue
		}
		if filter.ManagerID != uuid.Nil && c.InitiatedBy != filter.ManagerID {
			continue
		}
		if filter.Status != "" && string(c.Status) != filter.Status {
			continue
		}
		if filter.Reason != "" && string(c.ReasonCategory) != filter.Reason {
			continue
		}
		if !filter.IncludeClosed && filter.Status == "" && c.Status.IsClosed() {
			continue
		}
		cpy := *c
		out = append(out, &cpy)
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].StartDate.Equal(out[j].StartDate) {
			return out[i].StartDate.After(out[j].StartDate)
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	total := len(out)
	if offset >= len(out) {
		return []*domain.PipCase{}, total, nil
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], total, nil
}

// AddGoal appends a goal to a case.
func (r *InMemoryPipRepository) AddGoal(_ context.Context, g *domain.PipGoal) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[g.CaseID]
	if !ok || c.TenantID != g.TenantID {
		return domain.ErrNotFound
	}
	g.ApplyDefaults()
	if g.CreatedAt.IsZero() {
		g.CreatedAt = time.Now().UTC()
	}
	r.Goals[g.CaseID] = append(r.Goals[g.CaseID], *g)
	return nil
}

// ListGoals returns goals for a case.
func (r *InMemoryPipRepository) ListGoals(_ context.Context, tenantID, caseID uuid.UUID) ([]domain.PipGoal, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	src := r.Goals[caseID]
	out := make([]domain.PipGoal, len(src))
	copy(out, src)
	return out, nil
}

// AddCheckin inserts a new check-in; duplicate week returns conflict.
func (r *InMemoryPipRepository) AddCheckin(_ context.Context, k *domain.PipCheckin) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[k.CaseID]
	if !ok || c.TenantID != k.TenantID {
		return domain.ErrNotFound
	}
	for _, existing := range r.Checkins[k.CaseID] {
		if existing.WeekNumber == k.WeekNumber {
			return domain.ErrConflict
		}
	}
	k.ApplyDefaults()
	if k.CreatedAt.IsZero() {
		k.CreatedAt = time.Now().UTC()
	}
	r.Checkins[k.CaseID] = append(r.Checkins[k.CaseID], *k)
	return nil
}

// AcknowledgeCheckin records the employee acknowledgement.
func (r *InMemoryPipRepository) AcknowledgeCheckin(_ context.Context, tenantID, checkinID uuid.UUID, ack *domain.PipCheckin) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for caseID, list := range r.Checkins {
		for i := range list {
			if list[i].ID == checkinID {
				if list[i].TenantID != tenantID {
					return domain.ErrNotFound
				}
				if list[i].AcknowledgedByEmployee != nil {
					return domain.ErrConflict
				}
				list[i].AcknowledgedByEmployee = ack.AcknowledgedByEmployee
				list[i].AcknowledgeIP = ack.AcknowledgeIP
				list[i].AcknowledgeUserAgent = ack.AcknowledgeUserAgent
				if ack.EmployeeNotes != nil {
					list[i].EmployeeNotes = ack.EmployeeNotes
				}
				r.Checkins[caseID] = list
				return nil
			}
		}
	}
	return domain.ErrNotFound
}

// ListCheckins returns checkins for a case.
func (r *InMemoryPipRepository) ListCheckins(_ context.Context, tenantID, caseID uuid.UUID) ([]domain.PipCheckin, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	src := r.Checkins[caseID]
	out := make([]domain.PipCheckin, len(src))
	copy(out, src)
	sort.Slice(out, func(i, j int) bool { return out[i].WeekNumber < out[j].WeekNumber })
	return out, nil
}

// CloseCase closes the case atomically.
func (r *InMemoryPipRepository) CloseCase(
	_ context.Context,
	tenantID, caseID uuid.UUID,
	legalFileURL *string, outcomeReason string,
	nextStatus domain.PipStatus,
	outcome *domain.PipOutcome,
) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return domain.ErrNotFound
	}
	c.Status = nextStatus
	c.UpdatedAt = time.Now().UTC()
	if legalFileURL != nil {
		v := *legalFileURL
		c.LegalFileURL = &v
	}
	c.OutcomeReason = &outcomeReason
	outcome.ApplyDefaults()
	if outcome.CreatedAt.IsZero() {
		outcome.CreatedAt = time.Now().UTC()
	}
	cpy := *outcome
	r.Outcome[caseID] = &cpy
	return nil
}

// GetOutcome returns the outcome (1:1 with case).
func (r *InMemoryPipRepository) GetOutcome(_ context.Context, tenantID, caseID uuid.UUID) (*domain.PipOutcome, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.Cases[caseID]
	if !ok || c.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	o, ok := r.Outcome[caseID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cpy := *o
	return &cpy, nil
}

// RetentionCandidates returns closed cases older than the given threshold.
func (r *InMemoryPipRepository) RetentionCandidates(_ context.Context, olderThan time.Time) ([]uuid.UUID, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []uuid.UUID
	for _, c := range r.Cases {
		if c.Status.IsClosed() && c.UpdatedAt.Before(olderThan) {
			out = append(out, c.ID)
		}
	}
	return out, nil
}
