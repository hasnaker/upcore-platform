package stats_test

import (
	"math"
	"testing"

	"github.com/upcore/intervention/internal/stats"
)

func TestCohensD_ZeroForMismatchedLengths(t *testing.T) {
	if got := stats.CohensD([]float64{1, 2}, []float64{1}); got != 0 {
		t.Fatalf("mismatched lengths: got %v, want 0", got)
	}
}

func TestCohensD_PositiveWhenPostLower(t *testing.T) {
	pre := []float64{4.0, 4.2, 3.8, 4.1, 4.3, 3.9, 4.0, 4.2, 3.7, 4.1}
	post := []float64{3.5, 3.4, 3.2, 3.3, 3.6, 3.1, 3.2, 3.4, 3.0, 3.3}
	d := stats.CohensD(pre, post)
	if d <= 0 {
		t.Fatalf("expected positive d, got %v", d)
	}
}

func TestCohensDCI_InsufficientSampleReturnsNaN(t *testing.T) {
	pre := []float64{4.0, 3.9, 3.8}
	post := []float64{3.2, 3.1, 3.0}
	d, low, high := stats.CohensDCI(pre, post)
	if !math.IsNaN(d) || !math.IsNaN(low) || !math.IsNaN(high) {
		t.Fatalf("expected NaN triple for n<MinSampleSize, got d=%v low=%v high=%v", d, low, high)
	}
}

func TestCohensDCI_BracketsPointEstimate(t *testing.T) {
	pre := []float64{4.0, 4.2, 3.8, 4.1, 4.3, 3.9, 4.0, 4.2, 3.7, 4.1, 4.2, 3.8}
	post := []float64{3.5, 3.4, 3.2, 3.3, 3.6, 3.1, 3.2, 3.4, 3.0, 3.3, 3.5, 3.1}
	d, low, high := stats.CohensDCI(pre, post)
	if math.IsNaN(d) {
		t.Fatalf("expected real d")
	}
	if !(low < d && d < high) {
		t.Fatalf("CI does not bracket d: [%v, %v] vs %v", low, high, d)
	}
	if high-low <= 0 {
		t.Fatalf("CI width must be positive")
	}
}

func TestCohensDCI_MismatchedLengthsReturnsNaN(t *testing.T) {
	d, low, high := stats.CohensDCI(
		[]float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10},
		[]float64{1, 2, 3},
	)
	if !math.IsNaN(d) || !math.IsNaN(low) || !math.IsNaN(high) {
		t.Fatalf("expected NaN triple")
	}
}

func TestPairedTTest_SmallP(t *testing.T) {
	pre := []float64{4.0, 4.1, 4.2, 4.0, 4.3, 4.1, 4.2, 4.0, 4.1, 4.2}
	post := []float64{3.0, 3.1, 3.2, 3.0, 3.3, 3.1, 3.2, 3.0, 3.1, 3.2}
	_, p := stats.PairedTTest(pre, post)
	if p >= 0.05 {
		t.Fatalf("expected statistically significant effect, got p=%v", p)
	}
}
