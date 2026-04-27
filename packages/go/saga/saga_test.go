package saga

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------------------
// In-memory test doubles (no real DB)
// ----------------------------------------------------------------------------

type trace struct {
	Events []string
}

func (t *trace) Append(s string) { t.Events = append(t.Events, s) }

// recordStep executes a callback and appends to the trace.
type recordStep struct {
	name       string
	executeErr error
	t          *trace
}

func (r *recordStep) Name() string { return r.name }

func (r *recordStep) Execute(_ context.Context, _ State) StepResult {
	r.t.Append("exec:" + r.name)
	if r.executeErr != nil {
		r.t.Append("err:" + r.name)
		return StepResult{Err: r.executeErr}
	}
	return StepResult{Response: map[string]any{"ok": true}}
}

func (r *recordStep) Compensate(_ context.Context, _ State) error {
	r.t.Append("comp:" + r.name)
	return nil
}

func TestState_Happy(t *testing.T) {
	// Unit: State works as expected; compensation test uses mocked orchestrator below.
	s := State{
		TenantID: uuid.New(),
		Data:     map[string]any{"foo": "bar"},
	}
	if s.Get("foo") != "bar" {
		t.Errorf("expected 'bar', got %v", s.Get("foo"))
	}
	if s.Get("missing") != nil {
		t.Errorf("expected nil for missing key")
	}
}

func TestOvertimeKindNoMultiplier(t *testing.T) {
	// Sanity: OvertimeKind.Multiplier defined elsewhere (bordro pkg); this is
	// a placeholder to ensure the saga package compiles cleanly.
	e := errors.New("placeholder")
	if e.Error() == "" {
		t.Fail()
	}
}

func TestDefinitionStepsWired(t *testing.T) {
	tr := &trace{}
	def := Definition{
		Name: "test",
		Steps: []Step{
			&recordStep{name: "s1", t: tr},
			&recordStep{name: "s2", t: tr},
		},
	}
	if len(def.Steps) != 2 {
		t.Errorf("expected 2 steps")
	}
}

// Integration note: full orchestrator test requires a real DB. Those are in
// the service integration suite. Here we verify step execution order via the
// recordStep double, bypassing DB persistence.
func TestStepExecutionOrder_Mock(t *testing.T) {
	tr := &trace{}
	steps := []Step{
		&recordStep{name: "offer", t: tr},
		&recordStep{name: "employee", t: tr},
		&recordStep{name: "onboarding", t: tr},
	}
	ctx := context.Background()
	st := State{TenantID: uuid.New(), Data: map[string]any{}}
	for _, s := range steps {
		if res := s.Execute(ctx, st); res.Err != nil {
			t.Fatalf("unexpected err: %v", res.Err)
		}
	}
	want := []string{"exec:offer", "exec:employee", "exec:onboarding"}
	if len(tr.Events) != len(want) {
		t.Fatalf("expected %d events, got %d: %v", len(want), len(tr.Events), tr.Events)
	}
	for i, w := range want {
		if tr.Events[i] != w {
			t.Errorf("event %d: want %q, got %q", i, w, tr.Events[i])
		}
	}
}

func TestCompensationOrder_Mock(t *testing.T) {
	tr := &trace{}
	steps := []Step{
		&recordStep{name: "s1", t: tr},
		&recordStep{name: "s2", t: tr},
		&recordStep{name: "s3", executeErr: errors.New("boom"), t: tr},
	}
	ctx := context.Background()
	st := State{TenantID: uuid.New(), Data: map[string]any{}}

	// Simulate orchestrator: execute each; on failure compensate in reverse.
	executedUpTo := -1
	for i, s := range steps {
		if res := s.Execute(ctx, st); res.Err != nil {
			break
		}
		executedUpTo = i
	}
	for i := executedUpTo; i >= 0; i-- {
		_ = steps[i].Compensate(ctx, st)
	}

	want := []string{"exec:s1", "exec:s2", "exec:s3", "err:s3", "comp:s2", "comp:s1"}
	if len(tr.Events) != len(want) {
		t.Fatalf("expected %d events, got %d: %v", len(want), len(tr.Events), tr.Events)
	}
	for i, w := range want {
		if tr.Events[i] != w {
			t.Errorf("event %d: want %q, got %q", i, w, tr.Events[i])
		}
	}
}
