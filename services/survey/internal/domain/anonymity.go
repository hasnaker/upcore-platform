package domain

// MinRespondents is the minimum number of distinct respondents required to
// reveal aggregate statistics. Matches the V1 product requirement (N=5).
const MinRespondents = 5

// CanReveal reports whether aggregate statistics may be returned to the
// caller given the number of respondents (n) and configured minimum (minN).
func CanReveal(n, minN int) bool {
	if minN <= 0 {
		minN = MinRespondents
	}
	return n >= minN
}

// Segment describes an aggregate bucket keyed by segment type + key.
type Segment struct {
	Type string `json:"type"`
	Key  string `json:"key"`
	N    int    `json:"n"`
}

// AggregateStat is the numeric summary of a single dimension for a segment.
type AggregateStat struct {
	Dimension  string  `json:"dimension"`
	Mean       float64 `json:"mean"`
	StdDev     float64 `json:"stddev"`
	N          int     `json:"n"`
	Suppressed bool    `json:"suppressed"`
	Reason     string  `json:"reason,omitempty"`
}

// SuppressLowN zeroes out stats whose N is below the configured minimum,
// marking them as suppressed with the configured reason. The returned
// slice is safe to emit to API callers without leaking individual data.
func SuppressLowN(stats []AggregateStat, minN int) []AggregateStat {
	if minN <= 0 {
		minN = MinRespondents
	}
	out := make([]AggregateStat, len(stats))
	for i, s := range stats {
		if s.N < minN {
			out[i] = AggregateStat{
				Dimension:  s.Dimension,
				N:          s.N,
				Suppressed: true,
				Reason:     "insufficient_respondents",
			}
			continue
		}
		out[i] = s
	}
	return out
}
