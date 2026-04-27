// Package sgk builds Türkiye SGK (Sosyal Güvenlik Kurumu) e-Bildirge payloads.
//
// Üç bildirge tipi üretir:
//
//   - APB (Aylık Prim ve Hizmet Belgesi) — aylık toplu bildirge, tüm 4a'lı
//     çalışanlar için. 5510 md.86.
//   - İGB (İşe Giriş Bildirgesi) — çalışan başlamadan en geç 1 gün önce.
//     5510 md.8.
//   - İAB (İşten Ayrılış Bildirgesi) — iş akdi feshinden itibaren 10 gün.
//     5510 md.9.
//
// Not: Bu paket yalnızca XML formatını üretir. Gerçek SGK e-Bildirge
// servisi SOAP/HTTPS endpoint'ine iletim için `submit.go` içinde stub var;
// canlı entegrasyon için kurum kullanıcı adı + şifre + işyeri sicil no
// gerekir (müşteri konfigürasyonu).
package sgk

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// BildirgeType enumerates the three supported statement kinds.
type BildirgeType string

const (
	// BildirgeAPB — Aylık Prim ve Hizmet Belgesi.
	BildirgeAPB BildirgeType = "APB"
	// BildirgeIGB — İşe Giriş Bildirgesi (5510/8).
	BildirgeIGB BildirgeType = "IGB"
	// BildirgeIAB — İşten Ayrılış Bildirgesi (5510/9).
	BildirgeIAB BildirgeType = "IAB"
)

// IsValid reports whether the type is known.
func (b BildirgeType) IsValid() bool {
	switch b {
	case BildirgeAPB, BildirgeIGB, BildirgeIAB:
		return true
	}
	return false
}

// Workplace describes the employer (İşyeri). SGK requires all bildirgeler to
// carry işyeri sicil no + vergi dairesi.
type Workplace struct {
	// SicilNo — SGK işyeri sicil numarası, 26 karaktere kadar.
	SicilNo string
	// UnvanTR — işyeri ticari unvanı.
	UnvanTR string
	// VergiDairesi — vergi dairesi adı.
	VergiDairesi string
	// VergiNo — vergi numarası (TCKN veya 10 hane VKN).
	VergiNo string
	// Il, İlçe — SGK'nın kullandığı şehir/ilçe kodları değil, ad bazlı.
	Il    string
	Ilce  string
}

// Employee describes a 4a'lı SGK çalışanı.
type Employee struct {
	// TCKN — 11 hane Türkiye Cumhuriyeti Kimlik Numarası.
	TCKN string
	// Ad ve Soyad.
	Ad    string
	Soyad string
	// DogumTarihi — ISO (2026-01-15).
	DogumTarihi time.Time
	// BabaAdi — SGK kayıtlarında eski formalite; zorunlu.
	BabaAdi string
	// SGKNo — varsa önceki işyeri SGK numarası (İGB'de isteğe bağlı).
	SGKNo string
	// MeslekKodu — ISCO-08 bazlı SGK meslek kodu (7 hane).
	MeslekKodu string
}

// APBMatrah captures one employee's monthly earnings for APB.
type APBMatrah struct {
	Employee Employee
	// Period (yıl, ay) APBPayload.Period ile aynı olmalı.
	PrimGunSayisi int     // ay içinde çalışılan prim günü (max 30)
	KazancTutari  float64 // prime esas kazanç (SGK tavan altı)
	EksikGunKodu  string  // "01" = istirahat, "03" = ücretsiz izin, vs. (5510 yönetmeliği)
	EksikGunSayisi int
}

// APBPayload bundles everything needed for an Aylık Prim ve Hizmet Belgesi.
type APBPayload struct {
	Workplace Workplace
	Period    time.Time // yıl+ay, gün önemsiz (ayın ilk günü kullanılacak)
	// BelgeTuru: "01" = asıl, "02" = ek, "03" = iptal.
	BelgeTuru string
	// KanunTuru: "09100" = genel, diğer teşvik kanunları için farklı kodlar.
	KanunTuru string
	Matrahlar []APBMatrah
}

// IGBPayload is the İşe Giriş Bildirgesi body.
type IGBPayload struct {
	Workplace  Workplace
	Employee   Employee
	// IseGirisTarihi: SGK'nın resmi başlama tarihi.
	IseGirisTarihi time.Time
	// CalismaSekli: "A" = normal çalışan, "B" = part-time, "C" = çağrı üzerine.
	CalismaSekli string
	// GorevKodu: ISCO-08 + SGK eki.
	GorevKodu string
}

// IABPayload is the İşten Ayrılış Bildirgesi body.
type IABPayload struct {
	Workplace Workplace
	Employee  Employee
	// AyrilisTarihi: iş akdinin fiilen sona erdiği gün.
	AyrilisTarihi time.Time
	// AyrilisSebebiKodu: SGK'nın 40+ kodlu katalogu (01 = deneme süresi, 03 =
	// istifa, 04 = disiplin, 15 = emekli, 25 = fesih md.25, 26 = fesih md.26…)
	AyrilisSebebiKodu string
	// SonKazancTutari — son ay SGK matrahı.
	SonKazancTutari float64
	// KidemTazminati ve IhbarTazminati — ödendiyse brüt tutar.
	KidemTazminati  float64
	IhbarTazminati  float64
}

// Errors returned during build.
var (
	ErrMissingWorkplace = errors.New("sgk: workplace bilgisi eksik")
	ErrMissingEmployee  = errors.New("sgk: çalışan bilgisi eksik")
	ErrInvalidTCKN      = errors.New("sgk: geçersiz TCKN (11 hane + algoritma)")
	ErrNoEmployees      = errors.New("sgk: bildirgede en az 1 çalışan olmalı")
	ErrInvalidPeriod    = errors.New("sgk: period geçersiz")
)

// Validate enforces invariants needed by SGK before XML build.
func (p *APBPayload) Validate() error {
	if err := p.Workplace.Validate(); err != nil {
		return err
	}
	if p.Period.IsZero() {
		return ErrInvalidPeriod
	}
	if len(p.Matrahlar) == 0 {
		return ErrNoEmployees
	}
	if p.BelgeTuru == "" {
		p.BelgeTuru = "01"
	}
	if p.KanunTuru == "" {
		p.KanunTuru = "09100"
	}
	for i, m := range p.Matrahlar {
		if err := m.Employee.Validate(); err != nil {
			return fmt.Errorf("matrah[%d]: %w", i, err)
		}
		if m.PrimGunSayisi < 0 || m.PrimGunSayisi > 30 {
			return fmt.Errorf("matrah[%d]: prim_gun_sayisi 0-30 aralığında olmalı", i)
		}
		if m.KazancTutari < 0 {
			return fmt.Errorf("matrah[%d]: kazanc_tutari negatif olamaz", i)
		}
	}
	return nil
}

// Validate enforces invariants for İGB.
func (p *IGBPayload) Validate() error {
	if err := p.Workplace.Validate(); err != nil {
		return err
	}
	if err := p.Employee.Validate(); err != nil {
		return err
	}
	if p.IseGirisTarihi.IsZero() {
		return fmt.Errorf("sgk: işe giriş tarihi zorunlu")
	}
	if p.CalismaSekli == "" {
		p.CalismaSekli = "A"
	}
	return nil
}

// Validate enforces invariants for İAB.
func (p *IABPayload) Validate() error {
	if err := p.Workplace.Validate(); err != nil {
		return err
	}
	if err := p.Employee.Validate(); err != nil {
		return err
	}
	if p.AyrilisTarihi.IsZero() {
		return fmt.Errorf("sgk: ayrılış tarihi zorunlu")
	}
	if strings.TrimSpace(p.AyrilisSebebiKodu) == "" {
		return fmt.Errorf("sgk: ayrılış sebebi kodu zorunlu")
	}
	return nil
}

// Validate enforces Workplace invariants.
func (w *Workplace) Validate() error {
	if w == nil {
		return ErrMissingWorkplace
	}
	if strings.TrimSpace(w.SicilNo) == "" {
		return fmt.Errorf("%w: sicil_no boş", ErrMissingWorkplace)
	}
	if strings.TrimSpace(w.UnvanTR) == "" {
		return fmt.Errorf("%w: unvan boş", ErrMissingWorkplace)
	}
	if strings.TrimSpace(w.VergiNo) == "" {
		return fmt.Errorf("%w: vergi_no boş", ErrMissingWorkplace)
	}
	return nil
}

// Validate enforces Employee invariants (TCKN algorithm + required fields).
func (e *Employee) Validate() error {
	if e == nil {
		return ErrMissingEmployee
	}
	if !ValidTCKN(e.TCKN) {
		return ErrInvalidTCKN
	}
	if strings.TrimSpace(e.Ad) == "" || strings.TrimSpace(e.Soyad) == "" {
		return fmt.Errorf("%w: ad/soyad boş", ErrMissingEmployee)
	}
	if e.DogumTarihi.IsZero() {
		return fmt.Errorf("%w: dogum_tarihi boş", ErrMissingEmployee)
	}
	return nil
}

// ValidTCKN checks the Türkiye identity number using the official algorithm:
//   - 11 hane, ilk hane 0 olamaz
//   - 1+3+5+7+9 toplamın 7 katı eksi 2+4+6+8 toplamı → 10. hane (mod 10)
//   - İlk 10 hanenin toplamının mod 10'u → 11. hane
func ValidTCKN(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) != 11 {
		return false
	}
	digits := [11]int{}
	for i, r := range s {
		if r < '0' || r > '9' {
			return false
		}
		digits[i] = int(r - '0')
	}
	if digits[0] == 0 {
		return false
	}
	odd := digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
	even := digits[1] + digits[3] + digits[5] + digits[7]
	d10 := ((odd * 7) - even) % 10
	if d10 < 0 {
		d10 += 10
	}
	if d10 != digits[9] {
		return false
	}
	sumFirst10 := 0
	for i := 0; i < 10; i++ {
		sumFirst10 += digits[i]
	}
	return sumFirst10%10 == digits[10]
}
