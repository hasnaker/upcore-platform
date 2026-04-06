package handler

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/repository"
	"github.com/upcore/organization/internal/service"
)

// PositionHandler serves /positions routes.
type PositionHandler struct {
	svc *service.PositionService
	dep Dependencies
}

// NewPositionHandler creates a handler.
func NewPositionHandler(svc *service.PositionService, dep Dependencies) *PositionHandler {
	return &PositionHandler{svc: svc, dep: dep}
}

// List handles GET /positions.
func (h *PositionHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()
	f := repository.PositionFilter{
		JobFamily: q.Get("job_family"),
		JobLevel:  q.Get("job_level"),
		Search:    q.Get("search"),
	}
	if v := q.Get("department_id"); v != "" {
		id, err := uuid.Parse(v)
		if err == nil {
			f.DepartmentID = &id
		}
	}
	f.IncludeArchived, _ = strconv.ParseBool(q.Get("include_archived"))
	f.Page, _ = strconv.Atoi(q.Get("page"))
	f.Limit, _ = strconv.Atoi(q.Get("limit"))
	items, total, err := h.svc.List(r.Context(), tid, f)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

// Get handles GET /positions/{id}.
func (h *PositionHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	p, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// Create handles POST /positions.
func (h *PositionHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var in service.CreatePositionInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	p, err := h.svc.Create(r.Context(), tid, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// Patch handles PATCH /positions/{id}.
func (h *PositionHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in service.UpdatePositionInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	p, err := h.svc.Update(r.Context(), tid, id, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// UpdateJDR handles PATCH /positions/{id}/jdr.
func (h *PositionHandler) UpdateJDR(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in struct {
		Demands   domain.JDRDemands   `json:"talepler"`
		Resources domain.JDRResources `json:"kaynaklar"`
	}
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	p, err := h.svc.UpdateJDR(r.Context(), tid, id, in.Demands, in.Resources)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// Archive handles DELETE /positions/{id}.
func (h *PositionHandler) Archive(w http.ResponseWriter, r *http.Request) {
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
