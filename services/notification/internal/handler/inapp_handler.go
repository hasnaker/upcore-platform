package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/service"
)

// InAppHandler exposes HTTP endpoints for in-app notifications.
type InAppHandler struct {
	svc *service.InAppService
}

// NewInAppHandler constructs an InAppHandler.
func NewInAppHandler(svc *service.InAppService) *InAppHandler {
	return &InAppHandler{svc: svc}
}

// List handles GET /api/v1/notifications/inapp.
func (h *InAppHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	unreadOnly := r.URL.Query().Get("unread_only") == "true"
	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 20)

	items, total, err := h.svc.List(r.Context(), tenantID, userID, unreadOnly, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}

	unreadCount, _ := h.svc.CountUnread(r.Context(), tenantID, userID)
	WriteJSON(w, http.StatusOK, map[string]any{
		"items":        items,
		"total":        total,
		"unread_count": unreadCount,
	})
}

// MarkRead handles POST /api/v1/notifications/inapp/{id}/read.
func (h *InAppHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	if err := h.svc.MarkRead(r.Context(), tenantID, userID, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "read"})
}

// MarkAllRead handles POST /api/v1/notifications/inapp/read-all.
func (h *InAppHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	if err := h.svc.MarkAllRead(r.Context(), tenantID, userID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "all_read"})
}

// Delete handles DELETE /api/v1/notifications/inapp/{id}.
func (h *InAppHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	if err := h.svc.Delete(r.Context(), tenantID, userID, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// UnreadCount handles GET /api/v1/notifications/inapp/unread-count.
func (h *InAppHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	count, err := h.svc.CountUnread(r.Context(), tenantID, userID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"count": count})
}
