package scoring

import "github.com/upcore/survey/internal/domain"

// ComputeENPS calculates the Employee Net Promoter Score from NPS-style answers.
// NPS question: "How likely are you to recommend this company as a workplace?" (0-10)
//
// Classification:
//   - Promoters: 9-10
//   - Passives: 7-8
//   - Detractors: 0-6
//
// eNPS = (% Promoters - % Detractors) * 100
// Score range: -100 to +100
func ComputeENPS(answers []domain.Answer) (promoters, passives, detractors int, score float64) {
	for _, a := range answers {
		if a.ValueInt == nil {
			continue
		}
		v := *a.ValueInt
		switch {
		case v >= 9:
			promoters++
		case v >= 7:
			passives++
		default:
			detractors++
		}
	}

	total := promoters + passives + detractors
	if total == 0 {
		return 0, 0, 0, 0
	}

	score = float64(promoters-detractors) / float64(total) * 100
	return promoters, passives, detractors, score
}
