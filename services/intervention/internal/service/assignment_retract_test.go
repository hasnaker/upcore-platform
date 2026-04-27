package service_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/service"
)

// --- Fakes -----------------------------------------------------------------

// fakeAssignmentRepo implements repository.AssignmentRepository. Only the
// methods used by RetractFromPrediction are exercised; the rest return
// domain.ErrNotFound / zero values.
type fakeAssignmentRepo struct {
	mu      sync.Mutex
	byID    map[uuid.UUID]*domain.Assignment
	bySrc   map[uuid.UUID][]uuid.UUID // source_prediction_id -> assignment ids
	cancels []cancelCall
}

type cancelCall struct {
	TenantID uuid.UUID
	ID       uuid.UUID
	Reason   string
}

func newFakeAssignmentRepo() *fakeAssignmentRepo {
	return &fakeAssignmentRepo{
		byID:  map[uuid.UUID]*domain.Assignment{},
		bySrc: map[uuid.UUID][]uuid.UUID{},
	}
}

func (f *fakeAssignmentRepo) Create(_ context.Context, a *domain.Assignment) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	f.byID[a.ID] = a
	return nil
}
func (f *fakeAssignmentRepo) GetByID(_ context.Context, _, id uuid.UUID) (*domain.Assignment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return nil, domain.ErrAssignmentNotFound
	}
	copy := *a
	return &copy, nil
}
func (f *fakeAssignmentRepo) Update(_ context.Context, a *domain.Assignment) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[a.ID]; !ok {
		return domain.ErrAssignmentNotFound
	}
	f.byID[a.ID] = a
	return nil
}
func (f *fakeAssignmentRepo) ListByEmployee(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (f *fakeAssignmentRepo) ListByIntervention(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (f *fakeAssignmentRepo) ListByStatus(_ context.Context, _ uuid.UUID, _ domain.AssignmentStatus, _, _ int) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (f *fakeAssignmentRepo) List(_ context.Context, _ domain.AssignmentFilter) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (f *fakeAssignmentRepo) ListPendingConsent(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (f *fakeAssignmentRepo) BulkCreate(_ context.Context, _ []*domain.Assignment) (int, error) {
	return 0, nil
}
func (f *fakeAssignmentRepo) Cancel(_ context.Context, tenantID, id uuid.UUID, reason string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return domain.ErrAssignmentNotFound
	}
	if domain.IsTerminalStatus(a.Status) {
		return domain.ErrAssignmentNotFound
	}
	a.Status = domain.AssignmentStatusCancelled
	now := time.Now().UTC()
	a.CancelledAt = &now
	f.cancels = append(f.cancels, cancelCall{TenantID: tenantID, ID: id, Reason: reason})
	return nil
}

func (f *fakeAssignmentRepo) ListBySourcePrediction(
	_ context.Context, tenantID, predictionID uuid.UUID,
) ([]*domain.Assignment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	ids := f.bySrc[predictionID]
	out := make([]*domain.Assignment, 0, len(ids))
	for _, id := range ids {
		if a, ok := f.byID[id]; ok && a.TenantID == tenantID {
			copy := *a
			out = append(out, &copy)
		}
	}
	return out, nil
}

// link registers an assignment as "derived from" a prediction, mirroring the
// metadata->>'source_prediction_id' JSON key in production.
func (f *fakeAssignmentRepo) link(predictionID, assignmentID uuid.UUID) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.bySrc[predictionID] = append(f.bySrc[predictionID], assignmentID)
}

// fakeCatalogRepo stubs CatalogRepository — RetractFromPrediction does not
// exercise it, so we only need to satisfy the interface.
type fakeCatalogRepo struct{}

func (fakeCatalogRepo) Create(_ context.Context, _ *domain.Intervention) error { return nil }
func (fakeCatalogRepo) GetByID(_ context.Context, _ uuid.UUID) (*domain.Intervention, error) {
	return nil, domain.ErrInterventionNotFound
}
func (fakeCatalogRepo) GetByCode(_ context.Context, _ uuid.UUID, _ string) (*domain.Intervention, error) {
	return nil, domain.ErrInterventionNotFound
}
func (fakeCatalogRepo) Update(_ context.Context, _ *domain.Intervention) error { return nil }
func (fakeCatalogRepo) List(_ context.Context, _ domain.CatalogFilter) ([]*domain.Intervention, int, error) {
	return nil, 0, nil
}
func (fakeCatalogRepo) ListByCategory(_ context.Context, _ uuid.UUID, _ domain.Category) ([]*domain.Intervention, error) {
	return nil, nil
}
func (fakeCatalogRepo) ListByDimension(_ context.Context, _ uuid.UUID, _ string) ([]*domain.Intervention, error) {
	return nil, nil
}
func (fakeCatalogRepo) ListActive(_ context.Context, _ uuid.UUID) ([]*domain.Intervention, error) {
	return nil, nil
}
func (fakeCatalogRepo) Search(_ context.Context, _ uuid.UUID, _ string, _ int) ([]*domain.Intervention, error) {
	return nil, nil
}

// --- Tests -----------------------------------------------------------------

func TestRetractFromPrediction_CancelsDerivedAssignments(t *testing.T) {
	repo := newFakeAssignmentRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewAssignmentService(repo, fakeCatalogRepo{}, pub, zerolog.Nop())

	tenantID := uuid.New()
	predictionID := uuid.New()
	objectionID := uuid.New()
	retractedBy := uuid.New()

	// Two active assignments derived from the prediction, plus one already
	// completed (must be skipped).
	active1 := &domain.Assignment{
		ID:       uuid.New(),
		TenantID: tenantID,
		Status:   domain.AssignmentStatusAssigned,
	}
	active2 := &domain.Assignment{
		ID:       uuid.New(),
		TenantID: tenantID,
		Status:   domain.AssignmentStatusInProgress,
	}
	done := &domain.Assignment{
		ID:       uuid.New(),
		TenantID: tenantID,
		Status:   domain.AssignmentStatusCompleted,
	}
	for _, a := range []*domain.Assignment{active1, active2, done} {
		_ = repo.Create(context.Background(), a)
		repo.link(predictionID, a.ID)
	}

	if err := svc.RetractFromPrediction(context.Background(), tenantID, predictionID,
		objectionID, retractedBy, ""); err != nil {
		t.Fatalf("retract failed: %v", err)
	}

	// Only two cancels should fire (the completed row is skipped).
	if len(repo.cancels) != 2 {
		t.Fatalf("expected 2 cancels, got %d", len(repo.cancels))
	}
	// Each cancel call must carry a Turkish reason string.
	for _, c := range repo.cancels {
		if c.Reason == "" {
			t.Fatalf("cancel reason must not be empty: %+v", c)
		}
	}
	// Two intervention.cancelled.v1 events should be published.
	if got := pub.Count(event.TopicCancelled); got != 2 {
		t.Fatalf("expected 2 cancel events, got %d", got)
	}
}

func TestRetractFromPrediction_RejectsNilIDs(t *testing.T) {
	repo := newFakeAssignmentRepo()
	svc := service.NewAssignmentService(repo, fakeCatalogRepo{}, event.NewInMemoryPublisher(), zerolog.Nop())

	err := svc.RetractFromPrediction(context.Background(), uuid.Nil, uuid.New(), uuid.Nil, uuid.Nil, "")
	if err == nil {
		t.Fatal("expected error for nil tenantID")
	}
	err = svc.RetractFromPrediction(context.Background(), uuid.New(), uuid.Nil, uuid.Nil, uuid.Nil, "")
	if err == nil {
		t.Fatal("expected error for nil predictionID")
	}
}

func TestRetractFromPrediction_UsesDefaultReasonWhenEmpty(t *testing.T) {
	repo := newFakeAssignmentRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewAssignmentService(repo, fakeCatalogRepo{}, pub, zerolog.Nop())

	tenantID := uuid.New()
	predictionID := uuid.New()
	a := &domain.Assignment{
		ID:       uuid.New(),
		TenantID: tenantID,
		Status:   domain.AssignmentStatusAssigned,
	}
	_ = repo.Create(context.Background(), a)
	repo.link(predictionID, a.ID)

	_ = svc.RetractFromPrediction(context.Background(), tenantID, predictionID,
		uuid.New(), uuid.New(), "")

	if len(repo.cancels) != 1 {
		t.Fatalf("expected 1 cancel, got %d", len(repo.cancels))
	}
	// Must contain the KVKK reference token.
	if !contains(repo.cancels[0].Reason, "KVKK") {
		t.Fatalf("default reason must mention KVKK, got %q", repo.cancels[0].Reason)
	}
}

// contains avoids importing strings just for Contains.
func contains(s, sub string) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
