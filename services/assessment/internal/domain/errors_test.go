package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidationError_Error(t *testing.T) {
	ve := NewValidationError(map[string]string{
		"field1": "required",
		"field2": "invalid",
	})
	assert.Equal(t, "validation failed", ve.Error())
	assert.Len(t, ve.Fields, 2)
	assert.Equal(t, "required", ve.Fields["field1"])
	assert.Equal(t, "invalid", ve.Fields["field2"])
}

func TestSessionStatus_IsValid(t *testing.T) {
	assert.True(t, SessionActive.IsValid())
	assert.True(t, SessionPaused.IsValid())
	assert.True(t, SessionCompleted.IsValid())
	assert.True(t, SessionTimedOut.IsValid())
	assert.False(t, SessionStatus("invalid").IsValid())
}
