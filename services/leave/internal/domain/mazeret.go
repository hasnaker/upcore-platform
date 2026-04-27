package domain

import (
	"strings"
	"time"
)

// MazeretKind enumerates the ad-hoc mazeret izin events governed by
// İş Kanunu 4857 madde 46 (ücretli tatil) + madde 55 (yıllık izinden sayılmaz).
type MazeretKind string

const (
	// MazeretEvlilik — evlilik izni (4857/55): 3 gün.
	MazeretEvlilik MazeretKind = "evlilik"
	// MazeretEvlatEdinme — evlat edinme izni (KVKK + 4857): 3 gün eş.
	MazeretEvlatEdinme MazeretKind = "evlat_edinme"
	// MazeretOlumEsCocukAnaBaba — eş, çocuk, anne, baba ölümü: 3 gün.
	MazeretOlumEsCocukAnaBaba MazeretKind = "olum_es_cocuk_anne_baba"
	// MazeretOlumKardes — kardeş ölümü: 3 gün.
	MazeretOlumKardes MazeretKind = "olum_kardes"
	// MazeretBabalik — babalık izni: 5 gün (2016 düzenlemesi).
	MazeretBabalik MazeretKind = "babalik"
	// MazeretDogumKadinOnce — doğum öncesi: 8 hafta (çoğul 10 hafta).
	MazeretDogumKadinOnce MazeretKind = "dogum_oncesi"
	// MazeretDogumKadinSonra — doğum sonrası: 8 hafta (çoğul 10 hafta).
	MazeretDogumKadinSonra MazeretKind = "dogum_sonrasi"
	// MazeretEngelliCocuk — engelli çocuk sağlık izni: yılda 10 gün.
	MazeretEngelliCocuk MazeretKind = "engelli_cocuk_saglik"
	// MazeretIsArama — iş arama izni (4857/27): günde 2 saat.
	MazeretIsArama MazeretKind = "is_arama"
	// MazeretSut — süt izni (4857/74): 6 ay, günde 1.5 saat.
	MazeretSut MazeretKind = "sut"
	// MazeretTasinma — taşınma izni (örfî, şirket policy bazlı): 1 gün.
	MazeretTasinma MazeretKind = "tasinma"
	// MazeretPetekAylik — aylık kadın periyodik izni (şirket policy bazlı).
	MazeretPetekAylik MazeretKind = "kadin_periyodik"
)

// IsValid reports whether the kind is known.
func (k MazeretKind) IsValid() bool {
	switch k {
	case MazeretEvlilik, MazeretEvlatEdinme, MazeretOlumEsCocukAnaBaba, MazeretOlumKardes,
		MazeretBabalik, MazeretDogumKadinOnce, MazeretDogumKadinSonra, MazeretEngelliCocuk,
		MazeretIsArama, MazeretSut, MazeretTasinma, MazeretPetekAylik:
		return true
	}
	return false
}

// MazeretContext captures inputs needed by the calculator for variable-length
// leave kinds (multiple birth, preterm, etc.).
type MazeretContext struct {
	// MultipleBirth true when the pregnancy is twins or more — extends doğum
	// izni by 2 weeks per side per 4857 madde 74.
	MultipleBirth bool
	// PretermBirth true when birth preceded expected date — the unused prenatal
	// balance is added to post-natal (4857/74).
	PretermBirth bool
	// PretermDaysSaved is the number of unused prenatal working days.
	PretermDaysSaved int
	// TenureMonths — used only to confirm iş_arama eligibility (requires notice).
	TenureMonths int
}

// MazeretResult describes the computed entitlement for one mazeret event.
type MazeretResult struct {
	Days           float64 // working days (8 hafta = 56 gün ≈ 40 iş günü; we store calendar days here)
	LegalReference string  // "4857/55", "4857/74" vb.
	Notes          string  // açıklama
	IsHours        bool    // true when the entitlement is hour-based (süt izni, iş arama)
	HoursPerDay    float64 // if IsHours true
}

// CalculateMazeret returns the legal entitlement for a given mazeret kind.
//
// For hour-based entitlements (süt, iş arama) Days is 0 and HoursPerDay is set.
// For doğum izni the result is expressed in calendar weeks, converted to days.
func CalculateMazeret(kind MazeretKind, ctx MazeretContext) MazeretResult {
	switch kind {
	case MazeretEvlilik:
		return MazeretResult{Days: 3, LegalReference: "4857/55", Notes: "Evlilik izni"}
	case MazeretEvlatEdinme:
		return MazeretResult{Days: 3, LegalReference: "4857/55 + 5510", Notes: "Evlat edinme izni (en az 3 yaşından küçük çocuk için)"}
	case MazeretOlumEsCocukAnaBaba:
		return MazeretResult{Days: 3, LegalReference: "4857/55", Notes: "Eş / çocuk / anne-baba vefatı"}
	case MazeretOlumKardes:
		return MazeretResult{Days: 3, LegalReference: "4857/55", Notes: "Kardeş vefatı"}
	case MazeretBabalik:
		return MazeretResult{Days: 5, LegalReference: "4857/55 + 6663 (2016)", Notes: "Babalık izni"}
	case MazeretDogumKadinOnce:
		weeks := 8
		if ctx.MultipleBirth {
			weeks = 10
		}
		return MazeretResult{
			Days:           float64(weeks * 7),
			LegalReference: "4857/74",
			Notes:          "Doğum öncesi analık izni (hafta üzerinden)",
		}
	case MazeretDogumKadinSonra:
		weeks := 8
		if ctx.MultipleBirth {
			weeks = 10
		}
		extra := 0
		if ctx.PretermBirth && ctx.PretermDaysSaved > 0 {
			extra = ctx.PretermDaysSaved
		}
		return MazeretResult{
			Days:           float64(weeks*7 + extra),
			LegalReference: "4857/74",
			Notes:          "Doğum sonrası analık izni",
		}
	case MazeretEngelliCocuk:
		return MazeretResult{Days: 10, LegalReference: "4857/46 ek", Notes: "Engelli/ağır hastalıklı çocuğun tedavisinde yılda 10 gün"}
	case MazeretIsArama:
		return MazeretResult{
			IsHours:        true,
			HoursPerDay:    2,
			LegalReference: "4857/27",
			Notes:          "İş arama izni — ihbar süresi içinde günde 2 saat",
		}
	case MazeretSut:
		return MazeretResult{
			IsHours:        true,
			HoursPerDay:    1.5,
			LegalReference: "4857/74",
			Notes:          "Süt izni — doğumdan itibaren 6 ay, günde 1.5 saat",
		}
	case MazeretTasinma:
		return MazeretResult{Days: 1, LegalReference: "Örfî / şirket policy", Notes: "Taşınma izni (yasal zorunluluk değil)"}
	case MazeretPetekAylik:
		return MazeretResult{Days: 1, LegalReference: "Şirket policy", Notes: "Kadın çalışan aylık periyodik izni (şirket içi)"}
	}
	return MazeretResult{}
}

// ResolveMazeretKind parses a human-friendly or code string to a typed kind.
func ResolveMazeretKind(s string) (MazeretKind, bool) {
	k := MazeretKind(strings.ToLower(strings.TrimSpace(s)))
	if k.IsValid() {
		return k, true
	}
	return "", false
}

// PregnancyWindow returns the legal full prenatal/postnatal window for a due date.
// Used by HR UI to pre-fill doğum izni start/end dates.
func PregnancyWindow(dueDate time.Time, multipleBirth bool) (start, end time.Time) {
	weeks := 8
	if multipleBirth {
		weeks = 10
	}
	start = dueDate.AddDate(0, 0, -weeks*7)
	end = dueDate.AddDate(0, 0, weeks*7)
	return start, end
}
