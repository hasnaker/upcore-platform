package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
)

// TeamHandler serves /teams routes.
type TeamHandler struct {
	svc *service.TeamService
	dep Dependencies
}

// NewTeamHandler creates a handler.
func NewTeamHandler(svc *service.TeamService, dep Dependencies) *TeamHandler {
	return &TeamHandler{svc: svc, dep: dep}
}

// List handles GET /teams.
func (h *TeamHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	includeArchived, _ := strconv.ParseBool(r.URL.Query().Get("include_archived"))
	items, err := h.svc.List(r.Context(), tid, includeArchived)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// Get handles GET /teams/{id}.
func (h *TeamHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	t, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// Create handles POST /teams.
func (h *TeamHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var in service.CreateTeamInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	t, err := h.svc.Create(r.Context(), tid, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, t)
}

// Patch handles PATCH /teams/{id}.
func (h *TeamHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in service.UpdateTeamInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	t, err := h.svc.Update(r.Context(), tid, id, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

// Archive handles DELETE /teams/{id}.
func (h *TeamHandler) Archive(w http.ResponseWriter, r *http.Request) {
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

// AddMember handles POST /teams/{id}/members.
func (h *TeamHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	teamID, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var in service.AddMemberInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	m, err := h.svc.AddMember(r.Context(), tid, teamID, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, m)
}

// RemoveMember handles DELETE /teams/{id}/members/{employeeId}.
func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	teamID, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	empID, err := uuid.Parse(chi.URLParam(r, "employeeId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee id"})
		return
	}
	if err := h.svc.RemoveMember(r.Context(), tid, teamID, empID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

// ListMembers handles GET /teams/{id}/members.
func (h *TeamHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	teamID, err := parseID(r, "id")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	items, err := h.svc.ListMembers(r.Context(), tid, teamID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}
