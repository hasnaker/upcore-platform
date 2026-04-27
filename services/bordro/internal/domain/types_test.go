package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPeriod_ApplyDefaults(t *testing.T) {
	p := &Period{TenantID: uuid.New(), PeriodYear: 2026, PeriodMonth: 4}
	p.ApplyDefaults()
	if p.Status != PeriodOpen {
		t.Errorf("status default: got %s want open", p.Status)
	}
	wantStart := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	if !p.StartDate.Equal(wantStart) {
		t.Errorf("start_date: got %v want %v", p.StartDate, wantStart)
	}
	if p.EndDate.Day() != 30 || p.EndDate.Month() != 4 {
		t.Errorf("end_date: got %v", p.EndDate)
	}
	if !p.PayDate.Equal(p.EndDate) {
		t.Errorf("pay_date default should equal end_date")
	}
}

func TestPeriod_Validate(t *testing.T) {
	cases := []struct {
		name    string
		p       *Period
		wantBad string
	}{
		{"ok", &Period{TenantID: uuid.New(), PeriodYear: 2026, PeriodMonth: 6, Status: PeriodOpen}, ""},
		{"bad_year", &Period{PeriodYear: 1999, PeriodMonth: 1, Status: PeriodOpen}, "period_year"},
		{"bad_month", &Period{PeriodYear: 2026, PeriodMonth: 13, Status: PeriodOpen}, "period_month"},
		{"bad_status", &Period{PeriodYear: 2026, PeriodMonth: 1, Status: "bogus"}, "status"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.p.Validate()
			if c.wantBad == "" {
				if err != nil {
					t.Errorf("expected valid, got %v", err)
				}
				return
			}
			ve, _ := err.(*ValidationError)
			if ve == nil {
				t.Fatalf("expected ValidationError, got %v", err)
			}
			if _, ok := ve.Fields[c.wantBad]; !ok {
				t.Errorf("want field %q, have %v", c.wantBad, ve.Fields)
			}
		})
	}
}

func TestRun_CanTransitionTo(t *testing.T) {
	cases := []struct {
		from, to RunStatus
		want     bool
	}{
		{RunPreview, RunCalculated, true},
		{RunPreview, RunApproved, false},
		{RunCalculated, RunApproved, true},
		{RunCalculated, RunPreview, true}, // re-run
		{RunApproved, RunFinalised, true},
		{RunApproved, RunCalculated, false},
		{RunFinalised, RunApproved, false},
		{RunVoided, RunApproved, false},
	}
	for _, c := range cases {
		r := &Run{Status: c.from}
		if got := r.CanTransitionTo(c.to); got != c.want {
			t.Errorf("%s->%s got %v want %v", c.from, c.to, got, c.want)
		}
	}
}

func TestSlipInput_Validate(t *testing.T) {
	good := SlipInput{EmployeeID: uuid.New(), BaseSalaryGross: 30_000, WorkedDays: 30}
	if err := good.Validate(); err != nil {
		t.Errorf("expected valid, got %v", err)
	}
	bad := SlipInput{BaseSalaryGross: -10}
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatal("expected validation error")
	}
	if _, ok := ve.Fields["employee_id"]; !ok {
		t.Error("want employee_id required")
	}
	if _, ok := ve.Fields["base_salary_gross"]; !ok {
		t.Error("want base_salary must_be_positive")
	}
}

func TestPeriodStatus_IsEditable(t *testing.T) {
	if !PeriodOpen.IsEditable() {
		t.Error("open should be editable")
	}
	for _, s := range []PeriodStatus{PeriodLocked, PeriodFinalised, PeriodClosed} {
		if s.IsEditable() {
			t.Errorf("%s should be non-editable", s)
		}
	}
}
