// Package stats provides statistical functions for intervention effectiveness analysis.
package stats

import "math"

// MinSampleSize is the minimum paired-observation count for a reportable effect
// size. Below this threshold the UI renders "insufficient data" rather than a
// noisy point estimate.
const MinSampleSize = 10

// CohensD computes the effect size (Cohen's d) for paired pre/post measurements.
// d = mean(pre - post) / pooled_sd
// A positive d means improvement (burnout decreased).
func CohensD(pre, post []float64) float64 {
	n := len(pre)
	if n == 0 || n != len(post) {
		return 0
	}

	diffs := make([]float64, n)
	var sumDiff float64
	for i := range pre {
		diffs[i] = pre[i] - post[i]
		sumDiff += diffs[i]
	}
	meanDiff := sumDiff / float64(n)

	sd := PooledStdDev(pre, post)
	if sd == 0 {
		return 0
	}
	return meanDiff / sd
}

// CohensDCI returns the 95% confidence interval around Cohen's d for paired
// samples using the Hedges–Olkin approximation:
//
//	SE(d) = sqrt(1/n + d^2 / (2n))
//	CI    = d ± t_{df, 0.975} * SE(d)
//
// The degrees of freedom are df = n - 1. For n < MinSampleSize this function
// returns (NaN, NaN, NaN) so that callers can surface an "insufficient data"
// state instead of a misleading interval.
func CohensDCI(pre, post []float64) (d, low, high float64) {
	n := len(pre)
	if n < MinSampleSize || n != len(post) {
		nan := math.NaN()
		return nan, nan, nan
	}
	d = CohensD(pre, post)
	if math.IsNaN(d) || math.IsInf(d, 0) {
		nan := math.NaN()
		return nan, nan, nan
	}
	se := math.Sqrt(1.0/float64(n) + (d*d)/(2.0*float64(n)))
	tCrit := tInverseTwoSided(0.95, float64(n-1))
	low = d - tCrit*se
	high = d + tCrit*se
	return d, low, high
}

// PooledStdDev computes the pooled standard deviation of two samples.
// s_pooled = sqrt((s1^2 + s2^2) / 2)
func PooledStdDev(a, b []float64) float64 {
	sa := stddev(a)
	sb := stddev(b)
	return math.Sqrt((sa*sa + sb*sb) / 2)
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	var s float64
	for _, v := range values {
		s += v
	}
	return s / float64(len(values))
}

func stddev(values []float64) float64 {
	n := len(values)
	if n < 2 {
		return 0
	}
	m := mean(values)
	var ss float64
	for _, v := range values {
		d := v - m
		ss += d * d
	}
	return math.Sqrt(ss / float64(n-1))
}

// tInverseTwoSided returns the two-sided t critical value such that
// P(-t <= T <= t) = conf. Uses bisection on the regularized incomplete beta
// CDF already available in this package. Accurate to ~1e-6.
func tInverseTwoSided(conf, df float64) float64 {
	if df <= 0 {
		return math.NaN()
	}
	if conf <= 0 {
		return 0
	}
	if conf >= 1 {
		return math.Inf(1)
	}
	alpha := 1.0 - conf
	// Bisect on |t| over a generous range.
	lo, hi := 0.0, 50.0
	for i := 0; i < 100; i++ {
		mid := (lo + hi) / 2
		p := approxTwoTailedP(mid, df)
		if p > alpha {
			lo = mid
		} else {
			hi = mid
		}
		if hi-lo < 1e-7 {
			break
		}
	}
	return (lo + hi) / 2
}
