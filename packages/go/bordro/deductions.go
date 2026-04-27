package bordro

import "sort"

// Ek kesintiler: avans, icra, nafaka, sendika aidatı, özel sigorta, kredi.
// 4857/35 ve İİK 83 ile uyumlu hesaplama:
//
//   1. NAFAKA: öncelikli, cap yok (İİK 83/6 nafaka alacakları icra cap'inden
//      bağımsızdır). Ancak netin altına inmez — hesapta dikkat.
//   2. İCRA: net maaşın maksimum %25'i. Birden fazla icra varsa toplamı %25.
//   3. DİĞER (avans/aidat/kredi/sigorta): priority sırasında uygulanır; her
//      biri ayrı ayrı net'i sıfıra indirmemek koşuluyla düşer.

// DeductionKind enumerates supported deduction categories. Strings are DB enum
// values (app.employee_deductions.deduction_type).
type DeductionKind string

const (
	DeductionAdvance        DeductionKind = "advance"
	DeductionIcra           DeductionKind = "icra"
	DeductionNafaka         DeductionKind = "nafaka"
	DeductionSendikaAidati  DeductionKind = "sendika_aidati"
	DeductionSaglikSigorta  DeductionKind = "saglik_sigortasi"
	DeductionKredi          DeductionKind = "kredi"
	DeductionOzel           DeductionKind = "ozel"
)

// DeductionInput — bordro calculate'e verilen tek bir kesinti talebi.
type DeductionInput struct {
	ID           string        // app.employee_deductions.id (tracking için)
	Kind         DeductionKind
	Label        string        // "2026-03 avansı" / "İcra 2024/1234"
	MonthlyLimit float64       // aylık indirim miktarı
	Remaining    float64       // kalan bakiye (total_cap - consumed); 0 ise cap uygulanmaz
	Priority     int           // 0 en öncelikli
}

// DeductionLine — uygulanmış bir kesintinin sonucu (rapor ve audit için).
type DeductionLine struct {
	ID            string
	Kind          DeductionKind
	Label         string
	AmountApplied float64 // bu ay fiilen düşülen tutar
	ReasonSkipped string  // uygulanamadıysa neden ("net sıfırlanacaktı", "cap aşıldı")
}

// IcraCapPct — net maaş üzerinden icra toplamının geçemeyeceği oran (İİK 83).
const IcraCapPct = 0.25

// ApplyDeductions iterates the requested deductions in priority order and
// returns the total deducted + per-line breakdown + final net.
// netBeforeDeductions is the bordro.Calculate result's NetPay (asgari ücret
// istisnası ve SGK düşüldükten sonra).
func ApplyDeductions(netBeforeDeductions float64, items []DeductionInput) (totalDeducted float64, lines []DeductionLine, finalNet float64) {
	finalNet = netBeforeDeductions
	if len(items) == 0 {
		return 0, nil, finalNet
	}

	// 1. Nafaka — priority 0, cap bağımsız.
	// 2. Icra — %25 cap.
	// 3. Diğer — priority sırası.
	sorted := make([]DeductionInput, len(items))
	copy(sorted, items)
	sort.SliceStable(sorted, func(i, j int) bool {
		return kindPriority(sorted[i].Kind, sorted[i].Priority) <
			kindPriority(sorted[j].Kind, sorted[j].Priority)
	})

	icraTotalCap := netBeforeDeductions * IcraCapPct
	icraConsumed := 0.0

	for _, d := range sorted {
		want := d.MonthlyLimit
		if d.Remaining > 0 && d.Remaining < want {
			want = d.Remaining
		}
		if want <= 0 {
			continue
		}

		switch d.Kind {
		case DeductionNafaka:
			// Nafaka cap bağımsız; yine de net negatife inmesin.
			if want > finalNet {
				want = finalNet
			}
			if want <= 0 {
				lines = append(lines, DeductionLine{
					ID: d.ID, Kind: d.Kind, Label: d.Label,
					AmountApplied: 0, ReasonSkipped: "net zaten sıfır",
				})
				continue
			}
		case DeductionIcra:
			// %25 cap kontrolü.
			maxAllowed := icraTotalCap - icraConsumed
			if want > maxAllowed {
				want = maxAllowed
			}
			if want <= 0 {
				lines = append(lines, DeductionLine{
					ID: d.ID, Kind: d.Kind, Label: d.Label,
					AmountApplied: 0, ReasonSkipped: "icra cap %25 aşıldı",
				})
				continue
			}
			if want > finalNet {
				want = finalNet
			}
			icraConsumed += want
		default:
			// Diğer kesintiler — net'in altına inmesin.
			if want > finalNet {
				want = finalNet
			}
			if want <= 0 {
				lines = append(lines, DeductionLine{
					ID: d.ID, Kind: d.Kind, Label: d.Label,
					AmountApplied: 0, ReasonSkipped: "net sıfırlanacaktı",
				})
				continue
			}
		}

		finalNet -= want
		totalDeducted += want
		lines = append(lines, DeductionLine{
			ID: d.ID, Kind: d.Kind, Label: d.Label, AmountApplied: round2(want),
		})
	}
	return round2(totalDeducted), lines, round2(finalNet)
}

// kindPriority returns an effective priority; explicit `Priority` wins, else
// kind-based defaults.
func kindPriority(k DeductionKind, explicit int) int {
	if explicit > 0 {
		return explicit
	}
	switch k {
	case DeductionNafaka:
		return 0
	case DeductionIcra:
		return 10
	case DeductionSendikaAidati:
		return 30
	case DeductionSaglikSigorta:
		return 40
	case DeductionAdvance:
		return 50
	case DeductionKredi:
		return 60
	default:
		return 70
	}
}
