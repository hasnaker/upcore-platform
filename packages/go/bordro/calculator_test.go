package bordro

import (
	"math"
	"testing"
)

var _ = math.Abs // silence unused in case of refactors

func approx(t *testing.T, got, want, tol float64, name string) {
	t.Helper()
	if math.Abs(got-want) > tol {
		t.Errorf("%s: got %v, want %v (tol %v)", name, got, want, tol)
	}
}

func TestCalculate_BaseSalary_FirstMonth_2026(t *testing.T) {
	// Brüt 30.000 TL, ilk ay, asgari ücret üstü, AGİ yok.
	s := Slip{GrossBase: 30_000, Year: 2026}
	r := Calculate(s)

	// SGK çalışan 30000 * 14% = 4200
	approx(t, r.SGKEmployee, 4200, 0.01, "sgk_emp")
	// İşsizlik çalışan 30000 * 1% = 300
	approx(t, r.UnemploymentEmp, 300, 0.01, "unemp_emp")
	// Gelir vergisi matrahı 30000 - 4200 - 300 = 25500
	approx(t, r.IncomeTaxBase, 25_500, 0.01, "tax_base")
	// İlk ay tamamı ilk dilimde (158k üstü değil) → 25500 * 15% = 3825
	approx(t, r.IncomeTax, 3_825, 0.01, "income_tax")
	// Damga 30000 * 0.00759 = 227.70
	approx(t, r.StampTax, 227.70, 0.01, "stamp")
	// Net 30000 - (4200+300+3825+227.70) = 21447.30
	approx(t, r.NetPay, 21_447.30, 0.01, "net")
	// İşveren SGK 20.75% = 6225
	approx(t, r.SGKEmployer, 6225, 0.01, "sgk_empr")
}

func TestCalculate_CumulativeCrossesBracket(t *testing.T) {
	// Kümülatif 150k, bu ay brüt 50k.
	// SGK 14%=7000, işsizlik 1%=500, matrah 50000-7000-500=42500
	// Brackets: 150k→158k = 8000 @ 15% = 1200
	//           158k→192500 = 34500 @ 20% = 6900
	// Toplam vergi = 8100
	r := Calculate(Slip{
		GrossBase:         50_000,
		CumulativeTaxBase: 150_000,
		Year:              2026,
	})
	approx(t, r.IncomeTaxBase, 42_500, 0.01, "tax_base")
	approx(t, r.IncomeTax, 8_100, 0.5, "bracket_crossing")
	approx(t, r.CumulativeTaxBaseAfter, 192_500, 0.01, "cumulative_after")
}

func TestKidemTazminati(t *testing.T) {
	// 5 yıl tam kıdem, aylık giydirilmiş brüt 40k, tavan yok.
	got := KidemTazminati(40_000, 5, 0, 0)
	approx(t, got, 200_000, 0.01, "5y_no_cap")
	// Tavan uygulanırsa 30k/yıl tavanı → 5 yıl = 150k.
	got = KidemTazminati(40_000, 5, 0, 30_000)
	approx(t, got, 150_000, 0.01, "5y_with_cap")
	// Artık günler
	got = KidemTazminati(36_500, 3, 73, 0)
	// 36500 * 3 + 36500 * 73/365 = 109500 + 7300 = 116800
	approx(t, got, 116_800, 0.01, "with_extra_days")
}

func TestIhbarTazminati(t *testing.T) {
	cases := []struct {
		tenureMonths float64
		days         float64
	}{
		{3, 14},
		{8, 28},
		{24, 42},
		{50, 56},
	}
	for _, c := range cases {
		got := IhbarTazminati(30_000, c.tenureMonths)
		want := 30_000 / 30.0 * c.days
		approx(t, got, want, 0.01, "ihbar")
	}
}

func TestSGKRates_MaxBaseClamp(t *testing.T) {
	// Brüt 300k, SGK matrahı 198720 tavanında olmalı.
	r := Calculate(Slip{GrossBase: 300_000, Year: 2026})
	// SGK çalışan = 198720 * 14% = 27820.80
	approx(t, r.SGKEmployee, 27_820.80, 0.01, "sgk_cap")
}

func TestProgressiveTax_ZeroChunk(t *testing.T) {
	got := progressiveTax(1000, 0, Brackets2026())
	if got != 0 {
		t.Errorf("zero chunk: got %v", got)
	}
}

func TestCalculate_MinWageExemption_ZerosOutLowestEarners(t *testing.T) {
	// Asgari ücret çalışanı: istisna uygulanınca gelir + damga sıfır olmalı.
	r := Calculate(Slip{
		GrossBase:             MinimumWage(2026),
		Year:                  2026,
		ApplyMinWageExemption: true,
	})
	if r.IncomeTax != 0 {
		t.Errorf("asgari ücret gelir vergisi 0 olmalı, got %v", r.IncomeTax)
	}
	if r.StampTax != 0 {
		t.Errorf("asgari ücret damga vergisi 0 olmalı, got %v", r.StampTax)
	}
	if r.IncomeTaxExemption <= 0 {
		t.Errorf("istisna tutarı > 0 olmalı, got %v", r.IncomeTaxExemption)
	}
	// Net = brüt - SGK(14%) - işsizlik(1%) — vergi yok.
	wage := MinimumWage(2026)
	expectedNet := wage - wage*0.14 - wage*0.01
	if math.Abs(r.NetPay-expectedNet) > 0.5 {
		t.Errorf("net = %v, want %v", r.NetPay, expectedNet)
	}
}

func TestCalculate_MinWageExemption_ReducesHigherEarners(t *testing.T) {
	// Yüksek maaşlı çalışan: istisna eksilir ama tam sıfırlanmaz.
	without := Calculate(Slip{
		GrossBase: 100_000,
		Year:      2026,
	})
	with := Calculate(Slip{
		GrossBase:             100_000,
		Year:                  2026,
		ApplyMinWageExemption: true,
	})
	if with.IncomeTax >= without.IncomeTax {
		t.Errorf("istisna sonrası vergi daha düşük olmalı: with=%v without=%v",
			with.IncomeTax, without.IncomeTax)
	}
	if with.NetPay <= without.NetPay {
		t.Errorf("istisna sonrası net daha yüksek olmalı: with=%v without=%v",
			with.NetPay, without.NetPay)
	}
	// Tasarruf tam olarak asgari ücret istisnası kadar olmalı.
	savedIncome := without.IncomeTax - with.IncomeTax
	savedStamp := without.StampTax - with.StampTax
	expectedIncome, expectedStamp := MinWageTaxExemption(2026, DefaultSGKRates())
	if math.Abs(savedIncome-expectedIncome) > 0.5 {
		t.Errorf("gelir vergisi tasarrufu = %v, want %v", savedIncome, expectedIncome)
	}
	if math.Abs(savedStamp-expectedStamp) > 0.5 {
		t.Errorf("damga vergisi tasarrufu = %v, want %v", savedStamp, expectedStamp)
	}
}

func TestCalculate_BackwardsCompat_NoExemption(t *testing.T) {
	// ApplyMinWageExemption=false (default) → eski davranış korunur.
	r := Calculate(Slip{GrossBase: 30_000, Year: 2026})
	if r.IncomeTaxExemption != 0 {
		t.Errorf("flag kapalıyken istisna 0 olmalı, got %v", r.IncomeTaxExemption)
	}
	// İlk ay baseline — önceki testteki 3825 değerini korumalı.
	approx(t, r.IncomeTax, 3825, 0.5, "no exemption income_tax")
}
