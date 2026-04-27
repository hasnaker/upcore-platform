package bordro


// ============================================================================
// 657 Devlet Memurları Kanunu — Maaş Hesaplama
// ============================================================================
//
// 657 sayılı Kanun'a tabi memurlar için maaş; gösterge, ek gösterge, taban
// aylığı, kıdem aylığı, yan ödeme, aile ve çocuk yardımı, makam/temsil/görev
// tazminatı gibi kalemlerin toplamıyla bulunur. Net maaşa inmek için gelir
// vergisi (istisnalar dahil), damga vergisi ve emekli keseneği düşülür.
//
// Formüller Türk mevzuatından (Bütçe Kanunu yıllık katsayılar +
// Toplu Sözleşme hükümleri) alınmıştır. Katsayı rakamları Ocak-Temmuz
// altışar aylık güncellenir; `KamuCoefficients` struct'ı her iki periyodu
// destekler.

// KamuCoefficients bundles maaş katsayısı + taban aylığı katsayısı +
// yan ödeme katsayısı. Resmi Gazete'de yayımlanan Bütçe/Toplu Sözleşme
// rakamları ile güncellenir.
type KamuCoefficients struct {
	Year             int
	HalfPeriod       int     // 1 = Ocak-Haziran, 2 = Temmuz-Aralık
	MaasKatsayisi    float64 // memur maaş katsayısı (2026 H1 tahmini 1.0765)
	TabanAyligi      float64 // taban aylığı katsayısı (2026 H1 tahmini 16.8478)
	YanOdemeKatsayi  float64 // yan ödeme katsayısı (2026 H1 tahmini 0.3413)
	AileYardimiAyisi float64 // aile yardımı puanı (2026: 2534 gösterge)
	CocukYardimi06   float64 // 0-6 yaş çocuk yardımı puanı (500)
	CocukYardimi6Plus float64 // 6+ yaş çocuk yardımı puanı (250)
}

// DefaultKamuCoefs2026H1 returns the first-half 2026 values.
// Not: Gerçek rakamlar Ocak 2026 Toplu Sözleşme zammı sonrası güncellenecek.
func DefaultKamuCoefs2026H1() KamuCoefficients {
	return KamuCoefficients{
		Year:              2026,
		HalfPeriod:        1,
		MaasKatsayisi:     1.0765,
		TabanAyligi:       16.8478,
		YanOdemeKatsayi:   0.3413,
		AileYardimiAyisi:  2534,
		CocukYardimi06:    500,
		CocukYardimi6Plus: 250,
	}
}

// KamuSalaryInput describes the memur's kadro + personal context.
type KamuSalaryInput struct {
	// Gösterge tablosu (657 EK I / II) rakamları — Kadro derecesi ve kademesine
	// göre okunur. 1/4 derece/kademe için 1320 gibi 4-haneli sayı.
	Gosterge int

	// Ek gösterge (hizmet sınıfı + kadro derecesine göre 657 EK II). Örn GİH 1.
	// derece için 3600-8000 arası.
	EkGosterge int

	// Kıdem yılı (tam yıl; 25 yıldan sonrası kıdem aylığına eklenmez).
	KidemYili int

	// Yan ödeme puanı — kadro/görev özel puanı (Yan Ödeme Kararnamesi ekinden).
	YanOdemePuani int

	// Özel hizmet tazminatı yüzdesi (Devlet Memurları Tedavi Yönetmeliği
	// ve her görev için farklı oran, 657 EK III).
	OzelHizmetTazminatiPct float64

	// Makam tazminatı göstergesi (üst düzey yöneticiler; çoğu memurda 0).
	MakamTazminatiGostergesi int

	// Temsil tazminatı göstergesi (makam tazminatı alan üst düzey yöneticiler).
	TemsilTazminatiGostergesi int

	// Görev tazminatı göstergesi (seçili kadrolar için).
	GorevTazminatiGostergesi int

	// Evli ve çalışmayan eş varsa true.
	EsYardimi bool

	// 0-6 yaş aralığında çocuk sayısı.
	Cocuk06 int

	// 6 yaş üstü çocuk sayısı.
	Cocuk6Plus int

	// Engelli derecesine göre gelir vergisi indirim tutarı (GVK 31 — 2026:
	// 1.derece 9.900, 2.derece 5.700, 3.derece 2.400 TL). 0 = engelli değil.
	EngelliIndirimiAylik float64

	// Emekli keseneği yıllık kümülatif (kümülatif gelir vergisi hesabı için
	// gerekmez, sadece referans).
	CumulativeGross float64
}

// KamuSalaryResult is the full breakdown of a memur payroll slip.
type KamuSalaryResult struct {
	// Kazanç kalemleri (gross'a eklenen)
	AylikGostergeAyligi  float64 // gösterge × maaş katsayısı
	AylikEkGosterge      float64 // ek gösterge × maaş katsayısı
	AylikTabanAyligi     float64 // 1000 × taban aylığı katsayısı
	AylikKidemAyligi     float64 // min(kidemYili,25) × 20 × maaş katsayısı
	YanOdeme             float64 // yan ödeme puanı × yan ödeme katsayısı
	OzelHizmetTazminati  float64 // (gösterge + ek gösterge) × %özel × maaş katsayısı
	MakamTazminati       float64 // makam göst × maaş katsayısı
	TemsilTazminati      float64 // temsil göst × maaş katsayısı
	GorevTazminati       float64 // görev göst × maaş katsayısı
	AileYardimi          float64 // evliyse 2134 × maaş katsayısı
	CocukYardimi         float64 // çocuk puanı × maaş katsayısı
	BrutToplam           float64 // tüm kalemlerin toplamı (emekli keseneği matrahı için farklı)

	// Kesintiler
	EmekliKesenegi       float64 // %16 memur payı, matrah = gösterge+ek gösterge+taban+kıdem+özel hizmet tazminatı (kanunen belirlenen)
	EmekliKesenegiIsveren float64 // %20 kurum payı (SGK değil; maliyet)
	GelirVergisiMatrahi  float64 // brüt − emekli keseneği − engelli indirimi − istisna gelirler
	GelirVergisiBrut     float64 // progressive tax (GVK 103)
	GelirVergisiIstisna  float64 // asgari ücret istisnası (GVK Gç 86)
	GelirVergisiNet      float64 // ödenecek gelir vergisi
	DamgaVergisiBrut     float64 // (brüt − yalnız damga istisnası gelirler) × %0.759
	DamgaVergisiIstisna  float64 // asgari ücret damga istisnası
	DamgaVergisiNet      float64 // ödenecek damga vergisi

	// Net
	NetMaas              float64 // brüt − emekli keseneği − gelir vergisi net − damga vergisi net

	// Raporlama için tazminatlar (vergi istisnalı kalemler)
	VergiIstisnaliTutar  float64 // aile + çocuk + makam + temsil + görev tazminatları (gelir vergisinden istisna)
}

// CalculateKamu runs the 657 memur payroll for one month.
//
// Not: Makam/temsil/görev tazminatları ve çocuk/aile yardımları gelir
// vergisinden istisnadır (GVK 23 ve 25). Emekli keseneği matrahı özel
// tanımlıdır (5434 sayılı Kanun geç. 10): gösterge+ek gösterge aylığı +
// taban aylığı + kıdem aylığı + yarının %100'ü özel hizmet tazminatı.
func CalculateKamu(in KamuSalaryInput, coefs KamuCoefficients, rates SGKRates, year int) KamuSalaryResult {
	if coefs.MaasKatsayisi == 0 {
		coefs = DefaultKamuCoefs2026H1()
	}
	if rates.EmployeeSGK == 0 {
		rates = DefaultSGKRates()
	}

	k := coefs.MaasKatsayisi

	gosterge := float64(in.Gosterge) * k
	ekGosterge := float64(in.EkGosterge) * k
	taban := 1000 * coefs.TabanAyligi
	kidemYil := in.KidemYili
	if kidemYil > 25 {
		kidemYil = 25
	}
	kidem := float64(kidemYil) * 20 * k

	yanOdeme := float64(in.YanOdemePuani) * coefs.YanOdemeKatsayi

	ozelHizmet := 0.0
	if in.OzelHizmetTazminatiPct > 0 {
		// Matrah: (gösterge + ek gösterge) × maaş katsayısı, sonra yüzde uygulanır.
		ozelHizmet = (gosterge + ekGosterge) * in.OzelHizmetTazminatiPct / 100.0
	}

	makam := float64(in.MakamTazminatiGostergesi) * k
	temsil := float64(in.TemsilTazminatiGostergesi) * k
	gorev := float64(in.GorevTazminatiGostergesi) * k

	aile := 0.0
	if in.EsYardimi {
		aile = coefs.AileYardimiAyisi * k
	}
	cocuk := (float64(in.Cocuk06)*coefs.CocukYardimi06 +
		float64(in.Cocuk6Plus)*coefs.CocukYardimi6Plus) * k

	brut := gosterge + ekGosterge + taban + kidem + yanOdeme + ozelHizmet +
		makam + temsil + gorev + aile + cocuk

	// Emekli keseneği matrahı (5434 sayılı Kanun) — yan ödeme, makam, temsil,
	// görev tazminatları ve aile/çocuk yardımları matraha dahil edilmez.
	emekliMatrah := gosterge + ekGosterge + taban + kidem + ozelHizmet
	emekli := emekliMatrah * 0.16                 // memur payı %16
	emekliIsv := emekliMatrah * 0.20              // kurum payı %20 (maliyet)

	// Gelir vergisi istisna kalemler: aile + çocuk + makam + temsil + görev
	vergiIstisnali := aile + cocuk + makam + temsil + gorev

	// Gelir vergisi matrahı = brüt − emekli keseneği − engelli indirimi − istisna gelirler
	taxBase := brut - emekli - in.EngelliIndirimiAylik - vergiIstisnali
	if taxBase < 0 {
		taxBase = 0
	}

	schedule := ScheduleFor(year)
	gvBrut := progressiveTax(in.CumulativeGross, taxBase, schedule)

	// Asgari ücret istisnası — memur maaşı da asgari ücret istisnasından yararlanır.
	gvIstisna, dmIstisna := MinWageTaxExemption(year, rates)
	if gvIstisna > gvBrut {
		gvIstisna = gvBrut
	}
	gvNet := gvBrut - gvIstisna

	// Damga vergisi matrahı: brüt − istisna gelirler (aile/çocuk yardımı
	// damga'dan da istisnadır DVK 9-2). Makam/temsil/görev damga'ya tabidir.
	damgaMatrah := brut - aile - cocuk
	dmBrut := damgaMatrah * StampTaxRate
	if dmIstisna > dmBrut {
		dmIstisna = dmBrut
	}
	dmNet := dmBrut - dmIstisna

	net := brut - emekli - gvNet - dmNet

	return KamuSalaryResult{
		AylikGostergeAyligi:   round2(gosterge),
		AylikEkGosterge:       round2(ekGosterge),
		AylikTabanAyligi:      round2(taban),
		AylikKidemAyligi:      round2(kidem),
		YanOdeme:              round2(yanOdeme),
		OzelHizmetTazminati:   round2(ozelHizmet),
		MakamTazminati:        round2(makam),
		TemsilTazminati:       round2(temsil),
		GorevTazminati:        round2(gorev),
		AileYardimi:           round2(aile),
		CocukYardimi:          round2(cocuk),
		BrutToplam:            round2(brut),
		EmekliKesenegi:        round2(emekli),
		EmekliKesenegiIsveren: round2(emekliIsv),
		GelirVergisiMatrahi:   round2(taxBase),
		GelirVergisiBrut:      round2(gvBrut),
		GelirVergisiIstisna:   round2(gvIstisna),
		GelirVergisiNet:       round2(gvNet),
		DamgaVergisiBrut:      round2(dmBrut),
		DamgaVergisiIstisna:   round2(dmIstisna),
		DamgaVergisiNet:       round2(dmNet),
		NetMaas:               round2(net),
		VergiIstisnaliTutar:   round2(vergiIstisnali),
	}
}

// ----------------------------------------------------------------------------
// Gösterge tablosu (kadro derecesi × kademe) — referans
// ----------------------------------------------------------------------------

// GostergeTable returns the 657 EK-I aylık gösterge tablosu.
// Derece 1-15, Kademe 1-9. Boş hücreler 0 döner.
//
// Tablo 657/EK-I metnindeki sabit değerlerdir (Bütçe Kanunu ile değişmez).
func GostergeTable() map[int]map[int]int {
	return map[int]map[int]int{
		1:  {1: 1320, 2: 1380, 3: 1440, 4: 1500},
		2:  {1: 1155, 2: 1210, 3: 1265, 4: 1320, 5: 1380, 6: 1440, 7: 1500},
		3:  {1: 1020, 2: 1065, 3: 1110, 4: 1155, 5: 1210, 6: 1265, 7: 1320, 8: 1380, 9: 1440},
		4:  {1: 915, 2: 950, 3: 985, 4: 1020, 5: 1065, 6: 1110, 7: 1155, 8: 1210, 9: 1265},
		5:  {1: 835, 2: 865, 3: 895, 4: 915, 5: 950, 6: 985, 7: 1020, 8: 1065, 9: 1110},
		6:  {1: 760, 2: 785, 3: 810, 4: 835, 5: 865, 6: 895, 7: 915, 8: 950, 9: 985},
		7:  {1: 705, 2: 720, 3: 740, 4: 760, 5: 785, 6: 810, 7: 835, 8: 865, 9: 895},
		8:  {1: 660, 2: 675, 3: 690, 4: 705, 5: 720, 6: 740, 7: 760, 8: 785, 9: 810},
		9:  {1: 620, 2: 630, 3: 645, 4: 660, 5: 675, 6: 690, 7: 705, 8: 720, 9: 740},
		10: {1: 590, 2: 600, 3: 610, 4: 620, 5: 630, 6: 645, 7: 660, 8: 675, 9: 690},
		11: {1: 560, 2: 570, 3: 580, 4: 590, 5: 600, 6: 610, 7: 620, 8: 630, 9: 645},
		12: {1: 545, 2: 550, 3: 560, 4: 570, 5: 580, 6: 590, 7: 600, 8: 610, 9: 620},
		13: {1: 510, 2: 520, 3: 530, 4: 540, 5: 550, 6: 560, 7: 570, 8: 580, 9: 590},
		14: {1: 475, 2: 485, 3: 495, 4: 505, 5: 515, 6: 525, 7: 535, 8: 545, 9: 555},
		15: {1: 440, 2: 450, 3: 460, 4: 470, 5: 480, 6: 490, 7: 500, 8: 510, 9: 520},
	}
}

// GostergeFor returns the gösterge for a given derece+kademe, or 0 if out of range.
func GostergeFor(derece, kademe int) int {
	tbl := GostergeTable()
	if row, ok := tbl[derece]; ok {
		if v, ok := row[kademe]; ok {
			return v
		}
	}
	return 0
}

// EkGostergeFor returns the ek gösterge for a given hizmet sınıfı + derece.
// Tablo GİH (Genel İdare Hizmetleri) ve TH (Teknik Hizmetler) için 657 EK-II'den;
// diğer sınıflar için 0 döner — gerektiğinde genişletilir.
func EkGostergeFor(hizmetSinifi string, derece int) int {
	gih := map[int]int{1: 3600, 2: 2800, 3: 2200, 4: 1600, 5: 1300, 6: 1150, 7: 950, 8: 850}
	th := map[int]int{1: 6400, 2: 4800, 3: 3600, 4: 3000, 5: 2200, 6: 1600, 7: 1500, 8: 1100}
	sh := map[int]int{1: 7600, 2: 5800, 3: 4500, 4: 3600, 5: 2500, 6: 1800, 7: 1500, 8: 1100}
	eoh := map[int]int{1: 6400, 2: 4800, 3: 3600, 4: 3000, 5: 2200, 6: 1600, 7: 1500, 8: 1100}
	ah := map[int]int{1: 7600, 2: 5800, 3: 4500, 4: 3600, 5: 2500, 6: 1800, 7: 1500, 8: 1100}
	dh := map[int]int{1: 4200, 2: 3000, 3: 2200, 4: 1600, 5: 1300, 6: 1150, 7: 950, 8: 850}
	mbh := map[int]int{1: 4200, 2: 3000, 3: 2200, 4: 1600, 5: 1300, 6: 1150, 7: 950, 8: 850}

	switch hizmetSinifi {
	case "GIH":
		return gih[derece]
	case "TH":
		return th[derece]
	case "SH":
		return sh[derece]
	case "EOH":
		return eoh[derece]
	case "AH":
		return ah[derece]
	case "DH":
		return dh[derece]
	case "MBH":
		return mbh[derece]
	default:
		return 0
	}
}
