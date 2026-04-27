package bordro

import "testing"

func TestApplyDeductions_Empty(t *testing.T) {
	total, lines, net := ApplyDeductions(20000, nil)
	if total != 0 || len(lines) != 0 || net != 20000 {
		t.Errorf("empty dilution failed: total=%v lines=%d net=%v", total, len(lines), net)
	}
}

func TestApplyDeductions_NafakaFirst(t *testing.T) {
	items := []DeductionInput{
		{Kind: DeductionAdvance, Label: "avans", MonthlyLimit: 1000},
		{Kind: DeductionNafaka, Label: "nafaka", MonthlyLimit: 3000},
	}
	total, lines, net := ApplyDeductions(20000, items)
	if total != 4000 {
		t.Errorf("total = %v, want 4000", total)
	}
	if net != 16000 {
		t.Errorf("net = %v, want 16000", net)
	}
	if lines[0].Kind != DeductionNafaka {
		t.Errorf("nafaka should be applied first, got %v", lines[0].Kind)
	}
}

func TestApplyDeductions_IcraCap25(t *testing.T) {
	// net 20000, icra 8000 requested → cap'a takılır: 20000*0.25 = 5000.
	items := []DeductionInput{
		{Kind: DeductionIcra, Label: "icra1", MonthlyLimit: 8000},
	}
	total, lines, net := ApplyDeductions(20000, items)
	if total != 5000 {
		t.Errorf("icra cap: total = %v, want 5000", total)
	}
	if net != 15000 {
		t.Errorf("net = %v, want 15000", net)
	}
	if lines[0].AmountApplied != 5000 {
		t.Errorf("applied = %v, want 5000", lines[0].AmountApplied)
	}
}

func TestApplyDeductions_MultipleIcraShareCap(t *testing.T) {
	// net 10000, iki icra 3000'er → ikisi de düşmeli (toplam 6000 > cap 2500).
	// cap = 2500; ilk icra 2500, ikinci 0.
	items := []DeductionInput{
		{Kind: DeductionIcra, Label: "icra1", MonthlyLimit: 3000},
		{Kind: DeductionIcra, Label: "icra2", MonthlyLimit: 3000, Priority: 11},
	}
	total, _, net := ApplyDeductions(10000, items)
	if total != 2500 {
		t.Errorf("icra shared cap: total = %v, want 2500", total)
	}
	if net != 7500 {
		t.Errorf("net = %v, want 7500", net)
	}
}

func TestApplyDeductions_RemainingLimitsAdvance(t *testing.T) {
	// Avans 1500 aylık ama remaining (bakiye) 800 → 800 düşer.
	items := []DeductionInput{
		{Kind: DeductionAdvance, Label: "avans", MonthlyLimit: 1500, Remaining: 800},
	}
	total, _, _ := ApplyDeductions(20000, items)
	if total != 800 {
		t.Errorf("remaining cap: total = %v, want 800", total)
	}
}

func TestApplyDeductions_PreserveNonNegativeNet(t *testing.T) {
	// Toplam istekler net'i aşıyor — net sıfırda kalır.
	items := []DeductionInput{
		{Kind: DeductionNafaka, Label: "nafaka", MonthlyLimit: 10000},
		{Kind: DeductionAdvance, Label: "avans", MonthlyLimit: 5000},
	}
	total, _, net := ApplyDeductions(8000, items)
	if net < 0 {
		t.Errorf("net went negative: %v", net)
	}
	if total > 8000 {
		t.Errorf("total > net base: %v", total)
	}
}

func TestKindPriority_DefaultOrder(t *testing.T) {
	ps := []DeductionKind{
		DeductionNafaka, DeductionIcra, DeductionSendikaAidati,
		DeductionSaglikSigorta, DeductionAdvance, DeductionKredi, DeductionOzel,
	}
	prev := -1
	for _, k := range ps {
		p := kindPriority(k, 0)
		if p < prev {
			t.Errorf("kind priorities out of order: %v priority %d < prev %d", k, p, prev)
		}
		prev = p
	}
}
