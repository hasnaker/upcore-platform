package domain

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCanTransitionStage_ValidTransitions(t *testing.T) {
	tests := []struct {
		from, to Stage
		allowed  bool
	}{
		// Forward transitions.
		{StageApplied, StageScreened, true},
		{StageScreened, StageAssessed, true},
		{StageAssessed, StageInterviewed, true},
		{StageInterviewed, StageOffered, true},
		{StageOffered, StageHired, true},

		// Rejection from any non-terminal stage.
		{StageApplied, StageRejected, true},
		{StageScreened, StageRejected, true},
		{StageAssessed, StageRejected, true},
		{StageInterviewed, StageRejected, true},
		{StageOffered, StageRejected, true},

		// Withdrawal from any non-terminal stage.
		{StageApplied, StageWithdrawn, true},
		{StageScreened, StageWithdrawn, true},

		// Invalid forward skips.
		{StageApplied, StageAssessed, false},
		{StageApplied, StageInterviewed, false},
		{StageApplied, StageOffered, false},
		{StageApplied, StageHired, false},
		{StageScreened, StageOffered, false},

		// Terminal states cannot transition.
		{StageHired, StageApplied, false},
		{StageHired, StageRejected, false},
		{StageRejected, StageApplied, false},
		{StageRejected, StageScreened, false},
		{StageWithdrawn, StageApplied, false},

		// Self-transition.
		{StageApplied, StageApplied, false},
		{StageHired, StageHired, false},

		// Backward transitions.
		{StageScreened, StageApplied, false},
		{StageInterviewed, StageAssessed, false},
	}

	for _, tc := range tests {
		t.Run(string(tc.from)+"->"+string(tc.to), func(t *testing.T) {
			result := CanTransitionStage(tc.from, tc.to)
			assert.Equal(t, tc.allowed, result)
		})
	}
}

func TestValidTransitions(t *testing.T) {
	targets := ValidTransitions(StageApplied)
	require.Len(t, targets, 3)
	assert.Contains(t, targets, StageScreened)
	assert.Contains(t, targets, StageRejected)
	assert.Contains(t, targets, StageWithdrawn)

	// Terminal stage has no transitions.
	targets = ValidTransitions(StageHired)
	assert.Nil(t, targets)
}

func TestTransition_Success(t *testing.T) {
	app := &Application{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		CurrentStage: StageApplied,
	}
	actor := uuid.New()

	evt, err := Transition(app, StageScreened, actor, "")
	require.NoError(t, err)
	assert.Equal(t, StageScreened, app.CurrentStage)
	assert.NotNil(t, evt)
	assert.Equal(t, EventStageChanged, evt.EventType)
	assert.Equal(t, &StageApplied, evt.FromStage)

	toStage := StageScreened
	assert.Equal(t, &toStage, evt.ToStage)
}

func TestTransition_Invalid(t *testing.T) {
	app := &Application{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		CurrentStage: StageApplied,
	}

	_, err := Transition(app, StageOffered, uuid.Nil, "")
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrInvalidTransition)
}

func TestTransition_TerminalRejects(t *testing.T) {
	app := &Application{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		CurrentStage: StageHired,
	}

	_, err := Transition(app, StageRejected, uuid.Nil, "")
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrTerminalStage)
}

func TestTransition_RejectionWithReason(t *testing.T) {
	app := &Application{
		ID:           uuid.New(),
		TenantID:     uuid.New(),
		CurrentStage: StageScreened,
	}

	_, err := Transition(app, StageRejected, uuid.New(), "overqualified")
	require.NoError(t, err)
	assert.Equal(t, StageRejected, app.CurrentStage)
	require.NotNil(t, app.RejectionReason)
	assert.Equal(t, "overqualified", *app.RejectionReason)
}

func TestStage_IsTerminal(t *testing.T) {
	assert.True(t, StageHired.IsTerminal())
	assert.True(t, StageRejected.IsTerminal())
	assert.True(t, StageWithdrawn.IsTerminal())
	assert.False(t, StageApplied.IsTerminal())
	assert.False(t, StageScreened.IsTerminal())
	assert.False(t, StageOffered.IsTerminal())
}
