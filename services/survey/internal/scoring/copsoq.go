package scoring

import "github.com/upcore/survey/internal/domain"

// COPSOQ-III-TR scoring.
// The Copenhagen Psychosocial Questionnaire (Turkish validation) measures
// five core domains, each containing multiple subscales:
//
//   - demands: quantitative_demands, work_pace, cognitive_demands, emotional_demands
//   - organization_work: influence, possibilities_for_development, meaning_of_work,
//     commitment_to_workplace
//   - interpersonal: predictability, role_clarity, role_conflicts, quality_of_leadership,
//     social_support, social_community, trust, justice
//   - work_individual: job_satisfaction, work_life_conflict, burnout, stress, sleep
//   - health: self_rated_health, depressive_symptoms, somatic_stress
//
// Items are scored on 0-100 transformed from 5-point Likert scales.
// Higher scores on demands and negative outcomes = worse.
// Higher scores on resources = better.

var copsoqDomains = map[string][]string{
	"demands": {
		"copsoq_qd", "copsoq_wp", "copsoq_cd", "copsoq_ed",
	},
	"organization_work": {
		"copsoq_inf", "copsoq_pod", "copsoq_mow", "copsoq_ctw",
	},
	"interpersonal": {
		"copsoq_pre", "copsoq_rc", "copsoq_rconf", "copsoq_qol",
		"copsoq_ss", "copsoq_sc", "copsoq_tru", "copsoq_jus",
	},
	"work_individual": {
		"copsoq_js", "copsoq_wlc", "copsoq_bo", "copsoq_str", "copsoq_slp",
	},
	"health": {
		"copsoq_srh", "copsoq_dep", "copsoq_som",
	},
}

// copsoqReverseItems lists subscales where higher raw = better (resources).
// For these, we do NOT invert. For demand subscales, higher = worse.
var copsoqResourceSubscales = map[string]bool{
	"copsoq_inf": true, "copsoq_pod": true, "copsoq_mow": true, "copsoq_ctw": true,
	"copsoq_pre": true, "copsoq_rc": true, "copsoq_qol": true,
	"copsoq_ss": true, "copsoq_sc": true, "copsoq_tru": true, "copsoq_jus": true,
	"copsoq_js": true, "copsoq_srh": true,
}

// ScoreCOPSOQ computes domain-level and subscale scores from COPSOQ-III-TR answers.
// Returns map[domain/subscale]score where score is on 0-100 scale.
func ScoreCOPSOQ(answers []domain.Answer, items []*domain.Item) map[string]float64 {
	// Build item -> subscale mapping from item codes (e.g., "copsoq_qd_01" -> "copsoq_qd")
	subscaleItems := make(map[string][]float64)

	reverseMap := make(map[string]bool, len(items))
	for _, item := range items {
		reverseMap[item.ItemCode] = item.ReverseScored
	}

	for _, a := range answers {
		if a.ValueInt == nil {
			continue
		}
		val := float64(*a.ValueInt)
		// Transform from Likert (1-5) to 0-100 scale
		// (val - 1) / 4 * 100
		transformed := (val - 1) / 4 * 100

		if reverseMap[a.ItemCode] {
			transformed = 100 - transformed
		}

		// Extract subscale prefix (e.g., "copsoq_qd" from "copsoq_qd_01")
		subscale := extractSubscale(a.ItemCode)
		if subscale != "" {
			subscaleItems[subscale] = append(subscaleItems[subscale], transformed)
		}
	}

	scores := make(map[string]float64)

	// Compute subscale means
	for subscale, values := range subscaleItems {
		if len(values) > 0 {
			scores[subscale] = mean(values)
		}
	}

	// Compute domain means
	for domainName, subscales := range copsoqDomains {
		var domainValues []float64
		for _, sub := range subscales {
			if s, ok := scores[sub]; ok {
				domainValues = append(domainValues, s)
			}
		}
		if len(domainValues) > 0 {
			scores[domainName] = mean(domainValues)
		}
	}

	return scores
}

// extractSubscale takes "copsoq_qd_01" and returns "copsoq_qd".
func extractSubscale(itemCode string) string {
	// Find the last underscore-number suffix
	n := len(itemCode)
	if n < 4 {
		return itemCode
	}
	// Check if last segment is a number (e.g., "_01")
	for i := n - 1; i >= 0; i-- {
		if itemCode[i] == '_' {
			suffix := itemCode[i+1:]
			isNum := true
			for _, c := range suffix {
				if c < '0' || c > '9' {
					isNum = false
					break
				}
			}
			if isNum && len(suffix) > 0 {
				return itemCode[:i]
			}
			break
		}
	}
	return itemCode
}
