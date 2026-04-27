package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/repository"
)

func newTestPipService(t *testing.T) (*PipService, *repository.InMemoryPipRepository) {
	t.Helper()
	repo := repository.NewInMemoryPipRepository()
	svc := NewPipService(repo, zerolog.Nop())
	return svc, repo
}

func validInitiateReq(duration int) InitiateRequest {
	return InitiateRequest{
		EmployeeID:     uuid.New(),
		ReasonCategory: string(domain.PipReasonPerformance),
		ReasonSummary:  "Hedeflerin %60 altında — belgelenmiş.",
		StartDate:      "2026-04-01",
		DurationDays:   duration,
		Goals: []GoalItem{
			{
				Description:      "Kod inceleme katılımı",
				MeasurableTarget: "Haftada en az 5 PR review",
				Deadline:         "2026-04-15",
				Priority:         "high",
			},
		},
	}
}

func TestInitiateCase_Success(t *testing.T) {
	svc, repo := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	req := validInitiateReq(30)

	c, err := svc.InitiateCase(context.Background(), tenant, manager, req)
	if err != nil {
		t.Fatalf("unexpected: %v", err)
	}
	if c.Status != domain.PipStatusDraft {
		t.Errorf("status: got %s want draft", c.Status)
	}
	if c.TenantID != tenant || c.InitiatedBy != manager {
		t.Errorf("tenant/manager mismatch")
	}
	if len(c.Goals) != 1 {
		t.Errorf("expected 1 goal, got %d", len(c.Goals))
	}
	// Stored in repo
	stored, err := repo.GetCase(context.Background(), tenant, c.ID)
	if err != nil || stored.Status != domain.PipStatusDraft {
		t.Errorf("not stored: %v %v", stored, err)
	}
}

func TestInitiateCase_RejectsInvalidDuration(t *testing.T) {
	svc, _ := newTestPipService(t)
	req := validInitiateReq(45) // 45 not in {30,60,90}
	_, err := svc.InitiateCase(context.Background(), uuid.New(), uuid.New(), req)
	if err == nil {
		t.Fatalf("expected validation error")
	}
	var ve *domain.ValidationError
	if !errors.As(err, &ve) || ve.Fields["duration_days"] == "" {
		t.Errorf("expected duration_days validation, got %v", err)
	}
}

func TestInitiateCase_RejectsEmployeeAsManager(t *testing.T) {
	svc, _ := newTestPipService(t)
	req := validInitiateReq(30)
	same := uuid.New()
	req.EmployeeID = same
	_, err := svc.InitiateCase(context.Background(), uuid.New(), same, req)
	if err == nil {
		t.Fatalf("expected validation error")
	}
}

func TestStateMachine_HappyPath_PassedFlow(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	legal := uuid.New()

	c, err := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	if err != nil {
		t.Fatalf("initiate: %v", err)
	}
	// draft → pending_legal
	c, err = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	if c.Status != domain.PipStatusPendingLegal {
		t.Errorf("got %s want pending_legal", c.Status)
	}
	// pending_legal → active
	c, err = svc.ApproveLegal(context.Background(), tenant, c.ID, legal, ApproveLegalRequest{
		LegalFileURL: "https://docs/legal.pdf",
	})
	if err != nil {
		t.Fatalf("approve: %v", err)
	}
	if c.Status != domain.PipStatusActive || !c.LegalReviewed {
		t.Errorf("got %s reviewed=%v", c.Status, c.LegalReviewed)
	}
	// Add 3 check-ins
	for i := 1; i <= 3; i++ {
		_, err := svc.AddCheckin(context.Background(), tenant, c.ID, manager, AddCheckinRequest{
			WeekNumber:   i,
			OnTrack:      "on_track",
			ManagerNotes: "Haftalık görüşme tamam.",
		})
		if err != nil {
			t.Fatalf("checkin %d: %v", i, err)
		}
	}
	// Close passed
	c, err = svc.ClosePassed(context.Background(), tenant, c.ID, manager, CloseRequest{
		OutcomeReason: "Hedeflere ulaşıldı.",
	})
	if err != nil {
		t.Fatalf("close: %v", err)
	}
	if c.Status != domain.PipStatusPassed {
		t.Errorf("want passed, got %s", c.Status)
	}
	if c.Outcome == nil || c.Outcome.Result != domain.PipOutcomePassed {
		t.Errorf("outcome: %+v", c.Outcome)
	}
}

func TestApproveLegal_RequiresFile(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	legal := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	_, err := svc.ApproveLegal(context.Background(), tenant, c.ID, legal, ApproveLegalRequest{})
	if err == nil {
		t.Fatalf("expected legal_file_url required")
	}
}

func TestApproveLegal_RejectsFromDraft(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, uuid.New(), validInitiateReq(30))
	_, err := svc.ApproveLegal(context.Background(), tenant, c.ID, uuid.New(), ApproveLegalRequest{
		LegalFileURL: "https://docs/f.pdf",
	})
	if err == nil {
		t.Fatalf("expected invalid transition — draft cannot approve directly")
	}
	if !errors.Is(err, domain.ErrInvalidStatus) {
		t.Errorf("expected ErrInvalidStatus, got %v", err)
	}
}

func TestCloseTerminated_RequiresLegalFile(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	legal := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	c, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, legal, ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})

	_, err := svc.CloseTerminated(context.Background(), tenant, c.ID, uuid.New(), CloseRequest{
		OutcomeReason: "Hedeflere ulaşılamadı.",
	})
	if err == nil {
		t.Fatalf("expected legal_file_url required for terminated")
	}
	var ve *domain.ValidationError
	if !errors.As(err, &ve) || ve.Fields["legal_file_url"] == "" {
		t.Errorf("expected legal_file_url field error")
	}
}

func TestCloseTerminated_HappyPath(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	legal := uuid.New()
	closedBy := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	c, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, legal, ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})

	c, err := svc.CloseTerminated(context.Background(), tenant, c.ID, closedBy, CloseRequest{
		LegalFileURL:  "https://docs/fesih.pdf",
		OutcomeReason: "Hedeflere ulaşılamadı, uzatma sonrası başarısız.",
		OutcomeNotes:  "25/2 fesih hazırlandı.",
	})
	if err != nil {
		t.Fatalf("close terminated: %v", err)
	}
	if c.Status != domain.PipStatusTerminated {
		t.Errorf("want terminated, got %s", c.Status)
	}
	if c.Outcome == nil || c.Outcome.Result != domain.PipOutcomeTerminated {
		t.Errorf("outcome: %+v", c.Outcome)
	}
	if c.Outcome.LegalFileURL == nil || *c.Outcome.LegalFileURL != "https://docs/fesih.pdf" {
		t.Errorf("legal file not persisted")
	}
}

func TestExtendCase_HappyPath(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	legal := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	c, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, legal, ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})

	c, err := svc.ExtendCase(context.Background(), tenant, c.ID, ExtendRequest{
		ExtensionDays: 30,
		Reason:        "Yeterli gelişim görülmedi, 30 gün ek süre verildi.",
	})
	if err != nil {
		t.Fatalf("extend: %v", err)
	}
	if c.Status != domain.PipStatusExtended {
		t.Errorf("want extended, got %s", c.Status)
	}
	if c.DurationDays != 60 {
		t.Errorf("duration: got %d want 60", c.DurationDays)
	}
}

func TestExtendCase_InvalidExtensionDays(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	_, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, uuid.New(), ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})

	_, err := svc.ExtendCase(context.Background(), tenant, c.ID, ExtendRequest{
		ExtensionDays: 45, // not allowed
		Reason:        "deneme",
	})
	if err == nil {
		t.Fatalf("expected invalid extension_days")
	}
}

func TestExtendCase_RejectsFromDraft(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, uuid.New(), validInitiateReq(30))
	_, err := svc.ExtendCase(context.Background(), tenant, c.ID, ExtendRequest{
		ExtensionDays: 30,
		Reason:        "x",
	})
	if err == nil {
		t.Fatalf("expected invalid transition")
	}
	if !errors.Is(err, domain.ErrInvalidStatus) {
		t.Errorf("expected ErrInvalidStatus, got %v", err)
	}
}

func TestAddCheckin_RequiresActive(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	_, err := svc.AddCheckin(context.Background(), tenant, c.ID, manager, AddCheckinRequest{
		WeekNumber: 1, OnTrack: "on_track",
	})
	if err == nil {
		t.Fatalf("expected invalid status (case is draft)")
	}
	if !errors.Is(err, domain.ErrInvalidStatus) {
		t.Errorf("expected ErrInvalidStatus, got %v", err)
	}
}

func TestAddCheckin_RejectsDuplicateWeek(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	_, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, uuid.New(), ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})
	if _, err := svc.AddCheckin(context.Background(), tenant, c.ID, manager, AddCheckinRequest{WeekNumber: 1, OnTrack: "on_track"}); err != nil {
		t.Fatalf("first checkin: %v", err)
	}
	_, err := svc.AddCheckin(context.Background(), tenant, c.ID, manager, AddCheckinRequest{WeekNumber: 1, OnTrack: "off_track"})
	if err == nil || !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected conflict for duplicate week, got %v", err)
	}
}

func TestAcknowledgeCheckin_RecordsIPandUA(t *testing.T) {
	svc, repo := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	_, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, uuid.New(), ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})
	k, err := svc.AddCheckin(context.Background(), tenant, c.ID, manager, AddCheckinRequest{WeekNumber: 1, OnTrack: "on_track"})
	if err != nil {
		t.Fatalf("checkin: %v", err)
	}
	if err := svc.AcknowledgeCheckin(context.Background(), tenant, k.ID, "10.0.0.42", "Mozilla/5.0", AcknowledgeCheckinRequest{
		EmployeeNotes: "Hedefleri anladım.",
	}); err != nil {
		t.Fatalf("acknowledge: %v", err)
	}
	list, _ := repo.ListCheckins(context.Background(), tenant, c.ID)
	if len(list) != 1 || list[0].AcknowledgedByEmployee == nil {
		t.Fatalf("ack not stored")
	}
	if list[0].AcknowledgeIP == nil || *list[0].AcknowledgeIP != "10.0.0.42" {
		t.Errorf("ip: %v", list[0].AcknowledgeIP)
	}
	if list[0].AcknowledgeUserAgent == nil {
		t.Errorf("ua not stored")
	}
	// Second ack must fail
	if err := svc.AcknowledgeCheckin(context.Background(), tenant, k.ID, "1.1.1.1", "ua", AcknowledgeCheckinRequest{}); err == nil {
		t.Errorf("expected conflict on double ack")
	}
}

func TestAddGoal_RejectsOnClosedCase(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	c, _ := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	c, _ = svc.SubmitForLegal(context.Background(), tenant, c.ID, manager, nil)
	c, _ = svc.ApproveLegal(context.Background(), tenant, c.ID, uuid.New(), ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})
	c, _ = svc.ClosePassed(context.Background(), tenant, c.ID, manager, CloseRequest{OutcomeReason: "Tamam."})

	_, err := svc.AddGoal(context.Background(), tenant, c.ID, AddGoalRequest{
		Description:      "Yeni",
		MeasurableTarget: "x",
		Deadline:         "2026-06-01",
	})
	if err == nil {
		t.Fatalf("expected rejection on closed case")
	}
}

func TestListForEmployee_IncludesClosed(t *testing.T) {
	svc, _ := newTestPipService(t)
	tenant := uuid.New()
	manager := uuid.New()
	emp := uuid.New()
	// Seed: one closed + one active
	req1 := validInitiateReq(30)
	req1.EmployeeID = emp
	c1, _ := svc.InitiateCase(context.Background(), tenant, manager, req1)
	c1, _ = svc.SubmitForLegal(context.Background(), tenant, c1.ID, manager, nil)
	c1, _ = svc.ApproveLegal(context.Background(), tenant, c1.ID, uuid.New(), ApproveLegalRequest{LegalFileURL: "https://docs/a.pdf"})
	_, _ = svc.ClosePassed(context.Background(), tenant, c1.ID, manager, CloseRequest{OutcomeReason: "ok"})

	req2 := validInitiateReq(30)
	req2.EmployeeID = emp
	// Distinct start date to avoid sort tie
	req2.StartDate = "2026-05-01"
	_, _ = svc.InitiateCase(context.Background(), tenant, manager, req2)

	items, err := svc.ListForEmployee(context.Background(), tenant, emp)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 2 {
		t.Errorf("expected 2 items (incl closed), got %d", len(items))
	}
}

func TestPipService_NopPublisher(t *testing.T) {
	svc, _ := newTestPipService(t)
	// Emit with nil publisher should be a noop — no panic
	svc.emit(context.Background(), "test.topic", map[string]any{"a": 1})
}

func TestPipService_EmitCaptured(t *testing.T) {
	svc, _ := newTestPipService(t)
	pub := &capturePublisher{}
	svc.WithPublisher(pub)

	tenant := uuid.New()
	manager := uuid.New()
	_, err := svc.InitiateCase(context.Background(), tenant, manager, validInitiateReq(30))
	if err != nil {
		t.Fatalf("initiate: %v", err)
	}
	if !pub.hasTopic(TopicPipInitiated) {
		t.Errorf("expected %s event, got topics=%v", TopicPipInitiated, pub.topics)
	}
}

// capturePublisher records topics published.
type capturePublisher struct {
	topics []string
}

func (c *capturePublisher) Publish(_ context.Context, topic string, _ any) error {
	c.topics = append(c.topics, topic)
	return nil
}
func (c *capturePublisher) Close() error { return nil }
func (c *capturePublisher) hasTopic(t string) bool {
	for _, v := range c.topics {
		if v == t {
			return true
		}
	}
	return false
}

// Smoke test — time.Now is used in the fake; make sure tests don't rely on zero times.
func TestRepo_UpdatedAtMoves(t *testing.T) {
	_, repo := newTestPipService(t)
	tenant := uuid.New()
	c := &domain.PipCase{
		TenantID:       tenant,
		EmployeeID:     uuid.New(),
		InitiatedBy:    uuid.New(),
		ReasonCategory: domain.PipReasonPerformance,
		ReasonSummary:  "x",
		StartDate:      time.Now(),
		DurationDays:   30,
	}
	if err := repo.CreateCaseWithGoals(context.Background(), c, nil); err != nil {
		t.Fatalf("create: %v", err)
	}
	prev := c.UpdatedAt
	time.Sleep(time.Millisecond)
	if err := repo.UpdateCaseStatus(context.Background(), tenant, c.ID, nil, nil, nil, nil, domain.PipStatusPendingLegal); err != nil {
		t.Fatalf("update: %v", err)
	}
	stored, _ := repo.GetCase(context.Background(), tenant, c.ID)
	if !stored.UpdatedAt.After(prev) {
		t.Errorf("updated_at did not move (prev=%v now=%v)", prev, stored.UpdatedAt)
	}
}
