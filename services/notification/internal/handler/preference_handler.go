package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/service"
)

// PreferenceHandler exposes HTTP endpoints for notification preferences.
type PreferenceHandler struct {
	svc *service.PreferenceService
}

// NewPreferenceHandler constructs a PreferenceHandler.
func NewPreferenceHandler(svc *service.PreferenceService) *PreferenceHandler {
	return &PreferenceHandler{svc: svc}
}

// GetMine handles GET /api/v1/notifications/preferences/mine.
func (h *PreferenceHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	prefs, err := h.svc.GetAll(r.Context(), tenantID, userID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, prefs)
}

// UpdateMine handles PUT /api/v1/notifications/preferences/mine.
func (h *PreferenceHandler) UpdateMine(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var body struct {
		Preferences []struct {
			Channel         domain.NotifChannel `json:"channel"`
			Category        domain.Category     `json:"category"`
			OptedIn         bool                `json:"opted_in"`
			QuietHoursStart string              `json:"quiet_hours_start,omitempty"`
			QuietHoursEnd   string              `json:"quiet_hours_end,omitempty"`
			Timezone        string              `json:"timezone,omitempty"`
		} `json:"preferences"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	var prefs []*domain.Preference
	for _, p := range body.Preferences {
		prefs = append(prefs, &domain.Preference{
			TenantID: tenantID,
			UserID:   userID,
			Channel:  p.Channel,
			Category: p.Category,
			OptIn:    p.OptedIn,
			QuietHours: domain.QuietHours{
				Start:    p.QuietHoursStart,
				End:      p.QuietHoursEnd,
				Timezone: p.Timezone,
			},
		})
	}

	if err := h.svc.BulkUpdate(r.Context(), prefs); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// OptOut handles POST /api/v1/notifications/preferences/opt-out.
func (h *PreferenceHandler) OptOut(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	var body struct {
		Category domain.Category `json:"category"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	if err := h.svc.OptOut(r.Context(), tenantID, userID, body.Category); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "opted_out"})
}

// OptIn handles POST /api/v1/notifications/preferences/opt-in.
func (h *PreferenceHandler) OptIn(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	var body struct {
		Category domain.Category `json:"category"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	if err := h.svc.OptIn(r.Context(), tenantID, userID, body.Category); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "opted_in"})
}
