package service_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/repository"
	"github.com/upcore/audit/internal/service"
)

// --- fakeMLObjectionRepo ---------------------------------------------------

type fakeMLObjectionRepo struct {
	byID map[uuid.UUID]*domain.MLObjection
	// UpholdAndRetract / DismissWithDPO call recording.
	upholdCalls  []repository.UpholdInput
	dismissCalls []repository.DismissInput
	// Simulate a missing prediction for UpholdAndRetract.
	retractErr error
}

func newFakeMLObjectionRepo() *fakeMLObjectionRepo {
	return &fakeMLObjectionRepo{byID: map[uuid.UUID]*domain.MLObjection{}}
}

func (f *fakeMLObjectionRepo) Create(_ context.Context, o *domain.MLObjection) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	if o.ObjectedAt.IsZero() {
		o.ObjectedAt = time.Now().UTC()
	}
	if o.Status == "" {
		o.Status = domain.MLObjectionStatusReceived
	}
	f.byID[o.ID] = o
	return nil
}

func (f *fakeMLObjectionRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.MLObjection, error) {
	o, ok := f.byID[id]
	if !ok || o.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	// Return a copy to mimic DB semantics.
	copy := *o
	return &copy, nil
}

func (f *fakeMLObjectionRepo) Update(_ context.Context, o *domain.MLObjection) error {
	existing, ok := f.byID[o.ID]
	if !ok {
		return domain.ErrNotFound
	}
	existing.Status = o.Status
	existing.RejectionReason = o.RejectionReason
	existing.ResolutionNote = o.ResolutionNote
	existing.ReviewerUserID = o.ReviewerUserID
	existing.ReviewedAt = o.ReviewedAt
	existing.CompletedAt = o.CompletedAt
	return nil
}

func (f *fakeMLObjectionRepo) List(_ context.Context, _ domain.MLObjectionFilter) ([]*domain.MLObjection, int, error) {
	out := make([]*domain.MLObjection, 0, len(f.byID))
	for _, o := range f.byID {
		out = append(out, o)
	}
	return out, len(out), nil
}

func (f *fakeMLObjectionRepo) ListOverdue(_ context.Context, _ uuid.UUID) ([]*domain.MLObjection, error) {
	return nil, nil
}

func (f *fakeMLObjectionRepo) UpholdAndRetract(_ context.Context, in repository.UpholdInput) (*domain.MLObjection, error) {
	f.upholdCalls = append(f.upholdCalls, in)
	if f.retractErr != nil {
		return nil, f.retractErr
	}
	o, ok := f.byID[in.ObjectionID]
	if !ok || o.TenantID != in.TenantID {
		return nil, domain.ErrNotFound
	}
	if o.Status == domain.MLObjectionStatusCompleted || o.Status == domain.MLObjectionStatusRejected {
		return nil, domain.ErrInvalidTransition
	}
	now := time.Now().UTC()
	outcome := domain.MLObjectionOutcomeUpheld
	o.Status = domain.MLObjectionStatusCompleted
	o.ResolutionNote = in.ResolutionNote
	o.ReviewerUserID = &in.ReviewerUserID
	o.ReviewedAt = &now
	o.CompletedAt = &now
	o.ResolutionOutcome = &outcome
	o.PredictionRetractedAt = &now
	if in.ReviewerIP != "" {
		ip := in.ReviewerIP
		o.ReviewerIP = &ip
	}
	if in.ReviewerUserAgent != "" {
		ua := in.ReviewerUserAgent
		o.ReviewerUA = &ua
	}
	copy := *o
	return &copy, nil
}

func (f *fakeMLObjectionRepo) DismissWithDPO(_ context.Context, in repository.DismissInput) (*domain.MLObjection, error) {
	f.dismissCalls = append(f.dismissCalls, in)
	o, ok := f.byID[in.ObjectionID]
	if !ok || o.TenantID != in.TenantID {
		return nil, domain.ErrNotFound
	}
	if o.Status == domain.MLObjectionStatusCompleted || o.Status == domain.MLObjectionStatusRejected {
		return nil, domain.ErrInvalidTransition
	}
	now := time.Now().UTC()
	outcome := domain.MLObjectionOutcomeDismissed
	dpoID := in.DPOUserID
	o.Status = domain.MLObjectionStatusRejected
	o.RejectionReason = in.RejectionReason
	o.ReviewerUserID = &in.ReviewerUserID
	o.DPOUserID = &dpoID
	o.DPOSignedAt = &now
	o.ReviewedAt = &now
	o.CompletedAt = &now
	o.ResolutionOutcome = &outcome
	copy := *o
	return &copy, nil
}

// --- Helpers ---------------------------------------------------------------

func newObjectionFixture(t *testing.T, repo *fakeMLObjectionRepo) *domain.MLObjection {
	t.Helper()
	o := &domain.MLObjection{
		TenantID:     uuid.New(),
		UserID:       uuid.New(),
		PredictionID: uuid.New(),
		Reason:       "Modelin verileri eksik; tahmine itiraz ediyorum.",
		Status:       domain.MLObjectionStatusReceived,
		ObjectedAt:   time.Now().UTC(),
	}
	require.NoError(t, repo.Create(context.Background(), o))
	return o
}

// --- Tests -----------------------------------------------------------------

func TestUphold_PublishesRetractedEvent(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewMLObjectionService(repo, pub, zerolog.Nop())

	o := newObjectionFixture(t, repo)

	updated, err := svc.Uphold(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: uuid.New(),
		IP:             "10.0.0.1",
		UserAgent:      "Mozilla/5.0",
	}, "Veriler eksik, itiraz haklı bulundu.")
	require.NoError(t, err)
	require.NotNil(t, updated)

	assert.Equal(t, domain.MLObjectionStatusCompleted, updated.Status)
	require.NotNil(t, updated.ResolutionOutcome)
	assert.Equal(t, domain.MLObjectionOutcomeUpheld, *updated.ResolutionOutcome)
	assert.NotNil(t, updated.PredictionRetractedAt)

	// Two events: ml_objection.resolved + ml.prediction.retracted.
	assert.Equal(t, 1, pub.Count(event.TopicMLObjectionResolved))
	assert.Equal(t, 1, pub.Count(event.TopicMLPredictionRetracted))

	// Verify retracted payload references the prediction.
	retractedCount := 0
	for _, e := range pub.Snapshot() {
		if e.EventType == event.TopicMLPredictionRetracted {
			retractedCount++
			payload := string(e.Payload)
			assert.Contains(t, payload, updated.PredictionID.String())
			assert.Contains(t, payload, "KVKK m.22")
		}
	}
	assert.Equal(t, 1, retractedCount)

	// Repository recorded IP + UA for audit trail.
	require.Len(t, repo.upholdCalls, 1)
	assert.Equal(t, "10.0.0.1", repo.upholdCalls[0].ReviewerIP)
	assert.Equal(t, "Mozilla/5.0", repo.upholdCalls[0].ReviewerUserAgent)
}

func TestUphold_RejectsShortNote(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	svc := service.NewMLObjectionService(repo, event.NewInMemoryPublisher(), zerolog.Nop())
	o := newObjectionFixture(t, repo)

	_, err := svc.Uphold(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: uuid.New(),
	}, "ok") // <5 chars
	require.Error(t, err)
	require.True(t, strings.Contains(err.Error(), "resolution_note"))
}

func TestUphold_RejectsAlreadyFinalised(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	svc := service.NewMLObjectionService(repo, event.NewInMemoryPublisher(), zerolog.Nop())
	o := newObjectionFixture(t, repo)
	// Move directly to completed to simulate a prior resolve.
	stored := repo.byID[o.ID]
	stored.Status = domain.MLObjectionStatusCompleted

	_, err := svc.Uphold(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: uuid.New(),
	}, "Bir gerekçe yazıldı.")
	require.Error(t, err)
}

func TestDismiss_RequiresDPORole(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewMLObjectionService(repo, pub, zerolog.Nop())
	o := newObjectionFixture(t, repo)

	// Reviewer without DPO role and no explicit DPO user must fail.
	_, err := svc.Dismiss(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: uuid.New(),
		Roles:          []string{"hr_admin"},
	}, "Veriler doğrulandı, itiraz reddedildi.")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "forbidden")
	assert.Empty(t, repo.dismissCalls, "dismiss must not hit repo without DPO")
}

func TestDismiss_HappyPath_WithDPORole(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewMLObjectionService(repo, pub, zerolog.Nop())
	o := newObjectionFixture(t, repo)

	dpo := uuid.New()
	_, err := svc.Dismiss(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: dpo,
		Roles:          []string{"DPO"},
		IP:             "10.0.0.2",
		UserAgent:      "ua",
	}, "Veriler doğrulandı, itiraz reddedildi.")
	require.NoError(t, err)

	assert.Equal(t, 1, pub.Count(event.TopicMLObjectionResolved))
	assert.Equal(t, 0, pub.Count(event.TopicMLPredictionRetracted),
		"dismiss must NOT emit ml.prediction.retracted")
	require.Len(t, repo.dismissCalls, 1)
	assert.Equal(t, dpo, repo.dismissCalls[0].DPOUserID)
}

func TestDismiss_HappyPath_WithExplicitDPOUser(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewMLObjectionService(repo, pub, zerolog.Nop())
	o := newObjectionFixture(t, repo)

	reviewer := uuid.New()
	dpo := uuid.New()
	// Reviewer is NOT a DPO but passes a separate DPO user id.
	_, err := svc.Dismiss(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: reviewer,
		DPOUserID:      dpo,
		Roles:          []string{"hr_admin"},
	}, "Veriler doğrulandı, itiraz reddedildi.")
	require.NoError(t, err)
	require.Len(t, repo.dismissCalls, 1)
	assert.Equal(t, dpo, repo.dismissCalls[0].DPOUserID)
}

func TestDismiss_RejectsShortReason(t *testing.T) {
	repo := newFakeMLObjectionRepo()
	svc := service.NewMLObjectionService(repo, event.NewInMemoryPublisher(), zerolog.Nop())
	o := newObjectionFixture(t, repo)

	_, err := svc.Dismiss(context.Background(), o.TenantID, o.ID, service.ReviewerContext{
		ReviewerUserID: uuid.New(),
		Roles:          []string{"dpo"},
	}, "çok kısa")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "rejection_reason")
}
