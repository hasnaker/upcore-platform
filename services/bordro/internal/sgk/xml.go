package sgk

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// XMLHeader is the UTF-8 prolog SGK servislerinin beklediği biçimde.
const XMLHeader = `<?xml version="1.0" encoding="UTF-8"?>` + "\n"

// ============================================================================
// APB — Aylık Prim ve Hizmet Belgesi
// ============================================================================

type apbBelge struct {
	XMLName    xml.Name       `xml:"APB"`
	BelgeTuru  string         `xml:"belge_turu"`
	KanunTuru  string         `xml:"kanun_turu"`
	Donem      string         `xml:"donem"` // YYYYMM
	Isyeri     apbIsyeri      `xml:"isyeri"`
	Sigortali  []apbSigortali `xml:"sigortali"`
}

type apbIsyeri struct {
	SicilNo      string `xml:"sicil_no"`
	Unvan        string `xml:"unvan"`
	VergiDairesi string `xml:"vergi_dairesi,omitempty"`
	VergiNo      string `xml:"vergi_no"`
	Il           string `xml:"il,omitempty"`
	Ilce         string `xml:"ilce,omitempty"`
}

type apbSigortali struct {
	TCKN           string `xml:"tc_kimlik_no"`
	Ad             string `xml:"ad"`
	Soyad          string `xml:"soyad"`
	SGKNo          string `xml:"sgk_no,omitempty"`
	MeslekKodu     string `xml:"meslek_kodu,omitempty"`
	PrimGunSayisi  int    `xml:"prim_gun_sayisi"`
	KazancTutari   string `xml:"prime_esas_kazanc"` // 2 ondalık, nokta yerine virgül? → formatters.go
	EksikGunKodu   string `xml:"eksik_gun_kodu,omitempty"`
	EksikGunSayisi int    `xml:"eksik_gun_sayisi,omitempty"`
}

// BuildAPBXML returns the UTF-8 XML document for an APB.
// Shape matches SGK e-Bildirge servisinin beklediği temel alan adları.
func BuildAPBXML(p APBPayload) ([]byte, error) {
	if err := p.Validate(); err != nil {
		return nil, err
	}

	doc := apbBelge{
		BelgeTuru: p.BelgeTuru,
		KanunTuru: p.KanunTuru,
		Donem:     formatDonem(p.Period),
		Isyeri: apbIsyeri{
			SicilNo:      p.Workplace.SicilNo,
			Unvan:        p.Workplace.UnvanTR,
			VergiDairesi: p.Workplace.VergiDairesi,
			VergiNo:      p.Workplace.VergiNo,
			Il:           p.Workplace.Il,
			Ilce:         p.Workplace.Ilce,
		},
	}
	for _, m := range p.Matrahlar {
		doc.Sigortali = append(doc.Sigortali, apbSigortali{
			TCKN:           m.Employee.TCKN,
			Ad:             m.Employee.Ad,
			Soyad:          m.Employee.Soyad,
			SGKNo:          m.Employee.SGKNo,
			MeslekKodu:     m.Employee.MeslekKodu,
			PrimGunSayisi:  m.PrimGunSayisi,
			KazancTutari:   formatMoney(m.KazancTutari),
			EksikGunKodu:   m.EksikGunKodu,
			EksikGunSayisi: m.EksikGunSayisi,
		})
	}
	return marshal(doc)
}

// ============================================================================
// İGB — İşe Giriş Bildirgesi
// ============================================================================

type igbBelge struct {
	XMLName        xml.Name  `xml:"IseGirisBildirgesi"`
	Isyeri         igbIsyeri `xml:"isyeri"`
	Sigortali      igbSigortali `xml:"sigortali"`
	IseGirisTarihi string    `xml:"ise_giris_tarihi"` // YYYYMMDD
	CalismaSekli   string    `xml:"calisma_sekli"`
	GorevKodu      string    `xml:"gorev_kodu,omitempty"`
}

type igbIsyeri struct {
	SicilNo string `xml:"sicil_no"`
	Unvan   string `xml:"unvan"`
	VergiNo string `xml:"vergi_no"`
}

type igbSigortali struct {
	TCKN        string `xml:"tc_kimlik_no"`
	Ad          string `xml:"ad"`
	Soyad       string `xml:"soyad"`
	DogumTarihi string `xml:"dogum_tarihi"` // YYYYMMDD
	BabaAdi     string `xml:"baba_adi,omitempty"`
	SGKNo       string `xml:"sgk_no,omitempty"`
	MeslekKodu  string `xml:"meslek_kodu,omitempty"`
}

// BuildIGBXML returns the UTF-8 XML document for an İşe Giriş Bildirgesi.
func BuildIGBXML(p IGBPayload) ([]byte, error) {
	if err := p.Validate(); err != nil {
		return nil, err
	}
	doc := igbBelge{
		Isyeri: igbIsyeri{
			SicilNo: p.Workplace.SicilNo,
			Unvan:   p.Workplace.UnvanTR,
			VergiNo: p.Workplace.VergiNo,
		},
		Sigortali: igbSigortali{
			TCKN:        p.Employee.TCKN,
			Ad:          p.Employee.Ad,
			Soyad:       p.Employee.Soyad,
			DogumTarihi: formatGun(p.Employee.DogumTarihi),
			BabaAdi:     p.Employee.BabaAdi,
			SGKNo:       p.Employee.SGKNo,
			MeslekKodu:  p.Employee.MeslekKodu,
		},
		IseGirisTarihi: formatGun(p.IseGirisTarihi),
		CalismaSekli:   p.CalismaSekli,
		GorevKodu:      p.GorevKodu,
	}
	return marshal(doc)
}

// ============================================================================
// İAB — İşten Ayrılış Bildirgesi
// ============================================================================

type iabBelge struct {
	XMLName           xml.Name  `xml:"IstenAyrilisBildirgesi"`
	Isyeri            iabIsyeri `xml:"isyeri"`
	Sigortali         iabSigortali `xml:"sigortali"`
	AyrilisTarihi     string    `xml:"ayrilis_tarihi"`
	AyrilisSebebiKodu string    `xml:"ayrilis_sebebi_kodu"`
	SonKazancTutari   string    `xml:"son_kazanc_tutari,omitempty"`
	KidemTazminati    string    `xml:"kidem_tazminati,omitempty"`
	IhbarTazminati    string    `xml:"ihbar_tazminati,omitempty"`
}

type iabIsyeri struct {
	SicilNo string `xml:"sicil_no"`
	Unvan   string `xml:"unvan"`
	VergiNo string `xml:"vergi_no"`
}

type iabSigortali struct {
	TCKN   string `xml:"tc_kimlik_no"`
	Ad     string `xml:"ad"`
	Soyad  string `xml:"soyad"`
	SGKNo  string `xml:"sgk_no,omitempty"`
}

// BuildIABXML returns the UTF-8 XML document for an İAB.
func BuildIABXML(p IABPayload) ([]byte, error) {
	if err := p.Validate(); err != nil {
		return nil, err
	}
	doc := iabBelge{
		Isyeri: iabIsyeri{
			SicilNo: p.Workplace.SicilNo,
			Unvan:   p.Workplace.UnvanTR,
			VergiNo: p.Workplace.VergiNo,
		},
		Sigortali: iabSigortali{
			TCKN:  p.Employee.TCKN,
			Ad:    p.Employee.Ad,
			Soyad: p.Employee.Soyad,
			SGKNo: p.Employee.SGKNo,
		},
		AyrilisTarihi:     formatGun(p.AyrilisTarihi),
		AyrilisSebebiKodu: p.AyrilisSebebiKodu,
	}
	if p.SonKazancTutari > 0 {
		doc.SonKazancTutari = formatMoney(p.SonKazancTutari)
	}
	if p.KidemTazminati > 0 {
		doc.KidemTazminati = formatMoney(p.KidemTazminati)
	}
	if p.IhbarTazminati > 0 {
		doc.IhbarTazminati = formatMoney(p.IhbarTazminati)
	}
	return marshal(doc)
}

// ============================================================================
// formatters + marshal helper
// ============================================================================

// formatDonem returns "YYYYMM" for SGK "donem" alanı.
func formatDonem(t time.Time) string {
	return fmt.Sprintf("%04d%02d", t.Year(), int(t.Month()))
}

// formatGun returns "YYYYMMDD".
func formatGun(t time.Time) string {
	return t.Format("20060102")
}

// formatMoney returns a 2-decimal amount with dot separator.
//
// SGK'nın eski spesifikasyonunda virgül istiyordu; e-Bildirge 2.0 nokta
// kabul ediyor. Müşteri tarafında override edilmek istenirse ileride bir
// flag eklenebilir.
func formatMoney(v float64) string {
	// Binlik ayraçsız, 2 ondalık.
	rounded := math.Round(v*100) / 100
	return strconv.FormatFloat(rounded, 'f', 2, 64)
}

func marshal(v any) ([]byte, error) {
	body, err := xml.MarshalIndent(v, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("sgk: marshal: %w", err)
	}
	var buf bytes.Buffer
	buf.WriteString(XMLHeader)
	buf.Write(body)
	buf.WriteByte('\n')
	return buf.Bytes(), nil
}

// SafeFilename returns a filesystem-safe filename for a bildirge artefact.
// Example: "APB_12345_202604.xml" / "IGB_12345_20260415_99911223344.xml".
func SafeFilename(b BildirgeType, sicil string, suffix string) string {
	clean := func(s string) string {
		s = strings.TrimSpace(s)
		s = strings.ReplaceAll(s, " ", "_")
		return s
	}
	return fmt.Sprintf("%s_%s_%s.xml", b, clean(sicil), clean(suffix))
}
