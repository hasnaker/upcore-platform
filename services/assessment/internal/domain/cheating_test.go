package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheatingMetrics_Evaluate_NoFlags(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 2
	m.TimePerQuestion = []float64{5.0, 6.0, 7.0}

	m.Evaluate(3, 2.0, 50.0) // totalSpent=18 > 50/3=16.67 → no suspiciously_fast flag

	assert.False(t, m.IsSuspicious())
	assert.Empty(t, m.SuspiciousFlags)
}

func TestCheatingMetrics_Evaluate_ExcessiveFocusLoss(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 5
	m.TimePerQuestion = []float64{5.0, 6.0, 7.0}

	m.Evaluate(3, 2.0, 60.0)

	assert.True(t, m.IsSuspicious())
	assert.Contains(t, m.SuspiciousFlags, "excessive_focus_loss")
}

func TestCheatingMetrics_Evaluate_RapidResponse(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 0
	m.TimePerQuestion = []float64{5.0, 1.5, 7.0}

	m.Evaluate(3, 2.0, 60.0)

	assert.True(t, m.IsSuspicious())
	assert.Contains(t, m.SuspiciousFlags, "rapid_response")
}

func TestCheatingMetrics_Evaluate_SuspiciouslyFast(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 0
	m.TimePerQuestion = []float64{3.0, 3.0, 3.0}

	m.Evaluate(3, 2.0, 60.0) // total 9s < 60/3=20s

	assert.True(t, m.IsSuspicious())
	assert.Contains(t, m.SuspiciousFlags, "suspiciously_fast")
}

func TestCheatingMetrics_Evaluate_MultipleFlags(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 10
	m.TimePerQuestion = []float64{0.5, 1.0, 1.5}

	m.Evaluate(3, 2.0, 60.0)

	assert.True(t, m.IsSuspicious())
	assert.Contains(t, m.SuspiciousFlags, "excessive_focus_loss")
	assert.Contains(t, m.SuspiciousFlags, "rapid_response")
	assert.Contains(t, m.SuspiciousFlags, "suspiciously_fast")
}

func TestCheatingMetrics_JSONB_RoundTrip(t *testing.T) {
	m := NewCheatingMetrics()
	m.FocusLostCount = 2
	m.RecordQuestionTime(5.5)
	m.RecordQuestionTime(3.2)
	m.RecordFocusLost()

	j := m.ToJSONB()
	require.NotEmpty(t, j)

	parsed := ParseCheatingMetrics(j)
	assert.Equal(t, 3, parsed.FocusLostCount) // 2 + 1 from RecordFocusLost
	assert.Len(t, parsed.TimePerQuestion, 2)
	assert.InDelta(t, 5.5, parsed.TimePerQuestion[0], 0.01)
	assert.InDelta(t, 3.2, parsed.TimePerQuestion[1], 0.01)
}

func TestParseCheatingMetrics_EmptyData(t *testing.T) {
	m := ParseCheatingMetrics(JSONB{})
	assert.NotNil(t, m)
	assert.Equal(t, 0, m.FocusLostCount)
	assert.Empty(t, m.TimePerQuestion)
	assert.Empty(t, m.SuspiciousFlags)
}

func TestParseCheatingMetrics_InvalidJSON(t *testing.T) {
	m := ParseCheatingMetrics(JSONB("not json"))
	assert.NotNil(t, m)
	assert.Equal(t, 0, m.FocusLostCount)
}
