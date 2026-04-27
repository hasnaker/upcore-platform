package sgk

import (
	"strings"
	"testing"
	"time"
)

// Well-formed TCKN değeri — SGK algorithm testleri için.
// Bu gerçek bir TCKN değil; algoritma üzerinden hesaplanmış geçerli bir sentetik numara.
const validTCKN = "10000000146"

func init() {
	// Sanity: sentetik TCKN geçerli olmalı.
	if !ValidTCKN(validTCKN) {
		panic("test fixture TCKN invalid — algoritma uyumsuz")
	}
}

func TestValidTCKN(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{validTCKN, true},
		{"00000000000", false},       // ilk hane 0
		{"1234567890", false},        // 10 hane
		{"12345678901abc", false},    // uzun + harf
		{"abcdefghijk", false},       // tamamı harf
		{"11111111111", false},       // son hane algoritma uymaz
	}
	for _, c := range cases {
		if got := ValidTCKN(c.in); got != c.want {
			t.Errorf("ValidTCKN(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func newWorkplace() Workplace {
	return Workplace{
		SicilNo:      "12345",
		UnvanTR:      "UpCore Teknoloji A.Ş.",
		VergiDairesi: "Büyük Mükellefler V.D.",
		VergiNo:      "9876543210",
		Il:           "İstanbul",
		Ilce:         "Sarıyer",
	}
}

func newEmployee() Employee {
	return Employee{
		TCKN:        validTCKN,
		Ad:          "Ayşe",
		Soyad:       "Yılmaz",
		DogumTarihi: time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC),
		BabaAdi:     "Mehmet",
		MeslekKodu:  "2512.01",
	}
}

func TestBuildAPBXML(t *testing.T) {
	p := APBPayload{
		Workplace: newWorkplace(),
		Period:    time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		Matrahlar: []APBMatrah{
			{Employee: newEmployee(), PrimGunSayisi: 30, KazancTutari: 35_000.50},
		},
	}
	out, err := BuildAPBXML(p)
	if err != nil {
		t.Fatalf("build error: %v", err)
	}
	xml := string(out)
	mustContain := []string{
		`<?xml version="1.0" encoding="UTF-8"?>`,
		"<APB>",
		"<donem>202604</donem>",
		"<belge_turu>01</belge_turu>",
		"<kanun_turu>09100</kanun_turu>",
		"<sicil_no>12345</sicil_no>",
		"<tc_kimlik_no>" + validTCKN + "</tc_kimlik_no>",
		"<prim_gun_sayisi>30</prim_gun_sayisi>",
		"<prime_esas_kazanc>35000.50</prime_esas_kazanc>",
	}
	for _, s := range mustContain {
		if !strings.Contains(xml, s) {
			t.Errorf("APB XML %q bekleniyordu, yok:\n%s", s, xml)
		}
	}
}

func TestBuildAPBXML_RejectsInvalidTCKN(t *testing.T) {
	p := APBPayload{
		Workplace: newWorkplace(),
		Period:    time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
		Matrahlar: []APBMatrah{
			{Employee: Employee{TCKN: "99999999999", Ad: "x", Soyad: "y", DogumTarihi: time.Now()}, PrimGunSayisi: 30, KazancTutari: 10_000},
		},
	}
	if _, err := BuildAPBXML(p); err == nil {
		t.Fatal("invalid TCKN için hata bekleniyordu")
	}
}

func TestBuildIGBXML(t *testing.T) {
	p := IGBPayload{
		Workplace:      newWorkplace(),
		Employee:       newEmployee(),
		IseGirisTarihi: time.Date(2026, 4, 15, 0, 0, 0, 0, time.UTC),
		CalismaSekli:   "A",
		GorevKodu:      "2512.01",
	}
	out, err := BuildIGBXML(p)
	if err != nil {
		t.Fatalf("IGB build: %v", err)
	}
	xml := string(out)
	if !strings.Contains(xml, "<IseGirisBildirgesi>") {
		t.Errorf("kök eleman hatalı:\n%s", xml)
	}
	if !strings.Contains(xml, "<ise_giris_tarihi>20260415</ise_giris_tarihi>") {
		t.Errorf("tarih hatalı:\n%s", xml)
	}
	if !strings.Contains(xml, "<dogum_tarihi>19900520</dogum_tarihi>") {
		t.Errorf("doğum tarihi hatalı:\n%s", xml)
	}
}

func TestBuildIABXML(t *testing.T) {
	p := IABPayload{
		Workplace:         newWorkplace(),
		Employee:          newEmployee(),
		AyrilisTarihi:     time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
		AyrilisSebebiKodu: "03", // istifa
		SonKazancTutari:   42_500,
		KidemTazminati:    85_000,
		IhbarTazminati:    0,
	}
	out, err := BuildIABXML(p)
	if err != nil {
		t.Fatalf("IAB build: %v", err)
	}
	xml := string(out)
	mustContain := []string{
		"<IstenAyrilisBildirgesi>",
		"<ayrilis_tarihi>20260630</ayrilis_tarihi>",
		"<ayrilis_sebebi_kodu>03</ayrilis_sebebi_kodu>",
		"<son_kazanc_tutari>42500.00</son_kazanc_tutari>",
		"<kidem_tazminati>85000.00</kidem_tazminati>",
	}
	for _, s := range mustContain {
		if !strings.Contains(xml, s) {
			t.Errorf("IAB XML %q bekleniyordu, yok:\n%s", s, xml)
		}
	}
	// ihbar 0 olduğunda elementi hiç üretmemeli (omitempty).
	if strings.Contains(xml, "<ihbar_tazminati>") {
		t.Errorf("ihbar_tazminati 0 iken üretilmemeli:\n%s", xml)
	}
}

func TestBuildIABXML_RequiresSebepKodu(t *testing.T) {
	p := IABPayload{
		Workplace:     newWorkplace(),
		Employee:      newEmployee(),
		AyrilisTarihi: time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
	}
	if _, err := BuildIABXML(p); err == nil {
		t.Fatal("ayrılış sebebi zorunlu olmalı")
	}
}

func TestFormatDonem(t *testing.T) {
	got := formatDonem(time.Date(2026, 9, 15, 0, 0, 0, 0, time.UTC))
	if got != "202609" {
		t.Errorf("got %q want 202609", got)
	}
}

func TestSafeFilename(t *testing.T) {
	got := SafeFilename(BildirgeAPB, "12345", "202604")
	if got != "APB_12345_202604.xml" {
		t.Errorf("got %q", got)
	}
	got = SafeFilename(BildirgeIGB, " 12 345 ", "20260415_"+validTCKN)
	if !strings.HasPrefix(got, "IGB_12_345_") {
		t.Errorf("space replacement: %q", got)
	}
}

func TestWorkplace_Validate_Missing(t *testing.T) {
	w := Workplace{}
	if err := w.Validate(); err == nil {
		t.Fatal("boş workplace hata vermeli")
	}
}
