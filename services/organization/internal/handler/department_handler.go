package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
)

// DepartmentHandler serves /departments routes.
type DepartmentHandler struct {
	svc *service.OrgService
	dep Dependencies
}

// NewDepartmentHandler creates a handler.
func NewDepartmentHandler(svc *service.OrgService, dep Dependencies) *DepartmentHandler {
	return &DepartmentHandler{svc: svc, dep: dep}
}

// List handles GET /departments.
func (h *DepartmentHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	includeArchived, _ := strconv.ParseBool(r.URL.Query().Get("include_archived"))
	items, err := h.svc.List(r.Context(), tid, includeArchived)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// GetTree handles GET /departments/tree.
func (h *DepartmentHandler) GetTree(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	tree, err := h.svc.GetTree(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"roots": tree})
}

// Get handles GET /departments/{id}.
func (h *DepartmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	d, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// GetSubtree handles GET /departments/{id}/subtree.
func (h *DepartmentHandler) GetSubtree(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	items, err := h.svc.GetSubtree(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// GetAncestors handles GET /departments/{id}/ancestors.
func (h *DepartmentHandler) GetAncestors(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	items, err := h.svc.GetAncestors(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// GetChildren handles GET /departments/{id}/children.
func (h *DepartmentHandler) GetChildren(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	items, err := h.svc.GetChildren(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// Create handles POST /departments.
func (h *DepartmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var in service.CreateDepartmentInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	d, err := h.svc.Create(r.Context(), tid, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, d)
}

// Patch handles PATCH /departments/{id}.
func (h *DepartmentHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in service.UpdateDepartmentInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	d, err := h.svc.Update(r.Context(), tid, id, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// Move handles POST /departments/{id}/move.
func (h *DepartmentHandler) Move(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in struct {
		NewParentID *uuid.UUID `json:"new_parent_id"`
	}
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.svc.Move(r.Context(), tid, id, in.NewParentID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "moved"})
}

// Archive handles DELETE /departments/{id}.
func (h *DepartmentHandler) Archive(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	if err := h.svc.Archive(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "archived"})
}

func parseID(r *http.Request, key string) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, key))
}
