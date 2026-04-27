package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestCareerEvent_Validate(t *testing.T) {
	eff := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	good := &CareerEvent{
		TenantID:      uuid.New(),
		EmployeeID:    uuid.New(),
		EventType:     CareerPromotion,
		EffectiveDate: eff,
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	bad := &CareerEvent{}
	if err := bad.Validate(); err == nil {
		t.Fatal("expected validation error")
	}
	badType := &CareerEvent{EmployeeID: uuid.New(), EventType: "invalid", EffectiveDate: eff}
	err := badType.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["event_type"] != "invalid" {
		t.Errorf("expected event_type invalid, got %v", err)
	}
}

func TestCompensationRecord_Validate(t *testing.T) {
	good := &CompensationRecord{
		TenantID:         uuid.New(),
		EmployeeID:       uuid.New(),
		EffectiveDate:    time.Now(),
		CompensationType: CompBaseSalary,
		Amount:           50000,
		Frequency:        FreqMonthly,
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	negative := *good
	negative.Amount = -1
	err := negative.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["amount"] != "must_be_positive" {
		t.Errorf("expected negative amount error, got %v", err)
	}
}

func TestEmployeePosition_Validate(t *testing.T) {
	good := &EmployeePosition{
		TenantID:      uuid.New(),
		EmployeeID:    uuid.New(),
		PositionID:    uuid.New(),
		FTEPercentage: 50,
		StartDate:     time.Now(),
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	end := good.StartDate.AddDate(0, 0, -5)
	bad := *good
	bad.EndDate = &end
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["end_date"] != "must_be_after_start" {
		t.Errorf("expected end_date error, got %v", err)
	}
	oob := *good
	oob.FTEPercentage = 120
	err = oob.Validate()
	ve, _ = err.(*ValidationError)
	if ve == nil || ve.Fields["fte_percentage"] != "must_be_0_to_100" {
		t.Errorf("expected fte OOB error, got %v", err)
	}
}

func TestOffboardingEvent_Validate(t *testing.T) {
	notice := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	last := notice.AddDate(0, 0, 30)
	good := &OffboardingEvent{
		TenantID:       uuid.New(),
		EmployeeID:     uuid.New(),
		DepartureType:  DepResignation,
		NoticeDate:     notice,
		LastWorkingDay: last,
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	bad := *good
	bad.LastWorkingDay = notice.AddDate(0, 0, -1)
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["last_working_day"] != "must_be_after_notice" {
		t.Errorf("expected last_working_day error, got %v", err)
	}
}

func TestExitInterview_Validate(t *testing.T) {
	score := 3
	good := &ExitInterview{OffboardingID: uuid.New(), SatisfactionScore: &score}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	outOf := 9
	bad := &ExitInterview{OffboardingID: uuid.New(), SatisfactionScore: &outOf}
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["satisfaction_score"] != "must_be_1_to_5" {
		t.Errorf("expected score error, got %v", err)
	}
}

func TestRelatedContact_Validate(t *testing.T) {
	good := &RelatedContact{
		TenantID:   uuid.New(),
		EmployeeID: uuid.New(),
		Kind:       ContactKindFamily,
		FullName:   "Mehmet Yılmaz",
		Relation:   "baba",
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	bad := &RelatedContact{EmployeeID: uuid.New(), Kind: "bogus"}
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatal("expected validation error")
	}
	if ve.Fields["full_name"] != "required" ||
		ve.Fields["relation"] != "required" ||
		ve.Fields["kind"] != "invalid" {
		t.Errorf("missing expected fields: %v", ve.Fields)
	}
}
