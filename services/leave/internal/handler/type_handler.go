package handler

import (
	"net/http"

	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/repository"
)

// TypeHandler serves leave-type endpoints.
type TypeHandler struct {
	repo repository.LeaveTypeRepository
	dep  Dependencies
}

// NewTypeHandler constructs a TypeHandler.
func NewTypeHandler(repo repository.LeaveTypeRepository, dep Dependencies) *TypeHandler {
	return &TypeHandler{repo: repo, dep: dep}
}

// List handles GET /leaves/types — lists tenant + global leave types.
func (h *TypeHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	types, err := h.repo.ListForTenant(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": types, "total": len(types)})
}
