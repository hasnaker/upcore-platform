// Package stats provides statistical functions for intervention effectiveness analysis.
package stats

import "math"

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
