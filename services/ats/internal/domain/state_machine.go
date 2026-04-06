package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// transitionMatrix defines which stage transitions are allowed.
// Terminal stages (hired, rejected, withdrawn) allow no further transitions.
var transitionMatrix = map[Stage][]Stage{
	StageApplied:     {StageScreened, StageRejected, StageWithdrawn},
	StageScreened:    {StageAssessed, StageRejected, StageWithdrawn},
	StageAssessed:    {StageInterviewed, StageRejected, StageWithdrawn},
	StageInterviewed: {StageOffered, StageRejected, StageWithdrawn},
	StageOffered:     {StageHired, StageRejected, StageWithdrawn},
}

// CanTransitionStage reports whether a pipeline stage transition is allowed.
func CanTransitionStage(from, to Stage) bool {
	if !from.IsValid() || !to.IsValid() {
		return false
	}
	if from == to {
		return false
	}
	allowed, ok := transitionMatrix[from]
	if !ok {
		// Terminal stages or unknown stages cannot transition.
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// ValidTransitions returns the list of stages an application can move to from
// the given stage.
func ValidTransitions(from Stage) []Stage {
	if targets, ok := transitionMatrix[from]; ok {
		out := make([]Stage, len(targets))
		copy(out, targets)
		return out
	}
	return nil
}

// Transition validates and applies a stage transition to an application.
// It returns a StageTransitionError when the transition is invalid.
func Transition(app *Application, to Stage, actorID uuid.UUID, reason string) (*ApplicationEvent, error) {
	if app.IsTerminal() {
		return nil, ErrTerminalStage
	}
	if !CanTransitionStage(app.CurrentStage, to) {
		return nil, &StageTransitionError{From: app.CurrentStage, To: to}
	}

	from := app.CurrentStage
	now := time.Now().UTC()
	app.CurrentStage = to
	app.StageEnteredAt = now
	app.UpdatedAt = now

	if to == StageRejected && reason != "" {
		app.RejectionReason = &reason
	}

	evt := &ApplicationEvent{
		ID:            uuid.New(),
		TenantID:      app.TenantID,
		ApplicationID: app.ID,
		EventType:     EventStageChanged,
		FromStage:     &from,
		ToStage:       &to,
		CreatedAt:     now,
	}
	if actorID != uuid.Nil {
		evt.ActorID = &actorID
	}

	return evt, nil
}

// StageTransitionError explains why a transition was rejected.
type StageTransitionError struct {
	From Stage
	To   Stage
}

// Error satisfies error.
func (e *StageTransitionError) Error() string {
	return fmt.Sprintf("invalid stage transition: %s -> %s", e.From, e.To)
}

// Unwrap returns the sentinel for errors.Is matching.
func (e *StageTransitionError) Unwrap() error {
	return ErrInvalidTransition
}
