package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInstrumentCode_ScoringEndpoint(t *testing.T) {
	tests := []struct {
		code InstrumentCode
		want string
	}{
		{InstrumentBAT12TR, "/api/v1/score/bat"},
		{InstrumentCOPSOQ, "/api/v1/score/copsoq"},
		{InstrumentUpCap, "/api/v1/score/upcap"},
		{InstrumentCode("UNKNOWN"), ""},
	}
	for _, tt := range tests {
		t.Run(string(tt.code), func(t *testing.T) {
			assert.Equal(t, tt.want, tt.code.ScoringEndpoint())
		})
	}
}

func TestInstrumentCode_TimeLimitMinutes(t *testing.T) {
	assert.Equal(t, 15, InstrumentBAT12TR.TimeLimitMinutes())
	assert.Equal(t, 30, InstrumentCOPSOQ.TimeLimitMinutes())
	assert.Equal(t, 45, InstrumentUpCap.TimeLimitMinutes())
	assert.Equal(t, 90, InstrumentCode("UNKNOWN").TimeLimitMinutes())
}

func TestInstrumentCode_ExpectedTotalSeconds(t *testing.T) {
	// 12 items * 5 seconds = 60
	assert.InDelta(t, 60.0, InstrumentBAT12TR.ExpectedTotalSeconds(), 0.01)
	// 44 items * 5 seconds = 220
	assert.InDelta(t, 220.0, InstrumentCOPSOQ.ExpectedTotalSeconds(), 0.01)
	// 60 items * 5 seconds = 300
	assert.InDelta(t, 300.0, InstrumentUpCap.ExpectedTotalSeconds(), 0.01)
}
