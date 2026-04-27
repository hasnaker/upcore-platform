package handler

import (
	"net"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// ConsentHandler exposes HTTP endpoints for KVKK çalışan rıza yönetimi.
type ConsentHandler struct {
	svc *service.ConsentService
}

// NewConsentHandler constructs a ConsentHandler.
func NewConsentHandler(svc *service.ConsentService) *ConsentHandler {
	return &ConsentHandler{svc: svc}
}

// List handles GET /api/v1/kvkk/consents — returns the catalog + current
// decisions of the authenticated caller.
func (h *ConsentHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}
	if userID == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	out, err := h.svc.ListUserConsents(r.Context(), tenantID, userID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// Upsert handles POST /api/v1/kvkk/consents — updates one consent decision for
// the authenticated caller. Required body: { consent_type, status, [version, metadata] }.
func (h *ConsentHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}
	if userID == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	var req service.UpsertConsentRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	ip := clientIP(r)
	ua := strings.TrimSpace(r.Header.Get("User-Agent"))

	out, err := h.svc.Upsert(r.Context(), tenantID, userID, ip, ua, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// GetHistory handles GET /api/v1/kvkk/consents/history/{consentType} — returns
// the full audit trail of status changes for the authenticated caller.
func (h *ConsentHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}
	if userID == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	raw := strings.TrimSpace(chi.URLParam(r, "consentType"))
	if raw == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "consentType required"})
		return
	}
	consentType := domain.ConsentType(raw)
	if err := consentType.Valid(); err != nil {
		WriteError(w, err)
		return
	}

	entries, err := h.svc.GetHistory(r.Context(), tenantID, userID, consentType)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"consent_type": consentType,
		"entries":      entries,
	})
}

// GetAIAllowed handles GET /api/v1/kvkk/consents/ai-allowed?user_id=… — used by
// ML services (burnout-prediction, recommendation) to check whether a given
// employee has granted `ai_recommendations` consent.
// Defaults to the authenticated caller when no user_id query param is given.
func (h *ConsentHandler) GetAIAllowed(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	targetID := middleware.UserIDFromContext(r.Context())
	if q := strings.TrimSpace(r.URL.Query().Get("user_id")); q != "" {
		parsed, err := uuid.Parse(q)
		if err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid user_id"})
			return
		}
		targetID = parsed
	}
	if targetID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "user_id required"})
		return
	}

	allowed, err := h.svc.IsAIAllowed(r.Context(), tenantID, targetID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"user_id":      targetID,
		"consent_type": domain.ConsentAIRecommendations,
		"ai_allowed":   allowed,
	})
}

// clientIP prefers X-Forwarded-For (first hop) then X-Real-IP, then
// RemoteAddr — trims port when present so the value is `inet`-compatible.
func clientIP(r *http.Request) string {
	if fwd := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); fwd != "" {
		// X-Forwarded-For: client, proxy1, proxy2 → take the first token.
		if idx := strings.Index(fwd, ","); idx >= 0 {
			fwd = fwd[:idx]
		}
		return strings.TrimSpace(fwd)
	}
	if real := strings.TrimSpace(r.Header.Get("X-Real-IP")); real != "" {
		return real
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
