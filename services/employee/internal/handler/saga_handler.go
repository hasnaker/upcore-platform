package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	empsaga "github.com/upcore/employee/internal/saga"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/saga"
)

// SagaHandler triggers orchestrator runs via HTTP.
type SagaHandler struct {
	orch    *saga.Orchestrator
	onboard saga.Definition
	offboard saga.Definition
}

// NewSagaHandler constructs the handler. Inject the orchestrator and fully-
// wired saga definitions (see internal/saga.Onboarding + .Offboarding).
func NewSagaHandler(orch *saga.Orchestrator, onboard, offboard saga.Definition) *SagaHandler {
	_ = empsaga.OnboardingSagaDeps{}  // keep import live for consumers
	_ = empsaga.OffboardingSagaDeps{} // keep import live for consumers
	return &SagaHandler{orch: orch, onboard: onboard, offboard: offboard}
}

// TriggerOnboarding handles POST /api/v1/offers/{id}/onboard.
// Body: {"employee_no":"EMP-001","template_name":"standard_v1","hire_date":"2026-05-01"}
//
// Idempotent: running twice for the same offer returns the existing instance.
func (h *SagaHandler) TriggerOnboarding(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	actorID := middleware.UserIDFromContext(r.Context())

	offerID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		EmployeeNo   string `json:"employee_no"`
		TemplateName string `json:"template_name"`
		HireDate     string `json:"hire_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && err.Error() != "EOF" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	state := saga.State{
		TenantID:      tid,
		AggregateID:   &offerID,
		CorrelationID: "offer-" + offerID.String(),
		Data: map[string]any{
			"offer_id":      offerID,
			"actor_id":      actorID,
			"employee_no":   body.EmployeeNo,
			"template_name": body.TemplateName,
			"hire_date":     body.HireDate,
		},
	}
	inst, err := h.orch.Start(r.Context(), h.onboard, state)
	if err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "saga_failed",
			Message: err.Error(),
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"saga_id":      inst.ID,
		"status":       inst.Status,
		"current_step": inst.CurrentStep,
		"total_steps":  inst.TotalSteps,
	})
}

// TriggerOffboarding handles POST /api/v1/employees/{id}/offboard.
// Body: {"termination_date":"2026-05-01","reason":"Istifa","departure_type":"voluntary_resignation",
//        "notice_date":"2026-04-15","last_working_day":"2026-04-30","handover_to_id":"..."}
//
// Idempotent via correlation_id = "employee-{id}".
func (h *SagaHandler) TriggerOffboarding(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	actorID := middleware.UserIDFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	var body struct {
		TerminationDate string `json:"termination_date"`
		Reason          string `json:"reason"`
		DepartureType   string `json:"departure_type"`
		NoticeDate      string `json:"notice_date"`
		LastWorkingDay  string `json:"last_working_day"`
		HandoverToID    string `json:"handover_to_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && err.Error() != "EOF" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	data := map[string]any{
		"employee_id":      empID,
		"actor_id":         actorID,
		"termination_date": body.TerminationDate,
		"reason":           body.Reason,
		"departure_type":   body.DepartureType,
		"notice_date":      body.NoticeDate,
		"last_working_day": body.LastWorkingDay,
	}
	if body.HandoverToID != "" {
		if v, err := uuid.Parse(body.HandoverToID); err == nil {
			data["handover_to_id"] = v
		}
	}

	state := saga.State{
		TenantID:      tid,
		AggregateID:   &empID,
		CorrelationID: "employee-" + empID.String(),
		Data:          data,
	}
	inst, err := h.orch.Start(r.Context(), h.offboard, state)
	if err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "saga_failed",
			Message: err.Error(),
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"saga_id":      inst.ID,
		"status":       inst.Status,
		"current_step": inst.CurrentStep,
		"total_steps":  inst.TotalSteps,
	})
}
