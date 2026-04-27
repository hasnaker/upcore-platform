package testsupport

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/repository"
)

// FakeOnboardingDraftRepo is an in-memory OnboardingDraftRepository used in tests.
type FakeOnboardingDraftRepo struct {
	mu     sync.Mutex
	byID   map[uuid.UUID]*domain.OnboardingDraft
	byUser map[string]uuid.UUID
}

// NewFakeOnboardingDraftRepo creates an empty fake draft repo.
func NewFakeOnboardingDraftRepo() *FakeOnboardingDraftRepo {
	return &FakeOnboardingDraftRepo{
		byID:   map[uuid.UUID]*domain.OnboardingDraft{},
		byUser: map[string]uuid.UUID{},
	}
}

// Upsert inserts or updates a draft.
func (f *FakeOnboardingDraftRepo) Upsert(_ context.Context, _ repository.Querier, d *domain.OnboardingDraft) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	now := time.Now().UTC()
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
		d.CreatedAt = now
	}
	d.UpdatedAt = now
	if d.Status == "" {
		d.Status = domain.OnboardingStatusInProgress
	}
	if d.CurrentStep == 0 {
		d.CurrentStep = 1
	}
	cp := *d
	f.byID[d.ID] = &cp
	if d.Status == domain.OnboardingStatusInProgress {
		f.byUser[d.ClerkUserID] = d.ID
	}
	return nil
}

// GetByID fetches a draft by id.
func (f *FakeOnboardingDraftRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.OnboardingDraft, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.byID[id]
	if !ok {
		return nil, domain.ErrOnboardingDraftNotFound
	}
	cp := *d
	return &cp, nil
}

// GetInProgressByUser returns the active draft for a user.
func (f *FakeOnboardingDraftRepo) GetInProgressByUser(_ context.Context, clerkUserID string) (*domain.OnboardingDraft, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id, ok := f.byUser[clerkUserID]
	if !ok {
		return nil, domain.ErrOnboardingDraftNotFound
	}
	d, ok := f.byID[id]
	if !ok || d.Status != domain.OnboardingStatusInProgress {
		return nil, domain.ErrOnboardingDraftNotFound
	}
	cp := *d
	return &cp, nil
}

// MarkCommitted flips the status.
func (f *FakeOnboardingDraftRepo) MarkCommitted(_ context.Context, _ repository.Querier, id, tenantID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.byID[id]
	if !ok {
		return domain.ErrOnboardingDraftNotFound
	}
	if d.Status != domain.OnboardingStatusInProgress {
		return domain.ErrOnboardingAlreadyCommit
	}
	d.Status = domain.OnboardingStatusCommitted
	tid := tenantID
	d.CommittedTenantID = &tid
	delete(f.byUser, d.ClerkUserID)
	return nil
}

// MarkAbandoned marks the draft abandoned.
func (f *FakeOnboardingDraftRepo) MarkAbandoned(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.byID[id]
	if !ok {
		return domain.ErrOnboardingDraftNotFound
	}
	if d.Status != domain.OnboardingStatusInProgress {
		return domain.ErrOnboardingDraftNotFound
	}
	d.Status = domain.OnboardingStatusAbandoned
	delete(f.byUser, d.ClerkUserID)
	return nil
}

// ListForFunnel returns a simple aggregate.
func (f *FakeOnboardingDraftRepo) ListForFunnel(_ context.Context, from, to time.Time) (repository.FunnelAggregate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	agg := repository.FunnelAggregate{PerStep: map[int]repository.FunnelStepCount{}}
	for _, d := range f.byID {
		if d.CreatedAt.Before(from) || !d.CreatedAt.Before(to) {
			continue
		}
		agg.Total++
		switch d.Status {
		case domain.OnboardingStatusCommitted:
			agg.Committed++
		case domain.OnboardingStatusAbandoned:
			agg.Abandoned++
		case domain.OnboardingStatusInProgress:
			agg.InProgress++
		}
		fs := agg.PerStep[d.CurrentStep]
		fs.Reached++
		if d.Status == domain.OnboardingStatusCommitted {
			fs.Completed++
		}
		agg.PerStep[d.CurrentStep] = fs
	}
	return agg, nil
}
