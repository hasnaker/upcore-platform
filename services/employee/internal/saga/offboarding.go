package saga

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/service"
	"github.com/upcore/saga"
)

// OffboardingSagaDeps bundles the services required by the steps.
type OffboardingSagaDeps struct {
	Employees    *service.EmployeeService
	Careers      *service.CareerService
	Offboarding  *service.OffboardingService
	Log          zerolog.Logger
}

// Offboarding returns the offboarding_v1 saga definition.
//
// Required state keys:
//   - "employee_id"       (uuid)
//   - "actor_id"          (uuid)      — employee operasyonunu başlatan kullanıcı
//   - "termination_date"  (string YYYY-MM-DD)
//   - "reason"            (string)    — istifa/iş akdi feshi vb.
//   - "departure_type"    (string)    — voluntary_resignation, involuntary_termination, retirement, end_of_contract
//   - "last_working_day"  (string YYYY-MM-DD) — son çalışma günü
//
// Adımlar: terminate employee → append career event (termination) → start
// offboarding checklist. Compensation: employee reinstate (career/offboarding
// immutable — audit trail bozulmaz, sadece status geri alınır).
func Offboarding(deps OffboardingSagaDeps) saga.Definition {
	return saga.Definition{
		Name: "offboarding_v1",
		Steps: []saga.Step{
			&terminateEmployeeStep{deps: deps},
			&appendTerminationCareerStep{deps: deps},
			&startOffboardingChecklistStep{deps: deps},
		},
	}
}

// ----------------------------------------------------------------------------
// Step 1: Terminate the employee (status → terminated + termination_date set)
// ----------------------------------------------------------------------------

type terminateEmployeeStep struct{ deps OffboardingSagaDeps }

func (s *terminateEmployeeStep) Name() string { return "terminate_employee" }

func (s *terminateEmployeeStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return saga.StepResult{Err: errors.New("employee_id required")}
	}
	actorID, _ := getUUID(st.Data, "actor_id")
	termDate, _ := st.Data["termination_date"].(string)
	reason, _ := st.Data["reason"].(string)
	if termDate == "" {
		termDate = time.Now().UTC().Format("2006-01-02")
	}

	req := service.TerminateRequest{
		TerminationDate: termDate,
		Reason:          reason,
	}
	emp, err := s.deps.Employees.Terminate(ctx, st.TenantID, empID, actorID, req)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("terminate employee: %w", err)}
	}
	st.Data["employee_terminated_at"] = emp.TerminationDate
	return saga.StepResult{Response: map[string]any{"employee_id": empID, "termination_date": termDate}}
}

func (s *terminateEmployeeStep) Compensate(ctx context.Context, st saga.State) error {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return nil
	}
	if _, err := s.deps.Employees.Reinstate(ctx, st.TenantID, empID); err != nil {
		s.deps.Log.Warn().Err(err).
			Str("employee_id", empID.String()).
			Msg("saga compensate: reinstate failed (manual fix required)")
	}
	return nil
}

// ----------------------------------------------------------------------------
// Step 2: Append career event (termination)
// ----------------------------------------------------------------------------

type appendTerminationCareerStep struct{ deps OffboardingSagaDeps }

func (s *appendTerminationCareerStep) Name() string { return "append_termination_career" }

func (s *appendTerminationCareerStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return saga.StepResult{Err: errors.New("employee_id missing")}
	}
	termDate, _ := st.Data["termination_date"].(string)
	if termDate == "" {
		termDate = time.Now().UTC().Format("2006-01-02")
	}
	reason, _ := st.Data["reason"].(string)
	departureType, _ := st.Data["departure_type"].(string)

	evType := domain.CareerTermination
	if departureType == "retirement" {
		evType = domain.CareerRetire
	}

	req := service.CareerEventRequest{
		EventType:     string(evType),
		EffectiveDate: termDate,
		ReasonTR:      "Saga: offboarding_v1 · " + reason,
		Metadata: map[string]any{
			"departure_type":   departureType,
			"saga":             "offboarding_v1",
			"last_working_day": st.Data["last_working_day"],
		},
	}
	ev, err := s.deps.Careers.Append(ctx, st.TenantID, empID, req)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("append termination career: %w", err)}
	}
	st.Data["career_event_id"] = ev.ID
	return saga.StepResult{Response: map[string]any{"career_event_id": ev.ID}}
}

func (s *appendTerminationCareerStep) Compensate(_ context.Context, _ saga.State) error {
	// Career events are immutable audit trail — leave as-is.
	return nil
}

// ----------------------------------------------------------------------------
// Step 3: Start offboarding checklist (exit interview token included)
// ----------------------------------------------------------------------------

type startOffboardingChecklistStep struct{ deps OffboardingSagaDeps }

func (s *startOffboardingChecklistStep) Name() string { return "start_offboarding_checklist" }

func (s *startOffboardingChecklistStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return saga.StepResult{Err: errors.New("employee_id missing")}
	}
	departureType, _ := st.Data["departure_type"].(string)
	if departureType == "" {
		departureType = "voluntary_resignation"
	}
	noticeDate, _ := st.Data["notice_date"].(string)
	if noticeDate == "" {
		noticeDate = time.Now().UTC().Format("2006-01-02")
	}
	lastWorkingDay, _ := st.Data["last_working_day"].(string)
	if lastWorkingDay == "" {
		lastWorkingDay, _ = st.Data["termination_date"].(string)
	}

	req := service.OffboardingRequest{
		DepartureType:  departureType,
		NoticeDate:     noticeDate,
		LastWorkingDay: lastWorkingDay,
	}
	if v, ok := st.Data["handover_to_id"].(uuid.UUID); ok {
		req.HandoverToID = &v
	}
	event, err := s.deps.Offboarding.Start(ctx, st.TenantID, empID, req)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("start offboarding: %w", err)}
	}
	st.Data["offboarding_event_id"] = event.ID
	return saga.StepResult{Response: map[string]any{"offboarding_event_id": event.ID}}
}

func (s *startOffboardingChecklistStep) Compensate(_ context.Context, _ saga.State) error {
	// Offboarding event cascades via employee FK on termination rollback.
	return nil
}
