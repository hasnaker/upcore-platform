package bordro

import (
	"testing"
)

func TestCalculateKamu_GIH1Kademe1(t *testing.T) {
	// GİH 1.derece 4.kademe (müdür seviyesi) — tipik örnek.
	in := KamuSalaryInput{
		Gosterge:                 GostergeFor(1, 4),         // 1500
		EkGosterge:               EkGostergeFor("GIH", 1),   // 3600
		KidemYili:                10,
		YanOdemePuani:            1550,
		OzelHizmetTazminatiPct:   130,
		MakamTazminatiGostergesi: 0,
		EsYardimi:                true,
		Cocuk06:                  1,
		Cocuk6Plus:               1,
	}
	coefs := DefaultKamuCoefs2026H1()
	rates := DefaultSGKRates()

	r := CalculateKamu(in, coefs, rates, 2026)

	if r.AylikGostergeAyligi <= 0 {
		t.Errorf("expected positive gösterge aylığı, got %v", r.AylikGostergeAyligi)
	}
	if r.AylikEkGosterge <= 0 {
		t.Errorf("expected positive ek gösterge aylığı, got %v", r.AylikEkGosterge)
	}
	if r.AylikTabanAyligi <= 0 {
		t.Errorf("expected positive taban aylığı, got %v", r.AylikTabanAyligi)
	}
	if r.AileYardimi <= 0 {
		t.Errorf("expected aile yardımı > 0, got %v", r.AileYardimi)
	}
	if r.CocukYardimi <= 0 {
		t.Errorf("expected çocuk yardımı > 0, got %v", r.CocukYardimi)
	}
	if r.NetMaas <= 0 {
		t.Errorf("expected positive net maaş, got %v", r.NetMaas)
	}
	if r.NetMaas >= r.BrutToplam {
		t.Errorf("net (%v) must be < brüt (%v)", r.NetMaas, r.BrutToplam)
	}
	if r.EmekliKesenegi <= 0 {
		t.Errorf("expected emekli keseneği > 0, got %v", r.EmekliKesenegi)
	}
}

func TestCalculateKamu_KidemCap(t *testing.T) {
	// Kıdem aylığı 25 yılda donar — 30 yıl ile 25 yıl aynı kıdem aylığını vermeli.
	coefs := DefaultKamuCoefs2026H1()
	rates := DefaultSGKRates()

	in25 := KamuSalaryInput{Gosterge: 1500, EkGosterge: 3600, KidemYili: 25}
	in30 := in25
	in30.KidemYili = 30

	r25 := CalculateKamu(in25, coefs, rates, 2026)
	r30 := CalculateKamu(in30, coefs, rates, 2026)

	if r25.AylikKidemAyligi != r30.AylikKidemAyligi {
		t.Errorf("kıdem aylığı 25 yılda donmalı: 25y=%v 30y=%v",
			r25.AylikKidemAyligi, r30.AylikKidemAyligi)
	}
}

func TestCalculateKamu_NoFamily_NoAileYardimi(t *testing.T) {
	in := KamuSalaryInput{Gosterge: 1500, EkGosterge: 3600, EsYardimi: false, Cocuk06: 0, Cocuk6Plus: 0}
	r := CalculateKamu(in, DefaultKamuCoefs2026H1(), DefaultSGKRates(), 2026)

	if r.AileYardimi != 0 {
		t.Errorf("expected aile yardımı = 0, got %v", r.AileYardimi)
	}
	if r.CocukYardimi != 0 {
		t.Errorf("expected çocuk yardımı = 0, got %v", r.CocukYardimi)
	}
	if r.VergiIstisnaliTutar != 0 {
		t.Errorf("expected istisnali tutar = 0, got %v", r.VergiIstisnaliTutar)
	}
}

func TestCalculateKamu_MakamTemsilTazminati(t *testing.T) {
	// Üst düzey yönetici — makam + temsil + görev tazminatı alır.
	coefs := DefaultKamuCoefs2026H1()
	rates := DefaultSGKRates()

	base := KamuSalaryInput{Gosterge: 1500, EkGosterge: 8000, KidemYili: 20}
	top := base
	top.MakamTazminatiGostergesi = 4000
	top.TemsilTazminatiGostergesi = 15000
	top.GorevTazminatiGostergesi = 9500

	rBase := CalculateKamu(base, coefs, rates, 2026)
	rTop := CalculateKamu(top, coefs, rates, 2026)

	if rTop.BrutToplam <= rBase.BrutToplam {
		t.Errorf("makam+temsil+görev brütü artırmalı")
	}
	// Makam tazminatları gelir vergisinden istisna — brüt arttığı oranda net artmalı
	brutArtis := rTop.BrutToplam - rBase.BrutToplam
	netArtis := rTop.NetMaas - rBase.NetMaas
	// Makam tazminatları damga'ya tabi ama gelir vergisi + emekli'den istisna.
	// Beklenti: netArtis ≈ brutArtis × (1 - stamp) ≈ brutArtis × 0.9924
	ratio := netArtis / brutArtis
	if ratio < 0.98 || ratio > 1.01 {
		t.Errorf("makam tazminatı için net/brüt oranı ~0.99 olmalı, got %v (net=%v brut=%v)",
			ratio, netArtis, brutArtis)
	}
}

func TestGostergeTable_CoverageBasic(t *testing.T) {
	tbl := GostergeTable()
	if len(tbl) != 15 {
		t.Errorf("expected 15 dereces in table, got %d", len(tbl))
	}
	// 1/1 = 1320, 15/9 = 520
	if v := GostergeFor(1, 1); v != 1320 {
		t.Errorf("1/1 = 1320 beklenirken %v", v)
	}
	if v := GostergeFor(15, 9); v != 520 {
		t.Errorf("15/9 = 520 beklenirken %v", v)
	}
	if v := GostergeFor(99, 1); v != 0 {
		t.Errorf("out-of-range derece 0 dönmeli, got %v", v)
	}
}

func TestEkGostergeFor_MajorSiniflar(t *testing.T) {
	cases := []struct {
		sinif string
		derece int
		min    int
	}{
		{"GIH", 1, 3000},
		{"TH", 1, 5000},
		{"SH", 1, 6000},
		{"AH", 1, 6000},
	}
	for _, c := range cases {
		got := EkGostergeFor(c.sinif, c.derece)
		if got < c.min {
			t.Errorf("%s/%d ek gösterge en az %d olmalı, got %d", c.sinif, c.derece, c.min, got)
		}
	}
	if v := EkGostergeFor("UNKNOWN", 1); v != 0 {
		t.Errorf("bilinmeyen hizmet sınıfı 0 dönmeli, got %v", v)
	}
}

func TestCalculateKamu_EmekliKesenegi(t *testing.T) {
	// Emekli keseneği matrahı = gösterge + ek gösterge + taban + kıdem + özel hizmet
	// %16 memur payı doğru hesaplanıyor mu?
	in := KamuSalaryInput{
		Gosterge:               1500,
		EkGosterge:             3600,
		KidemYili:              10,
		OzelHizmetTazminatiPct: 100,
	}
	coefs := DefaultKamuCoefs2026H1()
	r := CalculateKamu(in, coefs, DefaultSGKRates(), 2026)

	expectedMatrah := r.AylikGostergeAyligi + r.AylikEkGosterge + r.AylikTabanAyligi +
		r.AylikKidemAyligi + r.OzelHizmetTazminati
	expected := round2(expectedMatrah * 0.16)
	if r.EmekliKesenegi != expected {
		t.Errorf("emekli keseneği %v beklenirken %v (matrah=%v)",
			expected, r.EmekliKesenegi, expectedMatrah)
	}
}
