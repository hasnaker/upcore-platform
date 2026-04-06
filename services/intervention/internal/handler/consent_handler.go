package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// ConsentHandler exposes consent management endpoints.
type ConsentHandler struct {
	svc *service.ConsentService
	log zerolog.Logger
}

// NewConsentHandler constructs a ConsentHandler.
func NewConsentHandler(svc *service.ConsentService, log zerolog.Logger) *ConsentHandler {
	return &ConsentHandler{svc: svc, log: log}
}

// HandleConsent handles POST /interventions/assignments/{id}/consent.
func (h *ConsentHandler) HandleConsent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	var body struct {
		Action string  `json:"action"`
		Reason *string `json:"reason,omitempty"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	ip := r.RemoteAddr

	switch body.Action {
	case "granted":
		if err := h.svc.Grant(r.Context(), tid, id, uid, ip); err != nil {
			WriteDomainError(w, err)
			return
		}
	case "declined":
		reason := ""
		if body.Reason != nil {
			reason = *body.Reason
		}
		if err := h.svc.Decline(r.Context(), tid, id, uid, reason, ip); err != nil {
			WriteDomainError(w, err)
			return
		}
	default:
		WriteError(w, http.StatusBadRequest, "bad_request", "action must be 'granted' or 'declined'")
		return
	}

	WriteJSON(w, http.StatusOK, map[string]string{"status": body.Action})
}

// GetHistory handles GET /interventions/consent/history/{employeeId}.
func (h *ConsentHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "employeeId"))
	if !ok {
		return
	}
	logs, err := h.svc.GetHistory(r.Context(), tid, empID)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, logs)
}
