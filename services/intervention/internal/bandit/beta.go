package bandit

import (
	"math"
	"math/rand"
	"sync"
	"time"
)

// RNG is a goroutine-safe random source for sampling.
type RNG struct {
	mu sync.Mutex
	r  *rand.Rand
}

// NewRNG creates a new RNG seeded with the current time.
func NewRNG() *RNG {
	// nolint:gosec // not used for crypto
	return &RNG{r: rand.New(rand.NewSource(time.Now().UnixNano()))}
}

// NewRNGWithSeed creates a deterministic RNG (for tests).
func NewRNGWithSeed(seed int64) *RNG {
	// nolint:gosec // not used for crypto
	return &RNG{r: rand.New(rand.NewSource(seed))}
}

// Float64 returns a uniform random float in [0, 1).
func (g *RNG) Float64() float64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.r.Float64()
}

// NormFloat64 returns a standard-normal random variate.
func (g *RNG) NormFloat64() float64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.r.NormFloat64()
}

// ExpFloat64 returns an exponential variate with rate 1.
func (g *RNG) ExpFloat64() float64 {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.r.ExpFloat64()
}

// Gamma draws from Gamma(shape, 1) using the Marsaglia-Tsang method
// for shape >= 1, and the Ahrens-Dieter boost for shape in (0, 1).
func (g *RNG) Gamma(shape float64) float64 {
	if shape <= 0 {
		return 0
	}
	if shape < 1 {
		// Boost: if X ~ Gamma(shape+1), U ~ Uniform(0,1), then X * U^(1/shape) ~ Gamma(shape)
		u := g.Float64()
		// Guard against u=0
		if u == 0 {
			u = 1e-300
		}
		return g.Gamma(shape+1) * math.Pow(u, 1.0/shape)
	}
	// Marsaglia & Tsang 2000
	d := shape - 1.0/3.0
	c := 1.0 / math.Sqrt(9.0*d)
	for {
		var x, v float64
		for {
			x = g.NormFloat64()
			v = 1.0 + c*x
			if v > 0 {
				break
			}
		}
		v = v * v * v
		u := g.Float64()
		xsq := x * x
		if u < 1.0-0.0331*xsq*xsq {
			return d * v
		}
		if math.Log(u) < 0.5*xsq+d*(1.0-v+math.Log(v)) {
			return d * v
		}
	}
}

// Beta draws from Beta(alpha, beta) using two Gamma variates.
func (g *RNG) Beta(alpha, beta float64) float64 {
	if alpha <= 0 || beta <= 0 {
		return 0
	}
	x := g.Gamma(alpha)
	y := g.Gamma(beta)
	if x+y == 0 {
		return 0
	}
	return x / (x + y)
}
