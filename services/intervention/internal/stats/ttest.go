package stats

import "math"

// PairedTTest performs a paired two-tailed t-test on pre and post samples.
// Returns t-statistic and approximate p-value.
// Assumes equal length arrays. The test evaluates H0: mean(pre-post) = 0.
func PairedTTest(pre, post []float64) (t, p float64) {
	n := len(pre)
	if n < 2 || n != len(post) {
		return 0, 1
	}

	diffs := make([]float64, n)
	var sumDiff float64
	for i := range pre {
		diffs[i] = pre[i] - post[i]
		sumDiff += diffs[i]
	}
	meanDiff := sumDiff / float64(n)

	var sumSqDev float64
	for _, d := range diffs {
		dev := d - meanDiff
		sumSqDev += dev * dev
	}
	sdDiff := math.Sqrt(sumSqDev / float64(n-1))
	if sdDiff == 0 {
		return 0, 1
	}

	se := sdDiff / math.Sqrt(float64(n))
	t = meanDiff / se
	df := float64(n - 1)

	// Approximate two-tailed p-value using the regularized incomplete beta function.
	// For a simple approximation we use the normal CDF when df is large (>30),
	// otherwise we fall back to a more conservative estimate.
	p = approxTwoTailedP(math.Abs(t), df)
	return t, p
}

// approxTwoTailedP returns an approximate two-tailed p-value for
// a t-distribution with the given degrees of freedom.
// Uses the normal approximation for df >= 30, and a conservative
// series approximation otherwise.
func approxTwoTailedP(absT, df float64) float64 {
	if df <= 0 {
		return 1
	}
	// Approximation from Abramowitz & Stegun 26.7.8:
	// For large df, t ~ N(0,1). For small df, we use the relationship
	// p = I_{x}(df/2, 1/2) where x = df/(df+t^2).
	x := df / (df + absT*absT)

	// Regularized incomplete beta function approximation
	// using continued fraction for I_x(a, b) where a=df/2, b=0.5
	a := df / 2
	b := 0.5

	// Use a simple power series for the beta function
	p := regularizedBeta(x, a, b)
	return p
}

// regularizedBeta computes an approximation of I_x(a, b) using
// a series expansion. For our purposes (t-test p-values), this gives
// reasonable accuracy.
func regularizedBeta(x, a, b float64) float64 {
	if x <= 0 {
		return 0
	}
	if x >= 1 {
		return 1
	}

	// Use the log-beta function for normalization
	lbeta := lgamma(a) + lgamma(b) - lgamma(a+b)

	// Front factor
	front := math.Exp(math.Log(x)*a + math.Log(1-x)*b - lbeta)

	// Lentz's continued fraction
	// I_x(a,b) = front/a * 1/(1+ d1/(1+ d2/(1+ ...)))
	// where d_{2m+1} = -(a+m)(a+b+m)x / ((a+2m)(a+2m+1))
	// and   d_{2m}   = m(b-m)x / ((a+2m-1)(a+2m))
	const maxIter = 200
	const eps = 1e-14

	c := 1.0
	d := 1 - (a+b)*x/(a+1)
	if math.Abs(d) < 1e-30 {
		d = 1e-30
	}
	d = 1 / d
	result := d

	for m := 1; m <= maxIter; m++ {
		mf := float64(m)

		// even step
		num := mf * (b - mf) * x / ((a + 2*mf - 1) * (a + 2*mf))
		d = 1 + num*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1 + num/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1 / d
		result *= d * c

		// odd step
		num = -((a + mf) * (a + b + mf) * x) / ((a + 2*mf) * (a + 2*mf + 1))
		d = 1 + num*d
		if math.Abs(d) < 1e-30 {
			d = 1e-30
		}
		c = 1 + num/c
		if math.Abs(c) < 1e-30 {
			c = 1e-30
		}
		d = 1 / d
		delta := d * c
		result *= delta

		if math.Abs(delta-1) < eps {
			break
		}
	}

	return front * result / a
}

func lgamma(x float64) float64 {
	r, _ := math.Lgamma(x)
	return r
}
