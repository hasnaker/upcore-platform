package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// HistoryHandler exposes history endpoints.
type HistoryHandler struct {
	svc *service.HistoryService
}

// NewHistoryHandler constructs the handler.
func NewHistoryHandler(svc *service.HistoryService) *HistoryHandler {
	return &HistoryHandler{svc: svc}
}

// List handles GET /employees/{id}/history.
func (h *HistoryHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	page := ParseIntQuery(r, "page", 1)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.svc.List(r.Context(), tid, empID, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Append handles POST /employees/{id}/history.
func (h *HistoryHandler) Append(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.AppendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	entry, err := h.svc.Append(r.Context(), tid, empID, middleware.UserIDFromContext(r.Context()), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, entry)
}
