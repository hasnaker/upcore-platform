package service_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/service"
)

// -------------------- test doubles --------------------

type fakeConsentRepo struct {
	mu   sync.Mutex
	logs []*domain.ConsentLog
}

func (f *fakeConsentRepo) Create(_ context.Context, c *domain.ConsentLog) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	cp := *c
	f.logs = append(f.logs, &cp)
	return nil
}

func (f *fakeConsentRepo) ListByEmployee(_ context.Context, tid, eid uuid.UUID) ([]*domain.ConsentLog, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]*domain.ConsentLog, 0, len(f.logs))
	for _, l := range f.logs {
		if l.TenantID == tid && l.EmployeeID == eid {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakeConsentRepo) ListByAssignment(_ context.Context, tid, aid uuid.UUID) ([]*domain.ConsentLog, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]*domain.ConsentLog, 0, len(f.logs))
	for _, l := range f.logs {
		if l.TenantID == tid && l.AssignmentID == aid {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakeConsentRepo) LatestByAssignment(_ context.Context, tid, aid uuid.UUID) (*domain.ConsentLog, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var latest *domain.ConsentLog
	for _, l := range f.logs {
		if l.TenantID != tid || l.AssignmentID != aid {
			continue
		}
		if latest == nil || l.CreatedAt.After(latest.CreatedAt) {
			latest = l
		}
	}
	if latest == nil {
		return nil, errors.New("not found")
	}
	return latest, nil
}

type fakeAssignmentRepo struct {
	mu    sync.Mutex
	items map[uuid.UUID]*domain.Assignment
}

func newFakeAssignmentRepo() *fakeAssignmentRepo {
	return &fakeAssignmentRepo{items: map[uuid.UUID]*domain.Assignment{}}
}

func (r *fakeAssignmentRepo) Create(_ context.Context, a *domain.Assignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now().UTC()
	if a.AssignedAt.IsZero() {
		a.AssignedAt = now
	}
	a.CreatedAt = now
	a.UpdatedAt = now
	cp := *a
	r.items[a.ID] = &cp
	return nil
}

func (r *fakeAssignmentRepo) GetByID(_ context.Context, tid, id uuid.UUID) (*domain.Assignment, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.items[id]
	if !ok || a.TenantID != tid {
		return nil, domain.ErrAssignmentNotFound
	}
	cp := *a
	return &cp, nil
}

func (r *fakeAssignmentRepo) Update(_ context.Context, a *domain.Assignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.items[a.ID]
	if !ok {
		return domain.ErrAssignmentNotFound
	}
	a.UpdatedAt = time.Now().UTC()
	cp := *a
	r.items[a.ID] = &cp
	return nil
}

func (r *fakeAssignmentRepo) ListByEmployee(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *fakeAssignmentRepo) ListByIntervention(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *fakeAssignmentRepo) ListByStatus(_ context.Context, _ uuid.UUID, _ domain.AssignmentStatus, _, _ int) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (r *fakeAssignmentRepo) List(_ context.Context, _ domain.AssignmentFilter) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (r *fakeAssignmentRepo) ListPendingConsent(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *fakeAssignmentRepo) BulkCreate(_ context.Context, items []*domain.Assignment) (int, error) {
	for _, a := range items {
		_ = r.Create(context.Background(), a)
	}
	return len(items), nil
}

func (r *fakeAssignmentRepo) Cancel(_ context.Context, tid, id uuid.UUID, reason string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.items[id]
	if !ok || a.TenantID != tid {
		return domain.ErrAssignmentNotFound
	}
	if domain.IsTerminalStatus(a.Status) {
		return domain.ErrAssignmentTerminal
	}
	a.Status = domain.AssignmentStatusCancelled
	now := time.Now().UTC()
	a.CancelledAt = &now
	a.UpdatedAt = now
	suffix := reason
	if a.Notes != nil {
		s := *a.Notes + "; " + reason
		suffix = s
	}
	a.Notes = &suffix
	return nil
}

// -------------------- helpers --------------------

func newTestFixture(t *testing.T) (*service.ConsentService, *fakeAssignmentRepo, *fakeConsentRepo, *event.InMemoryPublisher, *domain.Assignment, uuid.UUID) {
	t.Helper()
	tid := uuid.New()
	empID := uuid.New()
	intervID := uuid.New()

	consentRepo := &fakeConsentRepo{}
	assignRepo := newFakeAssignmentRepo()
	catalogRepo := newFakeCatalogRepo(&domain.Intervention{
		ID:            intervID,
		Code:          "COACH_01",
		TitleTR:       "Bireysel Koçluk",
		DescriptionTR: "4 haftalık koçluk programı",
		Category:      domain.CategoryCoaching,
		EvidenceTier:  domain.EvidenceTierA,
		DeliveryMode:  domain.DeliveryMode1on1,
		Active:        true,
	})
	pub := event.NewInMemoryPublisher()

	svc := service.NewConsentService(consentRepo, assignRepo, catalogRepo, pub, zerolog.Nop())

	a := &domain.Assignment{
		ID:             uuid.New(),
		TenantID:       tid,
		InterventionID: intervID,
		EmployeeID:     empID,
		Status:         domain.AssignmentStatusAssigned,
	}
	if err := assignRepo.Create(context.Background(), a); err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	return svc, assignRepo, consentRepo, pub, a, empID
}

// -------------------- tests --------------------

func TestConsent_Grant_Success(t *testing.T) {
	svc, assignRepo, consentRepo, pub, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "1.2.3.4", UserAgent: "UpCoreTest/1.0"}

	if err := svc.Grant(context.Background(), a.TenantID, a.ID, actor); err != nil {
		t.Fatalf("grant: %v", err)
	}

	updated, _ := assignRepo.GetByID(context.Background(), a.TenantID, a.ID)
	if updated.Status != domain.AssignmentStatusInProgress {
		t.Errorf("expected in_progress, got %s", updated.Status)
	}
	if updated.AcceptedAt == nil {
		t.Errorf("accepted_at must be set")
	}

	if len(consentRepo.logs) != 1 {
		t.Fatalf("expected 1 consent log, got %d", len(consentRepo.logs))
	}
	log := consentRepo.logs[0]
	if log.Action != domain.ConsentGranted {
		t.Errorf("expected granted, got %s", log.Action)
	}
	if log.ActorIP != "1.2.3.4" || log.UserAgent != "UpCoreTest/1.0" {
		t.Errorf("audit metadata missing: ip=%q ua=%q", log.ActorIP, log.UserAgent)
	}

	if pub.Count(event.TopicConsentGranted) != 1 {
		t.Errorf("expected 1 consent.granted event")
	}
}

func TestConsent_Grant_AlreadyConsented(t *testing.T) {
	svc, _, _, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "1.2.3.4"}

	if err := svc.Grant(context.Background(), a.TenantID, a.ID, actor); err != nil {
		t.Fatalf("first grant: %v", err)
	}
	err := svc.Grant(context.Background(), a.TenantID, a.ID, actor)
	// Second call must fail because status moved to in_progress.
	if err == nil {
		t.Fatalf("expected error on second grant")
	}
	if !errors.Is(err, domain.ErrInvalidStatus) && !errors.Is(err, domain.ErrAlreadyConsented) {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestConsent_Decline_RecordsReason(t *testing.T) {
	svc, assignRepo, consentRepo, pub, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "2.2.2.2", UserAgent: "Chrome"}

	if err := svc.Decline(context.Background(), a.TenantID, a.ID, "Şu an uygun değilim", actor); err != nil {
		t.Fatalf("decline: %v", err)
	}

	updated, _ := assignRepo.GetByID(context.Background(), a.TenantID, a.ID)
	if updated.Status != domain.AssignmentStatusDeclined {
		t.Errorf("expected declined, got %s", updated.Status)
	}

	if len(consentRepo.logs) != 1 {
		t.Fatalf("expected 1 log")
	}
	if consentRepo.logs[0].Action != domain.ConsentDeclined {
		t.Errorf("action: %s", consentRepo.logs[0].Action)
	}
	if consentRepo.logs[0].Reason == nil || *consentRepo.logs[0].Reason != "Şu an uygun değilim" {
		t.Errorf("reason: %+v", consentRepo.logs[0].Reason)
	}
	if pub.Count(event.TopicConsentDeclined) != 1 {
		t.Errorf("missing consent.declined event")
	}
}

func TestConsent_Decline_EmptyReasonAllowed(t *testing.T) {
	svc, _, consentRepo, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "3.3.3.3"}

	if err := svc.Decline(context.Background(), a.TenantID, a.ID, "", actor); err != nil {
		t.Fatalf("decline: %v", err)
	}
	if consentRepo.logs[0].Reason != nil {
		t.Errorf("empty reason must be nil")
	}
}

func TestConsent_Revoke_AfterGrant(t *testing.T) {
	svc, assignRepo, consentRepo, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "4.4.4.4", UserAgent: "Safari"}

	if err := svc.Grant(context.Background(), a.TenantID, a.ID, actor); err != nil {
		t.Fatalf("grant: %v", err)
	}
	if err := svc.Revoke(context.Background(), a.TenantID, a.ID, "fikir değiştirdim", actor); err != nil {
		t.Fatalf("revoke: %v", err)
	}

	updated, _ := assignRepo.GetByID(context.Background(), a.TenantID, a.ID)
	if updated.Status != domain.AssignmentStatusCancelled {
		t.Errorf("expected cancelled, got %s", updated.Status)
	}

	// Two consent logs: granted + revoked.
	if len(consentRepo.logs) != 2 {
		t.Fatalf("expected 2 logs, got %d", len(consentRepo.logs))
	}
	if consentRepo.logs[1].Action != domain.ConsentRevoked {
		t.Errorf("last action: %s", consentRepo.logs[1].Action)
	}
}

func TestConsent_Revoke_TerminalRejected(t *testing.T) {
	svc, _, _, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "5.5.5.5"}

	if err := svc.Decline(context.Background(), a.TenantID, a.ID, "", actor); err != nil {
		t.Fatalf("decline: %v", err)
	}
	err := svc.Revoke(context.Background(), a.TenantID, a.ID, "", actor)
	if !errors.Is(err, domain.ErrAssignmentTerminal) {
		t.Errorf("expected terminal error, got %v", err)
	}
}

func TestConsent_Decline_InvalidTransition(t *testing.T) {
	svc, _, _, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "6.6.6.6"}

	// grant first
	if err := svc.Grant(context.Background(), a.TenantID, a.ID, actor); err != nil {
		t.Fatalf("grant: %v", err)
	}
	err := svc.Decline(context.Background(), a.TenantID, a.ID, "değişti", actor)
	if !errors.Is(err, domain.ErrInvalidStatus) {
		t.Errorf("expected invalid status, got %v", err)
	}
}

func TestConsent_Remind_TooSoon(t *testing.T) {
	svc, _, _, _, a, _ := newTestFixture(t)
	err := svc.Remind(context.Background(), a.TenantID, a.ID, 72*time.Hour)
	if !errors.Is(err, domain.ErrInvalidStatus) {
		t.Errorf("expected invalid status, got %v", err)
	}
}

func TestConsent_Remind_AgedPublishesEvent(t *testing.T) {
	svc, assignRepo, _, pub, a, _ := newTestFixture(t)
	// Backdate assigned_at so reminder threshold is satisfied.
	a.AssignedAt = time.Now().Add(-80 * time.Hour)
	_ = assignRepo.Update(context.Background(), a)

	if err := svc.Remind(context.Background(), a.TenantID, a.ID, 72*time.Hour); err != nil {
		t.Fatalf("remind: %v", err)
	}
	if pub.Count(event.TopicAssigned) != 1 {
		t.Errorf("expected 1 assigned event from reminder, got %d", pub.Count(event.TopicAssigned))
	}
}

func TestConsent_History_ListsByEmployee(t *testing.T) {
	svc, _, _, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "7.7.7.7"}
	_ = svc.Decline(context.Background(), a.TenantID, a.ID, "ilk red", actor)

	logs, err := svc.GetHistory(context.Background(), a.TenantID, empID)
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 history entry")
	}
}

func TestConsent_ListByAssignment(t *testing.T) {
	svc, _, _, _, a, empID := newTestFixture(t)
	actor := service.ActorContext{EmployeeID: empID, IP: "8.8.8.8"}
	_ = svc.Grant(context.Background(), a.TenantID, a.ID, actor)
	_ = svc.Revoke(context.Background(), a.TenantID, a.ID, "", actor)

	logs, err := svc.ListByAssignment(context.Background(), a.TenantID, a.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected 2 logs, got %d", len(logs))
	}
}
