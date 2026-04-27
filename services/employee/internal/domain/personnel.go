package domain

// PersonnelType enumerates Turkish employment statutes.
//
//   - "657"       : 657 sayılı Devlet Memurları Kanunu'na tabi kadrolu memur (kamu)
//   - "4B"        : 657/4-B sözleşmeli personel (kamu)
//   - "4C"        : 657/4-C geçici personel (kamu)
//   - "4857"      : 4857 sayılı İş Kanunu (özel sektör işçi)
//   - "stajyer"   : Üniversite / mesleki eğitim stajyeri (6111 mad.16 dahil)
//   - "emekli_sozlesmeli": Emekli olup sözleşmeli olarak yeniden çalışan
type PersonnelType string

const (
	PersonnelType657           PersonnelType = "657"
	PersonnelType4B            PersonnelType = "4B"
	PersonnelType4C            PersonnelType = "4C"
	PersonnelType4857          PersonnelType = "4857"
	PersonnelTypeStajyer       PersonnelType = "stajyer"
	PersonnelTypeEmekliSozlesme PersonnelType = "emekli_sozlesmeli"
)

// IsValid reports whether the type is known.
func (p PersonnelType) IsValid() bool {
	switch p {
	case PersonnelType657, PersonnelType4B, PersonnelType4C,
		PersonnelType4857, PersonnelTypeStajyer, PersonnelTypeEmekliSozlesme:
		return true
	}
	return false
}

// IsKamu reports whether the type falls under Türk kamu personeli mevzuatı.
// Kamu (657/4B/4C) için: farklı bordro, izin, disiplin kuralları.
func (p PersonnelType) IsKamu() bool {
	switch p {
	case PersonnelType657, PersonnelType4B, PersonnelType4C:
		return true
	}
	return false
}

// RequiresKadro reports whether the type needs kadro_derece + kademe.
// Yalnızca 657 kadrolu memurlarda zorunlu.
func (p PersonnelType) RequiresKadro() bool {
	return p == PersonnelType657
}

// HizmetSinifi enumerates 657'nin hizmet sınıfları (md.36).
type HizmetSinifi string

const (
	HizmetGIH HizmetSinifi = "GIH" // Genel İdare Hizmetleri
	HizmetTH  HizmetSinifi = "TH"  // Teknik Hizmetler
	HizmetSH  HizmetSinifi = "SH"  // Sağlık Hizmetleri
	HizmetEOH HizmetSinifi = "EOH" // Eğitim ve Öğretim Hizmetleri
	HizmetAH  HizmetSinifi = "AH"  // Avukatlık Hizmetleri
	HizmetDH  HizmetSinifi = "DH"  // Din Hizmetleri
	HizmetMBH HizmetSinifi = "MBH" // Mülki İdare Amirliği Hizmetleri
	HizmetEH  HizmetSinifi = "EH"  // Emniyet Hizmetleri
	HizmetYH  HizmetSinifi = "YH"  // Yardımcı Hizmetler
)

// IsValid reports whether the hizmet sınıfı is known.
func (h HizmetSinifi) IsValid() bool {
	switch h {
	case HizmetGIH, HizmetTH, HizmetSH, HizmetEOH, HizmetAH,
		HizmetDH, HizmetMBH, HizmetEH, HizmetYH:
		return true
	}
	return false
}

// KadroCoords captures 657 bordro-relevant rank coordinates.
type KadroCoords struct {
	KadroUnvani  string
	KadroDerece  int // 1..15, 1 en yüksek
	Kademe       int // 1..9, 9 en yüksek
	HizmetSinifi HizmetSinifi
	HizmetPuani  int
	Gosterge     int
	EkGosterge   int
}

// Validate enforces 657 kadro invariantları.
func (k KadroCoords) Validate() error {
	fields := map[string]string{}
	if k.KadroDerece < 1 || k.KadroDerece > 15 {
		fields["kadro_derece"] = "must_be_1_to_15"
	}
	if k.Kademe < 1 || k.Kademe > 9 {
		fields["kademe"] = "must_be_1_to_9"
	}
	if k.HizmetSinifi != "" && !k.HizmetSinifi.IsValid() {
		fields["hizmet_sinifi"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
