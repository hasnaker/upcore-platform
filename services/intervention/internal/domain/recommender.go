package domain

import "github.com/google/uuid"

// RecommendSegment carries the target context for a recommendation request.
type RecommendSegment struct {
	DepartmentID  *uuid.UUID `json:"department_id,omitempty"`
	PositionLevel *string    `json:"position_level,omitempty"`
	TenureBucket  *string    `json:"tenure_bucket,omitempty"`
}

// RankInterventions returns a scored list of recommendations given
// catalog entries, their posteriors, and a target segment.
// The scoring formula blends Thompson-sampled success probability with
// evidence tier weight: score = 0.6 * thompson + 0.4 * evidence_weight.
func RankInterventions(
	catalog []*Intervention,
	posteriors map[uuid.UUID]*Posterior,
	samples map[uuid.UUID]float64,
	segment RecommendSegment,
) []Recommendation {
	recs := make([]Recommendation, 0, len(catalog))

	for _, interv := range catalog {
		if !interv.Active {
			continue
		}

		thompsonVal := 0.5 // default uniform prior
		expectedSuccess := 0.5
		nObs := 0

		if s, ok := samples[interv.ID]; ok {
			thompsonVal = s
		}
		if p, ok := posteriors[interv.ID]; ok {
			expectedSuccess = p.ExpectedSuccess()
			nObs = p.NObservations
		}

		evidenceWt := EvidenceWeight(interv.EvidenceTier)
		score := 0.6*thompsonVal + 0.4*evidenceWt

		rationale := buildRationale(interv, nObs, expectedSuccess)

		recs = append(recs, Recommendation{
			InterventionID:  interv.ID,
			Code:            interv.Code,
			TitleTR:         interv.TitleTR,
			Category:        interv.Category,
			EvidenceTier:    interv.EvidenceTier,
			Score:           score,
			ThompsonSample:  thompsonVal,
			ExpectedSuccess: expectedSuccess,
			NObservations:   nObs,
			RationaleTR:     rationale,
		})
	}

	// Sort by score descending
	for i := 0; i < len(recs); i++ {
		for j := i + 1; j < len(recs); j++ {
			if recs[j].Score > recs[i].Score {
				recs[i], recs[j] = recs[j], recs[i]
			}
		}
	}

	return recs
}

func buildRationale(interv *Intervention, nObs int, expectedSuccess float64) string {
	if nObs == 0 {
		switch interv.EvidenceTier {
		case EvidenceTierA:
			return "Meta-analitik kanitlara dayali yuksek guvenilirlik. Henuz kurum ici veri yok."
		case EvidenceTierB:
			return "Birden fazla calismayla desteklenmis. Henuz kurum ici veri yok."
		default:
			return "Teorik temele dayali. Henuz kurum ici veri yok."
		}
	}
	if expectedSuccess >= 0.7 {
		return "Kurum ici verilere gore yuksek basari orani."
	}
	if expectedSuccess >= 0.4 {
		return "Kurum ici verilere gore orta duzeyde basari orani."
	}
	return "Kurum ici verilere gore dusuk basari orani, ancak kanit guclu."
}
