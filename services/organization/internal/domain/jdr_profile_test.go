package domain

import "testing"

func TestJDRDemandsValidate(t *testing.T) {
	d := JDRDemands{Workload: 8, Emotional: 5, Cognitive: 6, TimePressure: 7, RoleConflict: 3, RoleAmbiguity: 4}
	if err := d.Validate(); err != nil {
		t.Fatalf("valid demands: %v", err)
	}
	bad := JDRDemands{Workload: 11}
	if err := bad.Validate(); err == nil {
		t.Fatal("expected invalid score")
	}
	bad2 := JDRDemands{Cognitive: -1}
	if err := bad2.Validate(); err == nil {
		t.Fatal("expected negative score to fail")
	}
}

func TestJDRResourcesValidate(t *testing.T) {
	r := JDRResources{Autonomy: 8, Feedback: 7, SocialSupport: 6, Growth: 9, SkillVariety: 5, TaskSignificance: 8}
	if err := r.Validate(); err != nil {
		t.Fatalf("valid: %v", err)
	}
	bad := JDRResources{Autonomy: 20}
	if err := bad.Validate(); err == nil {
		t.Fatal("expected invalid")
	}
}

func TestBurnoutRiskProxy(t *testing.T) {
	p := JDRProfile{
		Demands:   JDRDemands{Workload: 10, Emotional: 10, Cognitive: 10, TimePressure: 10, RoleConflict: 10, RoleAmbiguity: 10},
		Resources: JDRResources{Autonomy: 2, Feedback: 2, SocialSupport: 2, Growth: 2, SkillVariety: 2, TaskSignificance: 2},
	}
	risk := p.BurnoutRiskProxy()
	if risk <= 1.0 {
		t.Fatalf("expected high risk, got %f", risk)
	}
	// Balanced profile ~ 1.0
	balanced := JDRProfile{
		Demands:   JDRDemands{Workload: 5, Emotional: 5, Cognitive: 5, TimePressure: 5, RoleConflict: 5, RoleAmbiguity: 5},
		Resources: JDRResources{Autonomy: 5, Feedback: 5, SocialSupport: 5, Growth: 5, SkillVariety: 5, TaskSignificance: 5},
	}
	if got := balanced.BurnoutRiskProxy(); got < 0.99 || got > 1.01 {
		t.Fatalf("expected ~1.0, got %f", got)
	}
	// Zero resources -> 0 (avoid divide)
	empty := JDRProfile{}
	if got := empty.BurnoutRiskProxy(); got != 0 {
		t.Fatalf("expected 0 for empty profile, got %f", got)
	}
}

func TestDemandAndResourceScoresIgnoreZero(t *testing.T) {
	d := JDRDemands{Workload: 8, Emotional: 0, Cognitive: 6}
	// avg of (8, 6) = 7
	if got := d.DemandScore(); got != 7.0 {
		t.Fatalf("avg=%f", got)
	}
	r := JDRResources{}
	if r.ResourceScore() != 0 {
		t.Fatal("empty avg should be 0")
	}
}
