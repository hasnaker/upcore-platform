package bordro

// SGK teşvik kodları — 5510 sayılı Kanun + torba kanun çeşitleri.
// Her teşvik işveren SGK primi üzerinden bir indirim uygular; bazıları
// SGK primi tutarının %5'ini (5510 sayılı genel teşvik), bazıları ise
// sektöre özel sabit indirimler sağlar.
//
// Müşteri muhasebecisinin "bizim şirketin şu teşviki var" dediği kodlar.
// Bordro servisinde her çalışan için uygulanabilir/uygulanamaz takibi yapılır.

// TesvikKod ISIM'i SGK bildirgelerinde kullanılan kanun numarası + versiyon.
type TesvikKod string

const (
	// Tesvik5510Genel — 5510/81 genel teşvik, %5 işveren SGK primi indirimi.
	Tesvik5510Genel TesvikKod = "5510"
	// Tesvik6111 — 6111 sayılı Kanun: yeni iş istihdam için 1-5 yıl SGK indirimi.
	Tesvik6111 TesvikKod = "6111"
	// Tesvik6645Ortak — 6645/25 ortak SGK prim desteği (genç/kadın/işsiz).
	Tesvik6645Ortak TesvikKod = "6645"
	// Tesvik7103 — 7103 ek istihdam teşviki (bir yıl boyunca işveren payı yok).
	Tesvik7103 TesvikKod = "7103"
	// Tesvik7252 — COVID-19 kısa çalışma teşviği (arşiv, artık aktif değil ama historical data için).
	Tesvik7252 TesvikKod = "7252"
	// Tesvik4447Q — 4447/Geç.15 (ilk işini bulan genç).
	Tesvik4447Q TesvikKod = "4447Q"
	// TesvikYok — teşvik yok.
	TesvikYok TesvikKod = ""
)

// Tesvik is a single incentive rule configured for one employee for a
// specific date range. Kural bazen %5 indirim, bazen sabit ay sınırı.
type Tesvik struct {
	Code             TesvikKod
	Label            string
	StartDate        string  // YYYY-MM-DD dahil
	EndDate          string  // YYYY-MM-DD dahil; boş → süresiz
	EmployerShareCut float64 // 0..1 — işveren SGK prim payından ne kadar indirim
	// DurationMonths için varsa sınır; 0 = sınırsız.
	DurationMonths int
}

// DefaultTesvikler tenant için başlangıçta aktifleştirilebilecek kuralları
// listeler. Bordro servisi bunları frontend'e sunar, HR çalışan bazında atar.
func DefaultTesvikler() []Tesvik {
	return []Tesvik{
		{Code: Tesvik5510Genel, Label: "5510/81 Genel (%5 işveren payı)",
			EmployerShareCut: 0.05},
		{Code: Tesvik6111, Label: "6111 İlave İstihdam (kadın/genç/işsiz)",
			EmployerShareCut: 1.0, DurationMonths: 54},
		{Code: Tesvik6645Ortak, Label: "6645 Ortak İstihdam Desteği",
			EmployerShareCut: 0.5, DurationMonths: 12},
		{Code: Tesvik7103, Label: "7103 Ek İstihdam Teşviği",
			EmployerShareCut: 1.0, DurationMonths: 12},
		{Code: Tesvik4447Q, Label: "4447/Geç.15 İlk İş Genç İstihdam",
			EmployerShareCut: 1.0, DurationMonths: 12},
	}
}

// ApplyTesvik: işveren SGK primi tutarından teşvik indirimini düşer ve
// gerçek ödenecek tutarı döner. Birden fazla teşvik varsa toplam cap %100.
func ApplyTesvik(employerSGK float64, tesvikler []Tesvik) (actualEmployerSGK, totalDiscount float64) {
	if employerSGK <= 0 || len(tesvikler) == 0 {
		return employerSGK, 0
	}
	totalCutPct := 0.0
	for _, t := range tesvikler {
		totalCutPct += t.EmployerShareCut
	}
	if totalCutPct > 1.0 {
		totalCutPct = 1.0
	}
	totalDiscount = round2(employerSGK * totalCutPct)
	actualEmployerSGK = round2(employerSGK - totalDiscount)
	return actualEmployerSGK, totalDiscount
}
