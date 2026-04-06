package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/repository"
	"github.com/upcore/notification/internal/service"
)

// NotificationHandler exposes HTTP endpoints for notification operations.
type NotificationHandler struct {
	dispatcher *service.Dispatcher
	repo       repository.NotificationRepository
}

// NewNotificationHandler constructs a NotificationHandler.
func NewNotificationHandler(dispatcher *service.Dispatcher, repo repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{dispatcher: dispatcher, repo: repo}
}

// Send handles POST /api/v1/notifications/send.
func (h *NotificationHandler) Send(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var req service.SendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	n, err := h.dispatcher.Send(r.Context(), tenantID, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"notification_id": n.ID})
}

// SendBulk handles POST /api/v1/notifications/send-bulk.
func (h *NotificationHandler) SendBulk(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	var req service.BulkSendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	count, err := h.dispatcher.SendBulk(r.Context(), tenantID, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"created_count": count})
}

// ListMine handles GET /api/v1/notifications/mine.
func (h *NotificationHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())

	channel := r.URL.Query().Get("channel")
	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 20)

	items, total, err := h.repo.ListByRecipient(r.Context(), tenantID, userID, channel, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// GetByID handles GET /api/v1/notifications/{id}.
func (h *NotificationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	n, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, n)
}

// AdminStats handles GET /api/v1/notifications/admin/stats.
func (h *NotificationHandler) AdminStats(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()

	from := time.Now().UTC().AddDate(0, -1, 0)
	to := time.Now().UTC()
	if v := q.Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}

	stats, err := h.repo.CountByStatus(r.Context(), tenantID, from, to)
	if err != nil {
		WriteError(w, err)
		return
	}

	sent := stats["sent"]
	delivered := stats["delivered"]
	failed := stats["failed"]
	bounced := stats["bounced"]
	total := sent + delivered + failed + bounced

	var deliveryRate, bounceRate float64
	if total > 0 {
		deliveryRate = float64(delivered) / float64(total) * 100
		bounceRate = float64(bounced) / float64(total) * 100
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"sent":          sent,
		"delivered":     delivered,
		"failed":        failed,
		"bounced":       bounced,
		"delivery_rate": deliveryRate,
		"bounce_rate":   bounceRate,
	})
}
