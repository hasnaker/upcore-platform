package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPipStatus_CanTransitionTo(t *testing.T) {
	cases := []struct {
		from, to PipStatus
		want     bool
	}{
		// Legal path
		{PipStatusDraft, PipStatusPendingLegal, true},
		{PipStatusPendingLegal, PipStatusActive, true},
		{PipStatusActive, PipStatusExtended, true},
		{PipStatusActive, PipStatusPassed, true},
		{PipStatusActive, PipStatusTerminated, true},
		{PipStatusExtended, PipStatusPassed, true},
		{PipStatusExtended, PipStatusTerminated, true},
		// Invalid transitions
		{PipStatusDraft, PipStatusActive, false},              // must go through pending_legal
		{PipStatusDraft, PipStatusPassed, false},
		{PipStatusDraft, PipStatusTerminated, false},
		{PipStatusPendingLegal, PipStatusTerminated, false},   // legal must first approve
		{PipStatusPendingLegal, PipStatusExtended, false},
		{PipStatusPassed, PipStatusActive, false},             // closed
		{PipStatusPassed, PipStatusTerminated, false},
		{PipStatusTerminated, PipStatusActive, false},         // closed
		// Self-transition always false
		{PipStatusActive, PipStatusActive, false},
	}
	for _, c := range cases {
		got := c.from.CanTransitionTo(c.to)
		if got != c.want {
			t.Errorf("%s → %s: got %v want %v", c.from, c.to, got, c.want)
		}
	}
}

func TestPipStatus_IsClosedAndIsActive(t *testing.T) {
	if !PipStatusPassed.IsClosed() || !PipStatusTerminated.IsClosed() {
		t.Errorf("passed/terminated must be closed")
	}
	if PipStatusActive.IsClosed() || PipStatusDraft.IsClosed() {
		t.Errorf("active/draft must not be closed")
	}
	if !PipStatusActive.IsActive() || !PipStatusExtended.IsActive() {
		t.Errorf("active/extended must be active")
	}
	if PipStatusDraft.IsActive() || PipStatusPassed.IsActive() {
		t.Errorf("draft/passed must not be active")
	}
}

func TestPipReasonCategory_IsValid(t *testing.T) {
	valid := []PipReasonCategory{
		PipReasonPerformance, PipReasonAttendance, PipReasonConduct, PipReasonCompetency,
	}
	for _, v := range valid {
		if !v.IsValid() {
			t.Errorf("%s must be valid", v)
		}
	}
	if PipReasonCategory("other").IsValid() {
		t.Errorf("other must be invalid")
	}
}

func TestPipCase_ValidateHappyPath(t *testing.T) {
	c := &PipCase{
		TenantID:       uuid.New(),
		EmployeeID:     uuid.New(),
		InitiatedBy:    uuid.New(),
		ReasonCategory: PipReasonPerformance,
		ReasonSummary:  "Son çeyrek hedeflerinden %60'ı karşılanmadı.",
		StartDate:      time.Now().UTC(),
		DurationDays:   30,
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	if c.Status != PipStatusDraft {
		t.Errorf("expected draft, got %s", c.Status)
	}
	if c.ID == uuid.Nil {
		t.Errorf("expected id to be filled")
	}
}

func TestPipCase_ValidateDurationRejected(t *testing.T) {
	c := &PipCase{
		TenantID:       uuid.New(),
		EmployeeID:     uuid.New(),
		InitiatedBy:    uuid.New(),
		ReasonCategory: PipReasonPerformance,
		ReasonSummary:  "x",
		StartDate:      time.Now(),
		DurationDays:   45, // not in 30/60/90
	}
	c.ApplyDefaults()
	err := c.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["duration_days"] == "" {
		t.Errorf("expected duration_days error, got %v", err)
	}
}

func TestPipCase_ValidateMissingSummary(t *testing.T) {
	c := &PipCase{
		TenantID:       uuid.New(),
		EmployeeID:     uuid.New(),
		InitiatedBy:    uuid.New(),
		ReasonCategory: PipReasonConduct,
		ReasonSummary:  "   ",
		StartDate:      time.Now(),
		DurationDays:   60,
	}
	c.ApplyDefaults()
	err := c.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["reason_summary"] == "" {
		t.Errorf("expected reason_summary error, got %v", err)
	}
}

func TestPipCase_EndDate(t *testing.T) {
	start := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	c := &PipCase{StartDate: start, DurationDays: 60}
	end := c.EndDate()
	want := start.AddDate(0, 0, 60)
	if !end.Equal(want) {
		t.Errorf("end: got %v want %v", end, want)
	}
}

func TestPipGoal_Validate(t *testing.T) {
	g := &PipGoal{
		TenantID:         uuid.New(),
		CaseID:           uuid.New(),
		Description:      "Kod incelemelerinde aktif katılım",
		MeasurableTarget: "haftada en az 5 PR review",
		Deadline:         time.Now().AddDate(0, 0, 30),
	}
	g.ApplyDefaults()
	if err := g.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	if g.Priority != PipPriorityMedium {
		t.Errorf("default priority expected medium, got %s", g.Priority)
	}
	g.Description = ""
	err := g.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["description"] == "" {
		t.Errorf("expected description error, got %v", err)
	}
}

func TestPipCheckin_SetAcknowledge(t *testing.T) {
	k := &PipCheckin{}
	k.SetAcknowledge("192.168.1.10", "Mozilla/5.0")
	if k.AcknowledgedByEmployee == nil {
		t.Errorf("expected timestamp")
	}
	if k.AcknowledgeIP == nil || *k.AcknowledgeIP != "192.168.1.10" {
		t.Errorf("ip: %v", k.AcknowledgeIP)
	}
	if k.AcknowledgeUserAgent == nil || *k.AcknowledgeUserAgent != "Mozilla/5.0" {
		t.Errorf("ua: %v", k.AcknowledgeUserAgent)
	}
	// Invalid IP is dropped
	k2 := &PipCheckin{}
	k2.SetAcknowledge("not-an-ip", "Firefox")
	if k2.AcknowledgeIP != nil {
		t.Errorf("expected invalid IP dropped, got %v", *k2.AcknowledgeIP)
	}
}

func TestPipCheckin_Validate(t *testing.T) {
	k := &PipCheckin{
		TenantID:   uuid.New(),
		CaseID:     uuid.New(),
		WeekNumber: 4,
		OnTrack:    PipTrackOn,
		CreatedBy:  uuid.New(),
	}
	k.ApplyDefaults()
	if err := k.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}

	bad := *k
	bad.WeekNumber = 100
	if err := bad.Validate(); err == nil {
		t.Errorf("week>52 must fail")
	}
	bad2 := *k
	bad2.OnTrack = "sideways"
	if err := bad2.Validate(); err == nil {
		t.Errorf("invalid on_track must fail")
	}
}

func TestPipOutcome_ValidateTerminatedRequiresFile(t *testing.T) {
	o := &PipOutcome{
		TenantID: uuid.New(),
		CaseID:   uuid.New(),
		Result:   PipOutcomeTerminated,
		ClosedBy: uuid.New(),
	}
	o.ApplyDefaults()
	err := o.Validate()
	ve, _ := o.Validate().(*ValidationError)
	if err == nil {
		t.Errorf("expected error")
	}
	if ve == nil || ve.Fields["legal_file_url"] == "" {
		t.Errorf("expected legal_file_url error, got %v", err)
	}
	// With file it passes.
	url := "https://doc/123.pdf"
	o.LegalFileURL = &url
	if err := o.Validate(); err != nil {
		t.Errorf("expected valid, got %v", err)
	}
}

func TestPipOutcome_ValidatePassedDoesNotRequireFile(t *testing.T) {
	o := &PipOutcome{
		TenantID: uuid.New(),
		CaseID:   uuid.New(),
		Result:   PipOutcomePassed,
		ClosedBy: uuid.New(),
	}
	o.ApplyDefaults()
	if err := o.Validate(); err != nil {
		t.Errorf("expected valid passed, got %v", err)
	}
}

func TestIsValidDuration(t *testing.T) {
	for _, d := range []int{30, 60, 90} {
		if !IsValidDuration(d) {
			t.Errorf("%d must be valid", d)
		}
	}
	for _, d := range []int{0, 29, 45, 91, 120} {
		if IsValidDuration(d) {
			t.Errorf("%d must be invalid", d)
		}
	}
}
