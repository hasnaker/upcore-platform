package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
)

// ReportingHandler serves /reporting routes.
type ReportingHandler struct {
	svc *service.ReorgService
	dep Dependencies
}

// NewReportingHandler creates a handler.
func NewReportingHandler(svc *service.ReorgService, dep Dependencies) *ReportingHandler {
	return &ReportingHandler{svc: svc, dep: dep}
}

// SetManager handles POST /reporting/set-manager.
func (h *ReportingHandler) SetManager(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var in service.SetManagerInput
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(in); err != nil {
		WriteError(w, err)
		return
	}
	line, err := h.svc.SetManager(r.Context(), tid, in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, line)
}

// EndLine handles DELETE /reporting/lines/{lineId}.
func (h *ReportingHandler) EndLine(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "lineId"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid line id"})
		return
	}
	if err := h.svc.EndLine(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

// GetReports handles GET /reporting/manager/{employee_id}/reports.
func (h *ReportingHandler) GetReports(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "employee_id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee id"})
		return
	}
	includeDotted, _ := strconv.ParseBool(r.URL.Query().Get("include_dotted"))
	items, err := h.svc.GetDirectReports(r.Context(), tid, id, includeDotted)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// GetTeam handles GET /reporting/manager/{employee_id}/team.
func (h *ReportingHandler) GetTeam(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "employee_id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee id"})
		return
	}
	tree, err := h.svc.GetTeamTree(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, tree)
}

// GetMatrix handles GET /reporting/matrix.
func (h *ReportingHandler) GetMatrix(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	items, err := h.svc.GetMatrix(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}

// GetChain handles GET /reporting/employee/{employee_id}/chain.
func (h *ReportingHandler) GetChain(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "employee_id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee id"})
		return
	}
	items, err := h.svc.GetChainUpward(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "count": len(items)})
}
