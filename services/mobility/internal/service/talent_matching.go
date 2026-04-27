package service

import (
	"strings"
)

// TalentMatching computes a 0..1 score between an opportunity's
// required/preferred skills and a candidate's indexed skills.
// Şimdilik Jaccard similarity + preferred skill bonusu; production'da
// cosine similarity üzerinden embedding hesaplanacak.
type TalentMatching struct{}

// NewTalentMatching constructs a stateless matcher.
func NewTalentMatching() *TalentMatching { return &TalentMatching{} }

// Score computes a match score in [0, 1] using skill coverage — the
// proportion of required (and preferred) skills the candidate already holds.
// coverage(R, C) = |R ∩ C| / |R|; weighted 0.7 for required + 0.3 for preferred.
// If no required AND no preferred skills are specified (ill-defined opportunity)
// the score is 0.
func (TalentMatching) Score(required, preferred, candidate []string) float64 {
	cs := toLowerSet(candidate)
	rs := toLowerSet(required)
	ps := toLowerSet(preferred)
	reqScore := coverage(rs, cs)
	prefScore := coverage(ps, cs)
	// When an opportunity only lists preferred skills (no required), treat
	// preferred as the sole signal so score can still reach 1.0.
	if len(rs) == 0 && len(ps) > 0 {
		return clip01(prefScore)
	}
	if len(rs) > 0 && len(ps) == 0 {
		return clip01(reqScore)
	}
	return clip01(0.7*reqScore + 0.3*prefScore)
}

// MissingSkills returns required skills the candidate doesn't yet have
// (gap analysis → feeds development plan recommender).
func (TalentMatching) MissingSkills(required, candidate []string) []string {
	cs := toLowerSet(candidate)
	var out []string
	for _, r := range required {
		if _, ok := cs[strings.ToLower(r)]; !ok {
			out = append(out, r)
		}
	}
	return out
}

func toLowerSet(xs []string) map[string]struct{} {
	s := make(map[string]struct{}, len(xs))
	for _, x := range xs {
		s[strings.ToLower(strings.TrimSpace(x))] = struct{}{}
	}
	delete(s, "")
	return s
}

// coverage returns |target ∩ candidate| / |target|. Empty target → 0.
func coverage(target, candidate map[string]struct{}) float64 {
	if len(target) == 0 {
		return 0
	}
	inter := 0
	for k := range target {
		if _, ok := candidate[k]; ok {
			inter++
		}
	}
	return float64(inter) / float64(len(target))
}

func jaccard(a, b map[string]struct{}) float64 {
	if len(a) == 0 || len(b) == 0 {
		return 0
	}
	inter := 0
	for k := range a {
		if _, ok := b[k]; ok {
			inter++
		}
	}
	union := len(a) + len(b) - inter
	if union == 0 {
		return 0
	}
	return float64(inter) / float64(union)
}

func clip01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
