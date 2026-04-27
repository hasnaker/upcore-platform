package bordro

import (
	"testing"
)

// Ek senaryolar — calculator_test.go'daki temel kapsamanın üstüne
// gerçek bordro hesabı için karşılaşılacak kenar durumlar.

func TestCalculate_SGKCap_AppliesWhenGrossAboveCeiling(t *testing.T) {
	// 2026 SGK aylık tavanı 198.720,00 TL. Üstüne çıkan maaş için SGK
	// primi tavana göre kesilir — artan kısım primde sayılmaz.
	// 250.000 TL brüt → SGK matrah = 198.720
	r := Calculate(Slip{GrossBase: 250_000, Year: 2026})

	rates := DefaultSGKRates()
	wantEmp := round2(rates.MaxBaseMonthly * rates.EmployeeSGK / 100.0)
	if r.SGKEmployee != wantEmp {
		t.Errorf("SGK çalışan primi tavan üstü: want %v, got %v", wantEmp, r.SGKEmployee)
	}
	wantEmpr := round2(rates.MaxBaseMonthly * rates.EmployerSGK / 100.0)
	if r.SGKEmployer != wantEmpr {
		t.Errorf("SGK işveren primi tavan üstü: want %v, got %v", wantEmpr, r.SGKEmployer)
	}
}

func TestCalculate_AllowanceExempt_AddedToNet_NotTaxed(t *testing.T) {
	// AllowanceExempt — SGK matrahına girmez, gelir vergisine girmez.
	// NetPay çıktısı, base kesintilerden sonra exempt'ı ekler.
	base := Calculate(Slip{GrossBase: 30_000, Year: 2026})
	withAllow := Calculate(Slip{GrossBase: 30_000, AllowanceExempt: 2_000, Year: 2026})

	// Kesintiler aynı kalmalı.
	if base.TotalDeductions != withAllow.TotalDeductions {
		t.Errorf("exempt allowance SGK/vergiyi değiştirmemeli: %v vs %v",
			base.TotalDeductions, withAllow.TotalDeductions)
	}
	// Net, exempt kadar daha yüksek olmalı.
	diff := round2(withAllow.NetPay - base.NetPay)
	if diff != 2000 {
		t.Errorf("net farkı = exempt allowance; want 2000, got %v", diff)
	}
}

func TestCalculate_AllowanceTaxable_SGKAndTaxApplied(t *testing.T) {
	// AllowanceTaxable SGK ve gelir vergisine tabi.
	base := Calculate(Slip{GrossBase: 30_000, Year: 2026})
	withTax := Calculate(Slip{GrossBase: 30_000, AllowanceTaxable: 2_000, Year: 2026})

	if withTax.TotalDeductions <= base.TotalDeductions {
		t.Errorf("taxable allowance SGK/vergiyi artırmalı: base %v vs with %v",
			base.TotalDeductions, withTax.TotalDeductions)
	}
	if withTax.GrossTotal != base.GrossTotal+2000 {
		t.Errorf("gross = base + 2000, got %v", withTax.GrossTotal)
	}
}

func TestCalculate_Overtime_IncreasesGrossAndTax(t *testing.T) {
	base := Calculate(Slip{GrossBase: 30_000, Year: 2026})
	with := Calculate(Slip{GrossBase: 30_000, OvertimeGross: 5_000, Year: 2026})

	if with.GrossTotal != base.GrossTotal+5000 {
		t.Errorf("overtime gross eklenmeli, got %v vs %v", with.GrossTotal, base.GrossTotal)
	}
	if with.SGKEmployee <= base.SGKEmployee {
		t.Errorf("fazla mesai SGK'yı arttırmalı")
	}
}

func TestCalculate_CumulativePropagation(t *testing.T) {
	// Bir önceki aydan cumulativeTaxBase sonraki aya aktarılmalı.
	jan := Calculate(Slip{GrossBase: 50_000, Year: 2026})
	feb := Calculate(Slip{
		GrossBase:         50_000,
		CumulativeTaxBase: jan.CumulativeTaxBaseAfter,
		Year:              2026,
	})
	// Şubat gelir vergisi, Ocak'a göre genelde daha yüksek olmalı
	// (ikinci dilimlere ilerleyiş nedeniyle) — aynı veya daha yüksek.
	if feb.IncomeTax < jan.IncomeTax {
		t.Errorf("Şubat vergisi Ocak'tan düşük olmamalı (bracket ileri): jan=%v feb=%v",
			jan.IncomeTax, feb.IncomeTax)
	}
	if feb.CumulativeTaxBaseAfter <= jan.CumulativeTaxBaseAfter {
		t.Errorf("cumulativeAfter artmalı")
	}
}

func TestCalculate_ZeroGross_ReturnsZeroResult(t *testing.T) {
	r := Calculate(Slip{GrossBase: 0, Year: 2026})
	if r.NetPay != 0 {
		t.Errorf("zero gross → net 0, got %v", r.NetPay)
	}
	if r.SGKEmployee != 0 || r.IncomeTax != 0 {
		t.Errorf("zero gross → zero deduction, got %+v", r)
	}
}

func TestKidemTazminati_CapAppliedPerYear(t *testing.T) {
	// 2026 yıllık kıdem tavanı ~40.000 TL (örnek). Tavanın üstüne çıkamaz.
	// Per-year cap = 40_000; 5 yıl çalışan 100k brüt → min(brüt, cap) × 5.
	got := KidemTazminati(100_000, 5, 0, 40_000)
	want := 40_000.0 * 5
	if got != want {
		t.Errorf("kıdem tavan altı: want %v, got %v", want, got)
	}

	// Cap'in altında maaş → kendi brütü × süre.
	got2 := KidemTazminati(30_000, 5, 0, 40_000)
	want2 := 30_000.0 * 5
	if got2 != want2 {
		t.Errorf("kıdem normal: want %v, got %v", want2, got2)
	}
}

func TestKidemTazminati_ExtraDaysProRate(t *testing.T) {
	// 3 yıl 180 gün çalışan 30k brüt, cap yok.
	got := KidemTazminati(30_000, 3, 180, 1_000_000)
	// Beklenen: 3*30_000 + (180/365)*30_000 = 90_000 + 14_794.52 ≈ 104_794.52
	want := 30_000.0*3 + (180.0/365.0)*30_000.0
	if absDiff(got, want) > 0.02 {
		t.Errorf("kıdem ekstra gün: want %.2f, got %.2f", want, got)
	}
}

func TestIhbarTazminati_TenureBuckets(t *testing.T) {
	// İş Kanunu 17. madde:
	//   < 6 ay   → 2 hafta = 14 gün
	//   6-18 ay  → 4 hafta = 28 gün
	//   18-36 ay → 6 hafta = 42 gün
	//   36+ ay   → 8 hafta = 56 gün
	// Günlük ücret = aylık brüt / 30 ile hesaplanır.
	monthly := 30_000.0
	daily := monthly / 30.0

	cases := []struct {
		tenureMo float64
		days     float64
		label    string
	}{
		{3, 14, "3 ay (< 6)"},
		{12, 28, "12 ay (6-18)"},
		{24, 42, "24 ay (18-36)"},
		{48, 56, "48 ay (36+)"},
	}
	for _, c := range cases {
		got := IhbarTazminati(monthly, c.tenureMo)
		want := daily * c.days
		if absDiff(got, want) > 0.02 {
			t.Errorf("%s: want %.2f, got %.2f", c.label, want, got)
		}
	}
}

func absDiff(a, b float64) float64 {
	if a > b {
		return a - b
	}
	return b - a
}
