// Package scoring implements psychometric instrument scoring algorithms.
package scoring

import "github.com/upcore/survey/internal/domain"

// BAT-12-TR pulse survey scoring.
// The BAT-12 is a 12-item short form of the Burnout Assessment Tool measuring
// four dimensions: exhaustion (3 items), mental_distance (3), cognitive_impairment (3),
// emotional_impairment (3). Items are scored on a 1-5 Likert scale (Never to Always).
//
// Dimensions:
//   - exhaustion: bat12_ex_01, bat12_ex_02, bat12_ex_03
//   - mental_distance: bat12_md_01, bat12_md_02, bat12_md_03
//   - cognitive_impairment: bat12_ci_01, bat12_ci_02, bat12_ci_03
//   - emotional_impairment: bat12_ei_01, bat12_ei_02, bat12_ei_03
//   - overall: mean of all 12 items

var bat12Dimensions = map[string][]string{
	"exhaustion":            {"bat12_ex_01", "bat12_ex_02", "bat12_ex_03"},
	"mental_distance":       {"bat12_md_01", "bat12_md_02", "bat12_md_03"},
	"cognitive_impairment":  {"bat12_ci_01", "bat12_ci_02", "bat12_ci_03"},
	"emotional_impairment":  {"bat12_ei_01", "bat12_ei_02", "bat12_ei_03"},
}

// bat12ReverseItems lists items that are reverse-coded (currently none for BAT-12).
var bat12ReverseItems = map[string]bool{}

// ScoreBAT12Pulse computes dimension means and an overall burnout score
// from a set of answers and items. Returns map[dimension]mean.
func ScoreBAT12Pulse(answers []domain.Answer, items []*domain.Item) map[string]float64 {
	// Build item code -> reverse flag lookup
	reverseMap := make(map[string]bool, len(items))
	for _, item := range items {
		reverseMap[item.ItemCode] = item.ReverseScored
	}

	// Index answers by item code
	answerMap := make(map[string]float64, len(answers))
	for _, a := range answers {
		if a.ValueInt == nil {
			continue
		}
		val := float64(*a.ValueInt)
		if reverseMap[a.ItemCode] || bat12ReverseItems[a.ItemCode] {
			// Reverse score on 1-5 scale: reversed = 6 - original
			val = 6 - val
		}
		answerMap[a.ItemCode] = val
	}

	scores := make(map[string]float64)
	var allValues []float64

	for dimension, itemCodes := range bat12Dimensions {
		var values []float64
		for _, code := range itemCodes {
			if val, ok := answerMap[code]; ok {
				values = append(values, val)
				allValues = append(allValues, val)
			}
		}
		if len(values) > 0 {
			scores[dimension] = mean(values)
		}
	}

	if len(allValues) > 0 {
		scores["overall"] = mean(allValues)
	}

	return scores
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var sum float64
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}
