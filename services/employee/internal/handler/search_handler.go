package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// SearchHandler exposes GET /employees/search.
type SearchHandler struct {
	svc *service.SearchService
}

// NewSearchHandler constructs a SearchHandler.
func NewSearchHandler(svc *service.SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// Search handles GET /employees/search?q=...&limit=...
func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	q := r.URL.Query().Get("q")
	limit := ParseIntQuery(r, "limit", 20)
	items, err := h.svc.Search(r.Context(), tid, q, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": len(items),
	})
}
