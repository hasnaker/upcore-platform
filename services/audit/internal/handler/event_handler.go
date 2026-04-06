package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/service"
)

// EventHandler exposes HTTP endpoints for audit event operations.
type EventHandler struct {
	svc *service.EventService
}

// NewEventHandler constructs an EventHandler.
func NewEventHandler(svc *service.EventService) *EventHandler {
	return &EventHandler{svc: svc}
}

// Log handles POST /api/v1/audit/events -- direct sync ingestion (HTTP fallback).
func (h *EventHandler) Log(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant", Message: "X-Tenant-ID header required"})
		return
	}

	var req domain.LogRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	event, err := h.svc.Log(r.Context(), tenantID, &req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{"event_id": event.ID})
}

// Query handles GET /api/v1/audit/events -- paginated filtered search.
func (h *EventHandler) Query(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	if tenantID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_tenant"})
		return
	}

	q := r.URL.Query()
	filter := domain.QueryFilter{
		TenantID:     tenantID,
		ResourceType: q.Get("resource_type"),
		Service:      q.Get("service"),
		Action:       q.Get("action"),
		EventType:    q.Get("event_type"),
		Result:       q.Get("result"),
	}
	if v := q.Get("actor_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			filter.ActorID = &id
		}
	}
	if v := q.Get("resource_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			filter.ResourceID = &id
		}
	}
	if v := q.Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			filter.From = t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			filter.To = t
		}
	}

	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 50)

	events, total, err := h.svc.Query(r.Context(), filter, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": events, "total": total})
}

// GetByID handles GET /api/v1/audit/events/{id}.
func (h *EventHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	event, err := h.svc.GetByID(r.Context(), tenantID, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, event)
}

// GetResourceHistory handles GET /api/v1/audit/events/resource/{type}/{id}.
func (h *EventHandler) GetResourceHistory(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	resType := chi.URLParam(r, "type")
	resID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	events, err := h.svc.GetResourceHistory(r.Context(), tenantID, resType, resID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, events)
}

// GetActorActivity handles GET /api/v1/audit/events/actor/{userId}.
func (h *EventHandler) GetActorActivity(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	actorID, ok := ParseUUID(w, chi.URLParam(r, "userId"))
	if !ok {
		return
	}

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

	events, err := h.svc.GetActorActivity(r.Context(), tenantID, actorID, from, to)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, events)
}

// GetStats handles GET /api/v1/audit/events/stats.
func (h *EventHandler) GetStats(w http.ResponseWriter, r *http.Request) {
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

	stats, err := h.svc.GetStatsSummary(r.Context(), tenantID, from, to)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, stats)
}
