package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// ===========================================================================
// Stage FSM — aday ise alım akışı
// ===========================================================================

func TestStage_IsValid(t *testing.T) {
	ok := []Stage{
		StageApplied, StageScreened, StageAssessed, StageInterviewed,
		StageOffered, StageHired, StageRejected, StageWithdrawn,
	}
	for _, s := range ok {
		if !s.IsValid() {
			t.Errorf("%s should be valid", s)
		}
	}
	if Stage("bogus").IsValid() {
		t.Errorf("bogus stage must not be valid")
	}
}

func TestStage_IsTerminal_NonTerminal(t *testing.T) {
	for _, mid := range []Stage{StageApplied, StageScreened, StageAssessed, StageInterviewed, StageOffered} {
		if mid.IsTerminal() {
			t.Errorf("%s must not be terminal", mid)
		}
	}
}

func TestApplication_Validate(t *testing.T) {
	good := &Application{
		CandidateID:   uuid.New(),
		RequisitionID: uuid.New(),
	}
	if err := good.Validate(); err != nil {
		t.Errorf("valid application rejected: %v", err)
	}

	bad := &Application{} // both uuids zero
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("expected validation error")
	}
	if _, ok := ve.Fields["candidate_id"]; !ok {
		t.Errorf("want candidate_id field")
	}
	if _, ok := ve.Fields["requisition_id"]; !ok {
		t.Errorf("want requisition_id field")
	}
}

func TestApplication_DaysInStage(t *testing.T) {
	a := &Application{StageEnteredAt: time.Now().Add(-72 * time.Hour)}
	if got := a.DaysInStage(); got < 2 || got > 3 {
		t.Errorf("want ~3 days, got %d", got)
	}
	// Future date should not be negative.
	a = &Application{StageEnteredAt: time.Now().Add(24 * time.Hour)}
	if got := a.DaysInStage(); got < 0 {
		t.Errorf("days must clamp to 0, got %d", got)
	}
}

func TestApplication_IsTerminal(t *testing.T) {
	for _, st := range []Stage{StageHired, StageRejected, StageWithdrawn} {
		a := &Application{CurrentStage: st}
		if !a.IsTerminal() {
			t.Errorf("%s app must be terminal", st)
		}
	}
	a := &Application{CurrentStage: StageInterviewed}
	if a.IsTerminal() {
		t.Errorf("interviewed must not be terminal")
	}
}

// ===========================================================================
// Interview FSM
// ===========================================================================

func TestInterviewStatus_IsValid(t *testing.T) {
	for _, s := range []InterviewStatus{InterviewScheduled, InterviewCompleted, InterviewCanceled, InterviewNoShow} {
		if !s.IsValid() {
			t.Errorf("%s valid expected", s)
		}
	}
	if InterviewStatus("").IsValid() {
		t.Errorf("empty status must not be valid")
	}
}

func TestRecommendation_IsValid(t *testing.T) {
	for _, r := range []Recommendation{RecStrongHire, RecHire, RecNoHire, RecStrongNoHire} {
		if !r.IsValid() {
			t.Errorf("%s valid expected", r)
		}
	}
	if Recommendation("maybe").IsValid() {
		t.Errorf("maybe not expected")
	}
}

func TestInterview_Validate_Required(t *testing.T) {
	in := &Interview{} // all zero
	err := in.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("expected validation error")
	}
	for _, field := range []string{"application_id", "round", "scheduled_at", "duration_minutes"} {
		if _, ok := ve.Fields[field]; !ok {
			t.Errorf("missing required field %s in %v", field, ve.Fields)
		}
	}
}

func TestInterview_ApplyDefaults(t *testing.T) {
	in := &Interview{}
	in.ApplyDefaults()
	if in.Status != InterviewScheduled {
		t.Errorf("default status: want scheduled, got %s", in.Status)
	}
	if in.DurationMinutes != 60 {
		t.Errorf("default duration 60, got %d", in.DurationMinutes)
	}
	if in.Round != 1 {
		t.Errorf("default round 1, got %d", in.Round)
	}
}

func TestInterview_IsPast(t *testing.T) {
	// 90 min önce başladı, 60 dk sürüyor → bitti.
	past := &Interview{ScheduledAt: time.Now().Add(-90 * time.Minute), DurationMinutes: 60}
	if !past.IsPast() {
		t.Errorf("finished interview must be past")
	}
	// 10 min önce başladı, 60 dk → hâlâ sürüyor.
	ongoing := &Interview{ScheduledAt: time.Now().Add(-10 * time.Minute), DurationMinutes: 60}
	if ongoing.IsPast() {
		t.Errorf("ongoing interview must not be past")
	}
	// Gelecekteki mülakat.
	future := &Interview{ScheduledAt: time.Now().Add(2 * time.Hour), DurationMinutes: 60}
	if future.IsPast() {
		t.Errorf("future interview must not be past")
	}
}

func TestParseUUIDArray_DropsInvalid(t *testing.T) {
	valid := uuid.New()
	arr := StringArray{valid.String(), "not-a-uuid", "  "}
	out := ParseUUIDArray(arr)
	if len(out) != 1 {
		t.Fatalf("want 1 valid uuid, got %d", len(out))
	}
	if out[0] != valid {
		t.Errorf("parsed uuid mismatch")
	}
}

// ===========================================================================
// Offer FSM
// ===========================================================================

func TestOfferStatus_IsValid(t *testing.T) {
	for _, s := range []OfferStatus{OfferDraft, OfferSent, OfferAccepted, OfferDeclined, OfferExpired, OfferWithdrawn} {
		if !s.IsValid() {
			t.Errorf("%s valid expected", s)
		}
	}
	if OfferStatus("pending").IsValid() {
		t.Errorf("pending must not be valid (not in catalog)")
	}
}

func TestOffer_Validate_AllRequired(t *testing.T) {
	o := &Offer{}
	err := o.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("want validation error")
	}
	for _, f := range []string{"application_id", "salary_try", "start_date", "expiry_date"} {
		if _, ok := ve.Fields[f]; !ok {
			t.Errorf("missing required field %s", f)
		}
	}
}

func TestOffer_Validate_ExpiryBeforeStart(t *testing.T) {
	start := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	expiry := start.Add(-24 * time.Hour)
	o := &Offer{
		ApplicationID: uuid.New(),
		SalaryTRY:     50_000,
		StartDate:     start,
		ExpiryDate:    expiry,
	}
	err := o.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil {
		t.Fatalf("want validation error")
	}
	if _, ok := ve.Fields["expiry_date"]; !ok {
		t.Errorf("want expiry_date field")
	}
}

func TestOffer_IsExpired(t *testing.T) {
	pastO := &Offer{ExpiryDate: time.Now().Add(-time.Hour)}
	if !pastO.IsExpired() {
		t.Errorf("past expiry should be expired")
	}
	futureO := &Offer{ExpiryDate: time.Now().Add(time.Hour)}
	if futureO.IsExpired() {
		t.Errorf("future expiry should not be expired")
	}
}

func TestOffer_CanSend(t *testing.T) {
	if !(&Offer{Status: OfferDraft}).CanSend() {
		t.Errorf("draft must be sendable")
	}
	for _, s := range []OfferStatus{OfferSent, OfferAccepted, OfferDeclined, OfferExpired, OfferWithdrawn} {
		if (&Offer{Status: s}).CanSend() {
			t.Errorf("%s must not be sendable", s)
		}
	}
}

func TestOffer_ApplyDefaults(t *testing.T) {
	o := &Offer{}
	o.ApplyDefaults()
	if o.Status != OfferDraft {
		t.Errorf("default status draft")
	}
	if string(o.Benefits) != "{}" {
		t.Errorf("default benefits jsonb {}, got %s", o.Benefits)
	}
}
