package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPerformanceCycle_AdvanceStatus(t *testing.T) {
	c := &PerformanceCycle{Status: CycleStatusPlanning}
	expected := []CycleStatus{
		CycleStatusGoalSetting, CycleStatusActive, CycleStatusInReview,
		CycleStatusCalibration, CycleStatusClosed, CycleStatusArchived,
		CycleStatusArchived, // idempotent at the end
	}
	for _, want := range expected {
		c.Status = c.AdvanceStatus()
		if c.Status != want {
			t.Fatalf("got %s want %s", c.Status, want)
		}
	}
}

func TestPerformanceCycle_Validate(t *testing.T) {
	good := &PerformanceCycle{
		TenantID:    uuid.New(),
		NameTR:      "2026 Q2",
		CycleType:   CycleQuarterly,
		PeriodStart: time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		PeriodEnd:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	bad := *good
	bad.PeriodEnd = good.PeriodStart.AddDate(0, 0, -1)
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["period_end"] != "must_be_after_start" {
		t.Errorf("expected period_end error, got %v", err)
	}
}

func TestPerformanceGoal_ComputeProgress(t *testing.T) {
	target := 100.0
	g := &PerformanceGoal{
		MetricType:   MetricNumeric,
		TargetValue:  &target,
		CurrentValue: 40,
	}
	if got := g.ComputeProgress(); got != 40 {
		t.Errorf("got %d want 40", got)
	}
	g.CurrentValue = 150
	if got := g.ComputeProgress(); got != 100 {
		t.Errorf("clamp high: got %d want 100", got)
	}
	g.CurrentValue = -5
	if got := g.ComputeProgress(); got != 0 {
		t.Errorf("clamp low: got %d want 0", got)
	}
}

func TestOKRKeyResult_ComputeProgress(t *testing.T) {
	k := &OKRKeyResult{StartValue: 20, TargetValue: 100, CurrentValue: 60}
	if got := k.ComputeProgress(); got != 50 {
		t.Errorf("got %d want 50", got)
	}
	k.CurrentValue = 120
	if got := k.ComputeProgress(); got != 100 {
		t.Errorf("clamp high: got %d want 100", got)
	}
	k.CurrentValue = 10
	if got := k.ComputeProgress(); got != 0 {
		t.Errorf("clamp low: got %d want 0", got)
	}
}

func TestOKR_ComputeProgressFromKRs(t *testing.T) {
	o := &OKR{}
	if got := o.ComputeProgressFromKRs(); got != 0 {
		t.Errorf("empty: got %d", got)
	}
	o.KeyResults = []OKRKeyResult{{ProgressPct: 20}, {ProgressPct: 60}, {ProgressPct: 100}}
	if got := o.ComputeProgressFromKRs(); got != 60 {
		t.Errorf("avg: got %d want 60", got)
	}
}

func TestSegmentFromBands(t *testing.T) {
	cases := []struct {
		perf, pot Band
		want      TalentSegment
	}{
		{BandHigh, BandHigh, SegStar},
		{BandHigh, BandMedium, SegHighPerformer},
		{BandHigh, BandLow, SegSolidPerformer},
		{BandMedium, BandHigh, SegHighPotential},
		{BandMedium, BandMedium, SegCorePlayer},
		{BandMedium, BandLow, SegReliableContributor},
		{BandLow, BandHigh, SegDilemma},
		{BandLow, BandMedium, SegInconsistentPlayer},
		{BandLow, BandLow, SegUnderperformer},
	}
	for _, c := range cases {
		if got := SegmentFromBands(c.perf, c.pot); got != c.want {
			t.Errorf("%s/%s: got %s want %s", c.perf, c.pot, got, c.want)
		}
	}
}

func TestBandFromRating(t *testing.T) {
	cases := []struct {
		rating float64
		want   Band
	}{
		{1.0, BandLow},
		{2.49, BandLow},
		{2.5, BandMedium},
		{3.9, BandMedium},
		{4.0, BandHigh},
		{5.0, BandHigh},
	}
	for _, c := range cases {
		if got := BandFromRating(c.rating); got != c.want {
			t.Errorf("rating=%v got %s want %s", c.rating, got, c.want)
		}
	}
}

func TestNineBoxAssignment_ApplyDefaults(t *testing.T) {
	a := &NineBoxAssignment{
		PerformanceBand: BandHigh,
		PotentialBand:   BandHigh,
	}
	a.ApplyDefaults()
	if a.TalentSegment == nil || *a.TalentSegment != SegStar {
		t.Errorf("expected star, got %v", a.TalentSegment)
	}
	if a.BoxLabel != "Yıldız" {
		t.Errorf("expected Yıldız, got %q", a.BoxLabel)
	}
}

func TestPerformanceReview_CanTransitionTo(t *testing.T) {
	r := &PerformanceReview{Status: ReviewDraft}
	if !r.CanTransitionTo(ReviewSubmitted) {
		t.Error("draft->submitted should allow")
	}
	if r.CanTransitionTo(ReviewFinal) {
		t.Error("draft->final should be blocked")
	}
	r.Status = ReviewSubmitted
	if !r.CanTransitionTo(ReviewAcknowledged) {
		t.Error("submitted->acknowledged should allow")
	}
	r.Status = ReviewFinal
	if r.CanTransitionTo(ReviewDraft) {
		t.Error("final->draft should be blocked")
	}
}

func TestPerformanceReview_Validate(t *testing.T) {
	rating := 4.5
	good := &PerformanceReview{
		TenantID:          uuid.New(),
		CycleID:           uuid.New(),
		EmployeeID:        uuid.New(),
		ReviewerID:        uuid.New(),
		ReviewType:        ReviewManager,
		PerformanceRating: &rating,
	}
	good.ApplyDefaults()
	if err := good.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}
	bad := *good
	high := 6.0
	bad.PerformanceRating = &high
	err := bad.Validate()
	ve, _ := err.(*ValidationError)
	if ve == nil || ve.Fields["performance_rating"] != "must_be_1_to_5" {
		t.Errorf("expected rating error, got %v", err)
	}
}
