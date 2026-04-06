package bandit

import "sort"

// Arm carries the Beta posterior parameters for a single intervention.
type Arm struct {
	ID    string
	Alpha float64
	Beta  float64
}

// ThompsonSample draws a success probability from each arm's Beta posterior
// and returns the indices of the top-k arms by sampled value (descending).
func (g *RNG) ThompsonSample(arms []Arm, k int) []int {
	if k <= 0 || len(arms) == 0 {
		return nil
	}
	if k > len(arms) {
		k = len(arms)
	}
	type scored struct {
		idx   int
		value float64
	}
	scores := make([]scored, len(arms))
	for i, a := range arms {
		scores[i] = scored{idx: i, value: g.Beta(a.Alpha, a.Beta)}
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].value > scores[j].value
	})
	out := make([]int, k)
	for i := 0; i < k; i++ {
		out[i] = scores[i].idx
	}
	return out
}

// ThompsonSampleValues returns the sampled Beta value for each arm, in input order.
func (g *RNG) ThompsonSampleValues(arms []Arm) []float64 {
	out := make([]float64, len(arms))
	for i, a := range arms {
		out[i] = g.Beta(a.Alpha, a.Beta)
	}
	return out
}
