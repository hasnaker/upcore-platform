package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/repository"
)

// OutboxAdminHandler exposes operator endpoints for the transactional outbox.
type OutboxAdminHandler struct {
	repo       repository.OutboxAdminRepository
	maxRetries int
}

// NewOutboxAdminHandler constructs the handler.
func NewOutboxAdminHandler(repo repository.OutboxAdminRepository, maxRetries int) *OutboxAdminHandler {
	return &OutboxAdminHandler{repo: repo, maxRetries: maxRetries}
}

func (h *OutboxAdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	s, err := h.repo.Stats(r.Context(), tid, h.maxRetries)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, s)
}

func (h *OutboxAdminHandler) ListDLQ(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.repo.ListDeadLetter(r.Context(), tid, h.maxRetries, limit, page*limit)
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

func (h *OutboxAdminHandler) Replay(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.repo.Replay(r.Context(), tid, id); err != nil {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{
			Error:   "not_found_or_dispatched",
			Message: err.Error(),
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}
