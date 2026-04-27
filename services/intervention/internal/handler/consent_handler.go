package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// ConsentHandler exposes consent management endpoints.
type ConsentHandler struct {
	svc             *service.ConsentService
	log             zerolog.Logger
	reminderMinAge  time.Duration
}

// NewConsentHandler constructs a ConsentHandler. reminderMinAge controls the
// minimum time between an assignment being created and a reminder being
// allowed (default 72h).
func NewConsentHandler(svc *service.ConsentService, log zerolog.Logger, reminderMinAge time.Duration) *ConsentHandler {
	if reminderMinAge <= 0 {
		reminderMinAge = 72 * time.Hour
	}
	return &ConsentHandler{svc: svc, log: log, reminderMinAge: reminderMinAge}
}

// HandleConsent handles POST /interventions/assignments/{id}/consent.
// Actions: "granted", "declined", "revoked".
//
// Ownership check: only the assigned employee (or HR/admin on the tenant) can
// submit consent. Mismatch → 403 (prevents consent-link leakage attacks).
func (h *ConsentHandler) HandleConsent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	role := middleware.RoleFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteError(w, http.StatusUnauthorized, "unauthorized", "missing context")
		return
	}
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

	// Ownership check — only the assigned employee may act on consent, with a
	// carve-out for HR/admin for revoke on the employee's behalf.
	a, err := h.svc.GetAssignment(r.Context(), tid, id)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	if !isHROrAdmin(role) && a.EmployeeID != uid {
		WriteError(w, http.StatusForbidden, "forbidden", "assignment belongs to a different employee")
		return
	}

	actor := service.ActorContext{
		EmployeeID: a.EmployeeID,
		IP:         clientIP(r),
		UserAgent:  truncate(r.Header.Get("User-Agent"), 500),
	}

	reason := ""
	if body.Reason != nil {
		reason = strings.TrimSpace(*body.Reason)
	}

	switch body.Action {
	case "granted":
		if err := h.svc.Grant(r.Context(), tid, id, actor); err != nil {
			WriteDomainError(w, err)
			return
		}
	case "declined":
		if err := h.svc.Decline(r.Context(), tid, id, reason, actor); err != nil {
			WriteDomainError(w, err)
			return
		}
	case "revoked":
		if err := h.svc.Revoke(r.Context(), tid, id, reason, actor); err != nil {
			WriteDomainError(w, err)
			return
		}
	default:
		WriteError(w, http.StatusBadRequest, "bad_request", "action must be 'granted', 'declined' or 'revoked'")
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
	WriteJSON(w, http.StatusOK, map[string]any{"items": logs})
}

// ListByAssignment handles GET /interventions/assignments/{id}/consent/history.
// HR-facing drill-down of every consent action on a single assignment.
func (h *ConsentHandler) ListByAssignment(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	logs, err := h.svc.ListByAssignment(r.Context(), tid, id)
	if err != nil {
		WriteServerError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": logs})
}

// Remind handles POST /interventions/assignments/{id}/remind. HR triggers
// a fresh consent-request notification after the configured threshold (72h).
func (h *ConsentHandler) Remind(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Remind(r.Context(), tid, id, h.reminderMinAge); err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "reminded"})
}

// clientIP extracts the caller's IP honouring X-Forwarded-For / X-Real-IP
// (the gateway strips remote IP). Falls back to RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return truncate(ip, 64)
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return truncate(strings.TrimSpace(xri), 64)
	}
	// RemoteAddr may include :port
	ip := r.RemoteAddr
	if idx := strings.LastIndex(ip, ":"); idx > 0 {
		ip = ip[:idx]
	}
	return truncate(strings.TrimSpace(ip), 64)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
