package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
)

// fakeRotationRepo is an in-memory repo used only by tests.
type fakeRotationRepo struct {
	rotations            map[uuid.UUID]*domain.InternalRotation
	hasOpen              bool
	hasOpenErr           error
	lastCompleted        *string
	createErr            error
	getErr               error
	updateErr            error
	pendingRows          []domain.InternalRotation
	hasOpenCallEmployee  uuid.UUID
	updateStatusCaptured []domain.RotationStatus
}

func newFakeRepo() *fakeRotationRepo {
	return &fakeRotationRepo{rotations: make(map[uuid.UUID]*domain.InternalRotation)}
}

func (f *fakeRotationRepo) Create(_ context.Context, rot *domain.InternalRotation) (*domain.InternalRotation, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	if rot.ID == uuid.Nil {
		rot.ID = uuid.New()
	}
	rot.CreatedAt = time.Now()
	rot.UpdatedAt = rot.CreatedAt
	f.rotations[rot.ID] = rot
	return rot, nil
}

func (f *fakeRotationRepo) Get(_ context.Context, _, id uuid.UUID) (*domain.InternalRotation, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	r, ok := f.rotations[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return r, nil
}

func (f *fakeRotationRepo) ListByEmployee(_ context.Context, _, employeeID uuid.UUID) ([]domain.InternalRotation, error) {
	out := []domain.InternalRotation{}
	for _, r := range f.rotations {
		if r.EmployeeID == employeeID {
			out = append(out, *r)
		}
	}
	return out, nil
}

func (f *fakeRotationRepo) UpdateStatus(_ context.Context, _, id uuid.UUID, next domain.RotationStatus, approver *uuid.UUID) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	r, ok := f.rotations[id]
	if !ok {
		return domain.ErrNotFound
	}
	r.Status = next
	if approver != nil {
		r.ApprovedByID = approver
		now := time.Now()
		r.ApprovedAt = &now
	}
	f.updateStatusCaptured = append(f.updateStatusCaptured, next)
	return nil
}

func (f *fakeRotationRepo) LastRotationCompletedAt(_ context.Context, _, _ uuid.UUID) (*string, error) {
	return f.lastCompleted, nil
}

func (f *fakeRotationRepo) HasOpenRotation(_ context.Context, _, employeeID uuid.UUID) (bool, error) {
	f.hasOpenCallEmployee = employeeID
	return f.hasOpen, f.hasOpenErr
}

func (f *fakeRotationRepo) ListPending(_ context.Context, _ uuid.UUID, _ domain.RotationStatus) ([]domain.InternalRotation, error) {
	return f.pendingRows, nil
}

func mkInput(reason string) ProposeInput {
	from := uuid.New()
	to := uuid.New()
	fromDept := uuid.New()
	toDept := uuid.New()
	return ProposeInput{
		TenantID:       uuid.New(),
		EmployeeID:     uuid.New(),
		FromPositionID: from,
		ToPositionID:   to,
		FromDeptID:     fromDept,
		ToDeptID:       toDept,
		ReasonTR:       reason,
		RequestedByID:  uuid.New(),
	}
}

// 1) Cooldown still active → ErrCooldownActive.
func TestPropose_CooldownActive(t *testing.T) {
	repo := newFakeRepo()
	last := time.Now().AddDate(0, 0, -100).Format(time.RFC3339)
	repo.lastCompleted = &last
	svc := NewRotationService(repo, 365, zerolog.Nop())
	in := mkInput(strings.Repeat("ç", 60))
	_, err := svc.Propose(context.Background(), in)
	if !errors.Is(err, domain.ErrCooldownActive) {
		t.Fatalf("want ErrCooldownActive, got %v", err)
	}
}

// 2) Duplicate open rotation → ErrDuplicateOpenRotation.
func TestPropose_DuplicateOpen(t *testing.T) {
	repo := newFakeRepo()
	repo.hasOpen = true
	svc := NewRotationService(repo, 365, zerolog.Nop())
	in := mkInput(strings.Repeat("a", 80))
	_, err := svc.Propose(context.Background(), in)
	if !errors.Is(err, domain.ErrDuplicateOpenRotation) {
		t.Fatalf("want ErrDuplicateOpenRotation, got %v", err)
	}
}

// 3) Short reason (<50) → ErrValidation.
func TestPropose_ShortReasonRejected(t *testing.T) {
	repo := newFakeRepo()
	svc := NewRotationService(repo, 365, zerolog.Nop())
	in := mkInput("too short reason")
	_, err := svc.Propose(context.Background(), in)
	if !errors.Is(err, domain.ErrValidation) {
		t.Fatalf("want ErrValidation, got %v", err)
	}
}

// 4) Happy path: propose → approve → complete succeeds and status transitions
// in the expected order.
func TestFullApprovalFlow(t *testing.T) {
	repo := newFakeRepo()
	svc := NewRotationService(repo, 365, zerolog.Nop())

	in := mkInput(strings.Repeat("ö", 55))
	rot, err := svc.Propose(context.Background(), in)
	if err != nil {
		t.Fatalf("propose: %v", err)
	}
	if rot.Status != domain.RotationProposed {
		t.Fatalf("status: want proposed, got %s", rot.Status)
	}

	approver := uuid.New()
	if err := svc.Approve(context.Background(), in.TenantID, rot.ID, approver); err != nil {
		t.Fatalf("approve: %v", err)
	}
	if repo.rotations[rot.ID].Status != domain.RotationApproved {
		t.Fatalf("expected approved, got %s", repo.rotations[rot.ID].Status)
	}

	if err := svc.Complete(context.Background(), in.TenantID, rot.ID); err != nil {
		t.Fatalf("complete: %v", err)
	}
	if repo.rotations[rot.ID].Status != domain.RotationCompleted {
		t.Fatalf("expected completed, got %s", repo.rotations[rot.ID].Status)
	}
	if len(repo.updateStatusCaptured) != 2 {
		t.Fatalf("expected 2 transitions, got %d", len(repo.updateStatusCaptured))
	}
}

// 5) Rejection requires a reason of at least 10 chars, and cannot be applied
// to a rotation that is already completed.
func TestReject_RequiresReasonAndValidState(t *testing.T) {
	repo := newFakeRepo()
	svc := NewRotationService(repo, 365, zerolog.Nop())
	in := mkInput(strings.Repeat("ş", 60))
	rot, err := svc.Propose(context.Background(), in)
	if err != nil {
		t.Fatalf("propose: %v", err)
	}

	// empty reason → ErrRejectReasonRequired
	err = svc.Reject(context.Background(), in.TenantID, rot.ID, "  ")
	if !errors.Is(err, domain.ErrRejectReasonRequired) {
		t.Fatalf("want reason required, got %v", err)
	}

	// valid reason → success
	if err := svc.Reject(context.Background(), in.TenantID, rot.ID, "yetersiz gerekçe detayı"); err != nil {
		t.Fatalf("valid reject failed: %v", err)
	}
	if repo.rotations[rot.ID].Status != domain.RotationRejected {
		t.Fatalf("status: want rejected, got %s", repo.rotations[rot.ID].Status)
	}

	// Second reject on rejected rotation → ErrInvalidTransition
	err = svc.Reject(context.Background(), in.TenantID, rot.ID, "başka bir gerekçe yeterli uzunlukta")
	if !errors.Is(err, domain.ErrInvalidTransition) {
		t.Fatalf("want invalid transition, got %v", err)
	}
}

// Bonus: sanity-check the transition matrix we just introduced.
func TestAllowedRotationTransition(t *testing.T) {
	cases := []struct {
		from, to domain.RotationStatus
		ok       bool
	}{
		{domain.RotationProposed, domain.RotationApproved, true},
		{domain.RotationProposed, domain.RotationRejected, true},
		{domain.RotationProposed, domain.RotationCompleted, false},
		{domain.RotationApproved, domain.RotationActive, true},
		{domain.RotationActive, domain.RotationCompleted, true},
		{domain.RotationCompleted, domain.RotationApproved, false},
		{domain.RotationRejected, domain.RotationApproved, false},
	}
	for _, c := range cases {
		if got := domain.AllowedRotationTransition(c.from, c.to); got != c.ok {
			t.Errorf("%s→%s: want %v got %v", c.from, c.to, c.ok, got)
		}
	}
}
