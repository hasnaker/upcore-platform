package bordro

import (
	"testing"
)

func TestApplyTesvik_NoIncentives(t *testing.T) {
	got, disc := ApplyTesvik(1000, nil)
	if got != 1000 || disc != 0 {
		t.Fatalf("no tesvik: want 1000/0, got %v/%v", got, disc)
	}
}

func TestApplyTesvik_ZeroOrNegativeInput(t *testing.T) {
	got, disc := ApplyTesvik(0, DefaultTesvikler())
	if got != 0 || disc != 0 {
		t.Fatalf("zero SGK base: want 0/0, got %v/%v", got, disc)
	}
	got, disc = ApplyTesvik(-50, DefaultTesvikler())
	if got != -50 || disc != 0 {
		t.Fatalf("negative SGK base must pass-through, got %v/%v", got, disc)
	}
}

func TestApplyTesvik_5510Genel_FivePercent(t *testing.T) {
	// 5510/81 genel teşvik işveren SGK priminden %5.
	// 20.000 TL prim → 1.000 TL indirim, 19.000 TL ödeme.
	got, disc := ApplyTesvik(20000, []Tesvik{
		{Code: Tesvik5510Genel, EmployerShareCut: 0.05},
	})
	if disc != 1000 {
		t.Fatalf("discount: want 1000, got %v", disc)
	}
	if got != 19000 {
		t.Fatalf("actual: want 19000, got %v", got)
	}
}

func TestApplyTesvik_6111_FullWaiver(t *testing.T) {
	// 6111 ilave istihdam: işveren SGK primi 1.0 (tamamı).
	got, disc := ApplyTesvik(15000, []Tesvik{
		{Code: Tesvik6111, EmployerShareCut: 1.0},
	})
	if disc != 15000 || got != 0 {
		t.Fatalf("full waiver: want 0/15000, got %v/%v", got, disc)
	}
}

func TestApplyTesvik_Combined_CapAt100Percent(t *testing.T) {
	// 5510 (%5) + 6111 (%100) = %105 — cap %100'e çekilmeli.
	got, disc := ApplyTesvik(10000, []Tesvik{
		{Code: Tesvik5510Genel, EmployerShareCut: 0.05},
		{Code: Tesvik6111, EmployerShareCut: 1.0},
	})
	if disc != 10000 {
		t.Fatalf("capped discount: want 10000, got %v", disc)
	}
	if got != 0 {
		t.Fatalf("remaining: want 0, got %v", got)
	}
}

func TestApplyTesvik_PartialCombined(t *testing.T) {
	// %5 + %50 = %55 indirim
	got, disc := ApplyTesvik(10000, []Tesvik{
		{EmployerShareCut: 0.05},
		{EmployerShareCut: 0.5},
	})
	if disc != 5500 {
		t.Fatalf("partial discount: want 5500, got %v", disc)
	}
	if got != 4500 {
		t.Fatalf("remaining: want 4500, got %v", got)
	}
}

func TestDefaultTesvikler_CatalogHasKnownCodes(t *testing.T) {
	list := DefaultTesvikler()
	byCode := map[TesvikKod]Tesvik{}
	for _, t := range list {
		byCode[t.Code] = t
	}
	mustHave := []TesvikKod{Tesvik5510Genel, Tesvik6111, Tesvik6645Ortak, Tesvik7103, Tesvik4447Q}
	for _, code := range mustHave {
		if _, ok := byCode[code]; !ok {
			t.Errorf("default catalog missing: %s", code)
		}
	}
	// 5510 fixed at 5%
	if byCode[Tesvik5510Genel].EmployerShareCut != 0.05 {
		t.Errorf("5510 genel should be 0.05, got %v", byCode[Tesvik5510Genel].EmployerShareCut)
	}
	// 6111 duration 54 months (kadın/genç/işsiz statü cap)
	if byCode[Tesvik6111].DurationMonths != 54 {
		t.Errorf("6111 duration should be 54, got %d", byCode[Tesvik6111].DurationMonths)
	}
}
