package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestAssessment_IsExpired(t *testing.T) {
	past := time.Now().UTC().Add(-1 * time.Hour)
	future := time.Now().UTC().Add(1 * time.Hour)

	tests := []struct {
		name      string
		expiresAt *time.Time
		want      bool
	}{
		{"nil expiry", nil, false},
		{"past expiry", &past, true},
		{"future expiry", &future, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := &Assessment{ExpiresAt: tt.expiresAt}
			assert.Equal(t, tt.want, a.IsExpired())
		})
	}
}

func TestAssessment_CanStart(t *testing.T) {
	future := time.Now().UTC().Add(24 * time.Hour)
	past := time.Now().UTC().Add(-1 * time.Hour)

	tests := []struct {
		name   string
		status AssessmentStatus
		exp    *time.Time
		want   bool
	}{
		{"pending future", StatusPending, &future, true},
		{"pending nil", StatusPending, nil, true},
		{"pending expired", StatusPending, &past, false},
		{"in progress", StatusInProgress, &future, false},
		{"completed", StatusCompleted, &future, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := &Assessment{Status: tt.status, ExpiresAt: tt.exp}
			assert.Equal(t, tt.want, a.CanStart())
		})
	}
}

func TestSession_IsTimedOut(t *testing.T) {
	tests := []struct {
		name    string
		limit   int
		elapsed int
		want    bool
	}{
		{"within limit", 3600, 1800, false},
		{"at limit", 3600, 3600, true},
		{"over limit", 3600, 4000, true},
		{"no limit", 0, 999, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &Session{TimeLimitSeconds: tt.limit, ElapsedSeconds: tt.elapsed}
			assert.Equal(t, tt.want, s.IsTimedOut())
		})
	}
}

func TestSession_RemainingSeconds(t *testing.T) {
	tests := []struct {
		name    string
		limit   int
		elapsed int
		want    int
	}{
		{"some remaining", 3600, 1800, 1800},
		{"none remaining", 3600, 3600, 0},
		{"no limit", 0, 100, -1},
		{"over limit", 3600, 4000, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &Session{TimeLimitSeconds: tt.limit, ElapsedSeconds: tt.elapsed}
			assert.Equal(t, tt.want, s.RemainingSeconds())
		})
	}
}

func TestInstrumentCode_IsValid(t *testing.T) {
	assert.True(t, InstrumentBAT12TR.IsValid())
	assert.True(t, InstrumentCOPSOQ.IsValid())
	assert.True(t, InstrumentUpCap.IsValid())
	assert.False(t, InstrumentCode("UNKNOWN").IsValid())
}

func TestInstrumentCode_ItemCount(t *testing.T) {
	assert.Equal(t, 12, InstrumentBAT12TR.ItemCount())
	assert.Equal(t, 44, InstrumentCOPSOQ.ItemCount())
	assert.Equal(t, 60, InstrumentUpCap.ItemCount())
	assert.Equal(t, 0, InstrumentCode("UNKNOWN").ItemCount())
}

func TestAssessmentStatus_IsValid(t *testing.T) {
	assert.True(t, StatusPending.IsValid())
	assert.True(t, StatusInProgress.IsValid())
	assert.True(t, StatusCompleted.IsValid())
	assert.True(t, StatusScored.IsValid())
	assert.True(t, StatusExpired.IsValid())
	assert.True(t, StatusCancelled.IsValid())
	assert.False(t, AssessmentStatus("invalid").IsValid())
}

func TestJSONB_Value(t *testing.T) {
	j := JSONB(`{"key":"value"}`)
	v, err := j.Value()
	assert.NoError(t, err)
	assert.Equal(t, []byte(`{"key":"value"}`), v)
}

func TestJSONB_Value_Empty(t *testing.T) {
	j := JSONB{}
	v, err := j.Value()
	assert.NoError(t, err)
	assert.Equal(t, []byte("{}"), v)
}

func TestJSONB_Value_Invalid(t *testing.T) {
	j := JSONB("not json")
	_, err := j.Value()
	assert.Error(t, err)
}

func TestJSONB_Scan(t *testing.T) {
	var j JSONB
	err := j.Scan([]byte(`{"x":1}`))
	assert.NoError(t, err)
	assert.Equal(t, JSONB(`{"x":1}`), j)
}

func TestJSONB_Scan_Nil(t *testing.T) {
	var j JSONB
	err := j.Scan(nil)
	assert.NoError(t, err)
	assert.Equal(t, JSONB("{}"), j)
}

func TestJSONB_Scan_String(t *testing.T) {
	var j JSONB
	err := j.Scan(`{"y":2}`)
	assert.NoError(t, err)
	assert.Equal(t, JSONB(`{"y":2}`), j)
}

func ptr[T any](v T) *T {
	return &v
}

func newTestUUID() uuid.UUID {
	return uuid.New()
}
