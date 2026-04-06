package bandit

import (
	"math"
	"testing"
)

func TestBetaMeanConvergesToAnalytic(t *testing.T) {
	// Beta(α, β) has mean α/(α+β). With a large number of samples the
	// empirical mean should converge to the analytic one.
	cases := []struct {
		alpha, beta, expected float64
	}{
		{2, 2, 0.5},
		{1, 1, 0.5},
		{5, 1, 5.0 / 6.0},
		{1, 5, 1.0 / 6.0},
		{10, 2, 10.0 / 12.0},
	}
	g := NewRNGWithSeed(42)
	const n = 20000
	for _, c := range cases {
		var sum float64
		for i := 0; i < n; i++ {
			sum += g.Beta(c.alpha, c.beta)
		}
		mean := sum / float64(n)
		if math.Abs(mean-c.expected) > 0.02 {
			t.Fatalf("Beta(%.1f,%.1f): empirical mean %.4f != %.4f", c.alpha, c.beta, mean, c.expected)
		}
	}
}

func TestBetaBoundedInUnitInterval(t *testing.T) {
	g := NewRNGWithSeed(7)
	for i := 0; i < 10000; i++ {
		v := g.Beta(2, 3)
		if v < 0 || v > 1 {
			t.Fatalf("Beta sample outside [0,1]: %v", v)
		}
	}
}

func TestBetaWithShapeBelowOne(t *testing.T) {
	g := NewRNGWithSeed(13)
	for i := 0; i < 5000; i++ {
		v := g.Beta(0.5, 0.5)
		if v < 0 || v > 1 {
			t.Fatalf("Beta(0.5,0.5) sample outside [0,1]: %v", v)
		}
	}
}

func TestThompsonSampleTopK(t *testing.T) {
	g := NewRNGWithSeed(1)
	arms := []Arm{
		{ID: "a", Alpha: 1, Beta: 9},   // low prob ~0.1
		{ID: "b", Alpha: 9, Beta: 1},   // high prob ~0.9
		{ID: "c", Alpha: 5, Beta: 5},   // medium ~0.5
		{ID: "d", Alpha: 20, Beta: 80}, // low ~0.2
	}
	// Run many trials and count how often arm b is the top pick.
	counts := make([]int, len(arms))
	const trials = 2000
	for i := 0; i < trials; i++ {
		idx := g.ThompsonSample(arms, 1)
		counts[idx[0]]++
	}
	// Arm b should dominate.
	if counts[1] < trials*7/10 {
		t.Fatalf("expected arm b to win >=70%%, got %d/%d", counts[1], trials)
	}
	// Arm a should rarely win.
	if counts[0] > trials/10 {
		t.Fatalf("expected arm a to win <=10%%, got %d/%d", counts[0], trials)
	}
}

func TestThompsonSampleReturnsKDistinct(t *testing.T) {
	g := NewRNGWithSeed(2)
	arms := []Arm{{ID: "a", Alpha: 1, Beta: 1}, {ID: "b", Alpha: 1, Beta: 1}, {ID: "c", Alpha: 1, Beta: 1}, {ID: "d", Alpha: 1, Beta: 1}}
	idx := g.ThompsonSample(arms, 3)
	if len(idx) != 3 {
		t.Fatalf("expected 3 indices, got %d", len(idx))
	}
	seen := map[int]bool{}
	for _, i := range idx {
		if seen[i] {
			t.Fatalf("duplicate index: %d", i)
		}
		seen[i] = true
		if i < 0 || i >= len(arms) {
			t.Fatalf("index out of range: %d", i)
		}
	}
}

func TestThompsonSampleKGreaterThanArms(t *testing.T) {
	g := NewRNGWithSeed(3)
	arms := []Arm{{Alpha: 1, Beta: 1}, {Alpha: 2, Beta: 2}}
	idx := g.ThompsonSample(arms, 5)
	if len(idx) != 2 {
		t.Fatalf("expected 2 indices when k > len(arms), got %d", len(idx))
	}
}
