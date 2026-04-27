package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPeriod_Validate_EndBeforeStart(t *testing.T) {
	p := &Period{
		TenantID:    uuid.New(),
		PeriodYear:  2026,
		PeriodMonth: 5,
		Status:      PeriodOpen,
		StartDate:   time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		EndDate:     time.Date(2026, 4, 30, 0, 0, 0, 0, time.UTC), // mayıs başı, nisan sonu — ters
	}
	err := p.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("expected validation error for end<start, got %v", err)
	}
	if _, ok := ve.Fields["end_date"]; !ok {
		t.Errorf("want end_date field, got %v", ve.Fields)
	}
}

func TestPeriod_ApplyDefaults_LeapYearFebruary(t *testing.T) {
	// 2028 artık yıl — Şubat 29 gün çekmeli.
	p := &Period{TenantID: uuid.New(), PeriodYear: 2028, PeriodMonth: 2}
	p.ApplyDefaults()
	if p.EndDate.Day() != 29 {
		t.Errorf("2028 Şubat end_date gün: want 29, got %d", p.EndDate.Day())
	}
}

func TestPeriod_ApplyDefaults_IdempotentWhenSet(t *testing.T) {
	custom := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	p := &Period{
		TenantID: uuid.New(), PeriodYear: 2026, PeriodMonth: 6,
		PayDate: custom,
	}
	p.ApplyDefaults()
	if !p.PayDate.Equal(custom) {
		t.Errorf("PayDate override edilmemeli: got %v, want %v", p.PayDate, custom)
	}
}

func TestRunType_IsValid(t *testing.T) {
	for _, rt := range []RunType{RunRegular, RunBonus, RunIkramiye, RunOffCycle, RunCorrection} {
		if !rt.IsValid() {
			t.Errorf("%s should be valid", rt)
		}
	}
	if RunType("garbage").IsValid() {
		t.Errorf("garbage type must not be valid")
	}
}

func TestRunStatus_IsValid(t *testing.T) {
	for _, s := range []RunStatus{RunPreview, RunCalculated, RunApproved, RunFinalised, RunVoided} {
		if !s.IsValid() {
			t.Errorf("%s should be valid", s)
		}
	}
	if RunStatus("xxx").IsValid() {
		t.Errorf("bogus status must not be valid")
	}
}

func TestRun_CanTransitionTo_TerminalStates(t *testing.T) {
	// Finalised ve Voided son durumlardır — nereye transition etmeye çalışsan reddet.
	for _, final := range []RunStatus{RunFinalised, RunVoided} {
		r := &Run{Status: final}
		for _, target := range []RunStatus{RunPreview, RunCalculated, RunApproved, RunFinalised, RunVoided} {
			if r.CanTransitionTo(target) {
				t.Errorf("%s → %s should be disallowed (terminal)", final, target)
			}
		}
	}
}

func TestPeriodStatus_NonOpenNotEditable(t *testing.T) {
	for _, s := range []PeriodStatus{PeriodLocked, PeriodFinalised, PeriodClosed, PeriodStatus("bogus")} {
		if s.IsEditable() {
			t.Errorf("%s must not be editable", s)
		}
	}
}

func TestSlipInput_NegativeWorkedDays(t *testing.T) {
	s := SlipInput{
		EmployeeID:      uuid.New(),
		BaseSalaryGross: 30_000,
		WorkedDays:      -5,
	}
	err := s.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("expected validation error, got %v", err)
	}
	if _, ok := ve.Fields["worked_days"]; !ok {
		t.Errorf("want worked_days field, got %v", ve.Fields)
	}
}
