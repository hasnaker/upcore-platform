package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// OutcomeHandler exposes outcome recording endpoints.
type OutcomeHandler struct {
	svc *service.OutcomeService
	log zerolog.Logger
}

// NewOutcomeHandler constructs an OutcomeHandler.
func NewOutcomeHandler(svc *service.OutcomeService, log zerolog.Logger) *OutcomeHandler {
	return &OutcomeHandler{svc: svc, log: log}
}

// Create handles POST /interventions/assignments/{id}/outcomes.
func (h *OutcomeHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	var req service.RecordOutcomeRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid
	req.AssignmentID = id

	outcome, err := h.svc.RecordOutcome(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, outcome)
}

// Get handles GET /interventions/assignments/{id}/outcomes.
func (h *OutcomeHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	outcome, err := h.svc.GetByAssignment(r.Context(), id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, outcome)
}
