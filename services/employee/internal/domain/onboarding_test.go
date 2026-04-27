package domain

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestResolveTemplate(t *testing.T) {
	t.Run("default_to_standard", func(t *testing.T) {
		tpl, err := ResolveTemplate("")
		if err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if tpl.Name != "standard" {
			t.Errorf("want standard, got %s", tpl.Name)
		}
	})

	t.Run("case_insensitive", func(t *testing.T) {
		tpl, err := ResolveTemplate("  MANAGER  ")
		if err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if tpl.Name != "manager" {
			t.Errorf("want manager, got %s", tpl.Name)
		}
		// manager extends standard, should have more tasks
		std, _ := ResolveTemplate("standard")
		if len(tpl.Tasks) <= len(std.Tasks) {
			t.Errorf("manager should extend standard: mgr=%d std=%d", len(tpl.Tasks), len(std.Tasks))
		}
	})

	t.Run("unknown", func(t *testing.T) {
		_, err := ResolveTemplate("bogus")
		if err != ErrUnknownTemplate {
			t.Errorf("want ErrUnknownTemplate, got %v", err)
		}
	})
}

func TestBuiltInTemplates_UniqueCodesPerTemplate(t *testing.T) {
	for name, tpl := range BuiltInTemplates() {
		seen := map[string]bool{}
		for _, task := range tpl.Tasks {
			if task.Code == "" {
				t.Errorf("%s: empty task code", name)
			}
			if task.TitleTR == "" {
				t.Errorf("%s: empty title for %q", name, task.Code)
			}
			if !task.OwnerRole.IsValid() {
				t.Errorf("%s: invalid owner role for %q: %s", name, task.Code, task.OwnerRole)
			}
			if seen[task.Code] {
				t.Errorf("%s: duplicate task code %q", name, task.Code)
			}
			seen[task.Code] = true
		}
	}
}

func TestTaskSpec_ExpandForChecklist(t *testing.T) {
	start := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	checklist := &OnboardingChecklist{ID: uuid.New(), StartDate: start}
	spec := TaskSpec{
		Code:          "x",
		TitleTR:       "Test",
		DescriptionTR: "desc",
		OwnerRole:     OwnerHR,
		DueDaysOffset: 7,
	}
	task := spec.ExpandForChecklist(checklist, 3)
	if task.ChecklistID != checklist.ID {
		t.Error("checklist id not propagated")
	}
	if task.DueAt != start.AddDate(0, 0, 7) {
		t.Errorf("due_at = %v, want %v", task.DueAt, start.AddDate(0, 0, 7))
	}
	if task.OrderIndex != 3 {
		t.Errorf("order_index = %d want 3", task.OrderIndex)
	}
	if task.Status != TaskPending {
		t.Errorf("status = %s want pending", task.Status)
	}
	if task.TaskDescription == nil || *task.TaskDescription != "desc" {
		t.Errorf("description not set: %v", task.TaskDescription)
	}
}

func TestComputeCompletionPct(t *testing.T) {
	cases := []struct {
		name  string
		tasks []OnboardingTask
		want  int
	}{
		{"empty", nil, 0},
		{"all_pending", []OnboardingTask{
			{Status: TaskPending}, {Status: TaskPending},
		}, 0},
		{"half_done", []OnboardingTask{
			{Status: TaskCompleted}, {Status: TaskPending},
		}, 50},
		{"all_done", []OnboardingTask{
			{Status: TaskCompleted}, {Status: TaskCompleted},
		}, 100},
		{"cancelled_excluded", []OnboardingTask{
			{Status: TaskCompleted}, {Status: TaskCancelled}, {Status: TaskCancelled},
		}, 100},
		{"all_cancelled", []OnboardingTask{
			{Status: TaskCancelled}, {Status: TaskCancelled},
		}, 0},
		{"in_progress_not_done", []OnboardingTask{
			{Status: TaskInProgress}, {Status: TaskCompleted},
		}, 50},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := ComputeCompletionPct(c.tasks); got != c.want {
				t.Errorf("got %d want %d", got, c.want)
			}
		})
	}
}

func TestOnboardingChecklist_Validate(t *testing.T) {
	c := &OnboardingChecklist{
		EmployeeID: uuid.New(),
		StartDate:  time.Now().UTC(),
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		t.Fatalf("expected valid, got %v", err)
	}

	bad := &OnboardingChecklist{}
	err := bad.Validate()
	if err == nil {
		t.Fatal("expected validation error")
	}
	ve, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("wanted *ValidationError got %T", err)
	}
	for _, f := range []string{"employee_id", "start_date"} {
		if _, ok := ve.Fields[f]; !ok {
			t.Errorf("missing field %q (have %v)", f, ve.Fields)
		}
	}
}
