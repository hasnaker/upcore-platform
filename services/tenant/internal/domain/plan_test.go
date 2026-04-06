package domain

import "testing"

func TestPlanHasModule(t *testing.T) {
	p := &Plan{Features: PlanFeatures{Modules: []string{"core_hris", "assessment"}}}
	if !p.HasModule("core_hris") {
		t.Fatal("expected core_hris")
	}
	if p.HasModule("burnout") {
		t.Fatal("did not expect burnout")
	}

	all := &Plan{Features: PlanFeatures{Modules: []string{"all"}}}
	if !all.HasModule("anything") {
		t.Fatal("expected all to match anything")
	}
}

func TestPlanCanAddSeats(t *testing.T) {
	cap := 100
	p := &Plan{Features: PlanFeatures{MaxEmployees: &cap}}
	if !p.CanAddSeats(50) {
		t.Fatal("50 should fit in 100")
	}
	if !p.CanAddSeats(100) {
		t.Fatal("100 should fit in 100")
	}
	if p.CanAddSeats(101) {
		t.Fatal("101 should exceed 100")
	}

	unlimited := &Plan{Features: PlanFeatures{MaxEmployees: nil}}
	if !unlimited.CanAddSeats(9999) {
		t.Fatal("unlimited plan should accept any seats")
	}
}

func TestPlanSeatCap(t *testing.T) {
	cap := 50
	p := &Plan{Features: PlanFeatures{MaxEmployees: &cap}}
	if p.SeatCap() != 50 {
		t.Fatalf("SeatCap=%d want 50", p.SeatCap())
	}
	unlimited := &Plan{Features: PlanFeatures{MaxEmployees: nil}}
	if unlimited.SeatCap() != 0 {
		t.Fatalf("unlimited SeatCap=%d want 0", unlimited.SeatCap())
	}
}
