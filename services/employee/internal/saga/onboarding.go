// Package saga wires concrete saga definitions for the employee service.
// The onboarding saga chains: offer.accepted → employee.create →
// onboarding.start → career.append. Compensation unwinds in reverse
// (best-effort, idempotent).
package saga

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/service"
	"github.com/upcore/saga"
)

// OnboardingSagaDeps bundles the services required by the steps.
type OnboardingSagaDeps struct {
	Offers    *service.OfferService
	Employees *service.EmployeeService
	Onboard   *service.OnboardingService
	Careers   *service.CareerService
	Log       zerolog.Logger
}

// Onboarding returns a saga.Definition with all forward + compensate handlers.
// Required state keys:
//   - "offer_id"      (uuid) — kabul edilecek offer
//   - "actor_id"      (uuid) — employee oluşturan kullanıcı
//   - "employee_no"   (string) — yeni employee_no
//
// Optional: "template_name" (string), "hire_date" (YYYY-MM-DD).
func Onboarding(deps OnboardingSagaDeps) saga.Definition {
	return saga.Definition{
		Name: "onboarding_v1",
		Steps: []saga.Step{
			&acceptOfferStep{deps: deps},
			&createEmployeeStep{deps: deps},
			&startOnboardingStep{deps: deps},
			&appendCareerStep{deps: deps},
		},
	}
}

// ----------------------------------------------------------------------------
// Step 1: Accept the offer (idempotent — already-accepted offers pass through)
// ----------------------------------------------------------------------------

type acceptOfferStep struct{ deps OnboardingSagaDeps }

func (s *acceptOfferStep) Name() string { return "accept_offer" }

func (s *acceptOfferStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	offerID, ok := getUUID(st.Data, "offer_id")
	if !ok {
		return saga.StepResult{Err: errors.New("offer_id required")}
	}
	offer, err := s.deps.Offers.Get(ctx, st.TenantID, offerID)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("fetch offer: %w", err)}
	}
	if offer.Status != domain.OfferAccepted {
		if _, err := s.deps.Offers.Accept(ctx, st.TenantID, offerID); err != nil {
			return saga.StepResult{Err: fmt.Errorf("accept offer: %w", err)}
		}
	}
	st.Data["offer"] = offer
	return saga.StepResult{Response: map[string]any{"offer_id": offerID}}
}

func (s *acceptOfferStep) Compensate(ctx context.Context, st saga.State) error {
	offerID, ok := getUUID(st.Data, "offer_id")
	if !ok {
		return nil
	}
	if _, err := s.deps.Offers.Revoke(ctx, st.TenantID, offerID, "saga compensate: onboarding rolled back"); err != nil {
		s.deps.Log.Warn().Err(err).Str("offer_id", offerID.String()).Msg("saga compensate: offer revoke failed (best-effort)")
	}
	return nil
}

// ----------------------------------------------------------------------------
// Step 2: Create employee from offer data
// ----------------------------------------------------------------------------

type createEmployeeStep struct{ deps OnboardingSagaDeps }

func (s *createEmployeeStep) Name() string { return "create_employee" }

func (s *createEmployeeStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	offer, ok := st.Data["offer"].(*domain.OfferLetter)
	if !ok || offer == nil {
		return saga.StepResult{Err: errors.New("offer missing from state")}
	}
	actorID, _ := getUUID(st.Data, "actor_id")
	empNo, _ := st.Data["employee_no"].(string)
	if strings.TrimSpace(empNo) == "" {
		// Fallback: 6 karakter UUID parçası
		empNo = "AUTO-" + offer.ID.String()[:6]
	}
	hireDate := offer.StartDate
	if v, ok := st.Data["hire_date"].(string); ok && v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			hireDate = t
		}
	}

	parts := strings.Fields(strings.TrimSpace(offer.AdSoyad))
	firstName := ""
	lastName := ""
	if len(parts) >= 1 {
		firstName = parts[0]
	}
	if len(parts) >= 2 {
		lastName = strings.Join(parts[1:], " ")
	}
	req := service.CreateEmployeeRequest{
		EmployeeNo: empNo,
		Ad:         firstName,
		Soyad:      lastName,
		HireDate:   hireDate.Format("2006-01-02"),
		EmailIs:    offer.Email,
		Notes:      "Pozisyon: " + offer.PositionTitle,
	}
	if offer.DepartmentID != nil {
		req.DepartmentID = offer.DepartmentID
	}
	if offer.PositionID != nil {
		req.PositionID = offer.PositionID
	}

	emp, err := s.deps.Employees.Create(ctx, st.TenantID, actorID, req)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("create employee: %w", err)}
	}
	st.Data["employee_id"] = emp.ID
	return saga.StepResult{Response: map[string]any{"employee_id": emp.ID}}
}

func (s *createEmployeeStep) Compensate(ctx context.Context, st saga.State) error {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return nil
	}
	if err := s.deps.Employees.Delete(ctx, st.TenantID, empID); err != nil {
		s.deps.Log.Warn().Err(err).Str("employee_id", empID.String()).Msg("saga compensate: employee delete failed")
	}
	return nil
}

// ----------------------------------------------------------------------------
// Step 3: Start onboarding checklist
// ----------------------------------------------------------------------------

type startOnboardingStep struct{ deps OnboardingSagaDeps }

func (s *startOnboardingStep) Name() string { return "start_onboarding" }

func (s *startOnboardingStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return saga.StepResult{Err: errors.New("employee_id missing")}
	}
	tpl, _ := st.Data["template_name"].(string)
	cl, err := s.deps.Onboard.Start(ctx, st.TenantID, empID, service.StartRequest{TemplateName: tpl})
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("start onboarding: %w", err)}
	}
	st.Data["checklist_id"] = cl.ID
	return saga.StepResult{Response: map[string]any{"checklist_id": cl.ID}}
}

func (s *startOnboardingStep) Compensate(_ context.Context, _ saga.State) error {
	// Checklists cascade via employee FK; no-op.
	return nil
}

// ----------------------------------------------------------------------------
// Step 4: Append career event (hire)
// ----------------------------------------------------------------------------

type appendCareerStep struct{ deps OnboardingSagaDeps }

func (s *appendCareerStep) Name() string { return "append_career" }

func (s *appendCareerStep) Execute(ctx context.Context, st saga.State) saga.StepResult {
	empID, ok := getUUID(st.Data, "employee_id")
	if !ok {
		return saga.StepResult{Err: errors.New("employee_id missing")}
	}
	req := service.CareerEventRequest{
		EventType:     string(domain.CareerHire),
		EffectiveDate: time.Now().UTC().Format("2006-01-02"),
		ReasonTR:      "Saga: onboarding_v1 sonucu otomatik kariyer kaydı",
	}
	ev, err := s.deps.Careers.Append(ctx, st.TenantID, empID, req)
	if err != nil {
		return saga.StepResult{Err: fmt.Errorf("append career: %w", err)}
	}
	st.Data["career_event_id"] = ev.ID
	return saga.StepResult{Response: map[string]any{"career_event_id": ev.ID}}
}

func (s *appendCareerStep) Compensate(_ context.Context, _ saga.State) error {
	// Hire event immutable; safe to leave (history audit trail).
	return nil
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

func getUUID(data map[string]any, key string) (uuid.UUID, bool) {
	v, ok := data[key]
	if !ok {
		return uuid.Nil, false
	}
	switch x := v.(type) {
	case uuid.UUID:
		return x, true
	case string:
		parsed, err := uuid.Parse(x)
		if err != nil {
			return uuid.Nil, false
		}
		return parsed, true
	}
	return uuid.Nil, false
}
