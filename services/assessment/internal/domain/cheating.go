package domain

import "encoding/json"

// CheatingMetrics tracks anti-cheating signals during a test session.
type CheatingMetrics struct {
	FocusLostCount  int       `json:"focus_lost_count"`
	TimePerQuestion []float64 `json:"time_per_question_seconds"`
	SuspiciousFlags []string  `json:"suspicious_flags"`
}

// NewCheatingMetrics returns an initialised CheatingMetrics.
func NewCheatingMetrics() *CheatingMetrics {
	return &CheatingMetrics{
		TimePerQuestion: make([]float64, 0),
		SuspiciousFlags: make([]string, 0),
	}
}

// Evaluate checks the metrics and populates suspicious flags.
// Rules:
//   - focus_lost > maxFocusLost  -> "excessive_focus_loss"
//   - any question < minTimeSec  -> "rapid_response"
//   - total time < expectedTotal/3 -> "suspiciously_fast"
func (m *CheatingMetrics) Evaluate(maxFocusLost int, minTimeSec float64, expectedTotalSec float64) {
	m.SuspiciousFlags = make([]string, 0)

	if m.FocusLostCount > maxFocusLost {
		m.SuspiciousFlags = append(m.SuspiciousFlags, "excessive_focus_loss")
	}

	for _, t := range m.TimePerQuestion {
		if t < minTimeSec {
			m.SuspiciousFlags = append(m.SuspiciousFlags, "rapid_response")
			break
		}
	}

	if expectedTotalSec > 0 {
		var totalSpent float64
		for _, t := range m.TimePerQuestion {
			totalSpent += t
		}
		if totalSpent > 0 && totalSpent < expectedTotalSec/3 {
			m.SuspiciousFlags = append(m.SuspiciousFlags, "suspiciously_fast")
		}
	}
}

// IsSuspicious returns true when any flags are present.
func (m *CheatingMetrics) IsSuspicious() bool {
	return len(m.SuspiciousFlags) > 0
}

// RecordFocusLost increments the focus lost counter.
func (m *CheatingMetrics) RecordFocusLost() {
	m.FocusLostCount++
}

// RecordQuestionTime adds a time measurement for a question.
func (m *CheatingMetrics) RecordQuestionTime(seconds float64) {
	m.TimePerQuestion = append(m.TimePerQuestion, seconds)
}

// ToJSONB serialises CheatingMetrics to JSONB.
func (m *CheatingMetrics) ToJSONB() JSONB {
	b, err := json.Marshal(m)
	if err != nil {
		return JSONB("{}")
	}
	return JSONB(b)
}

// ParseCheatingMetrics deserialises JSONB into CheatingMetrics.
func ParseCheatingMetrics(data JSONB) *CheatingMetrics {
	if len(data) == 0 {
		return NewCheatingMetrics()
	}
	var m CheatingMetrics
	if err := json.Unmarshal(data, &m); err != nil {
		return NewCheatingMetrics()
	}
	if m.TimePerQuestion == nil {
		m.TimePerQuestion = make([]float64, 0)
	}
	if m.SuspiciousFlags == nil {
		m.SuspiciousFlags = make([]string, 0)
	}
	return &m
}
