package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/service"
)

// AdminTenantsHandler serves /admin/tenants endpoints used by the UpCore
// internal admin panel. All endpoints assume an upstream middleware has
// gated access to platform-admin principals (see middleware.RequirePlatformAdmin).
type AdminTenantsHandler struct {
	svc *service.TenantService
	dep Dependencies
}

// NewAdminTenantsHandler constructs the handler.
func NewAdminTenantsHandler(svc *service.TenantService, dep Dependencies) *AdminTenantsHandler {
	return &AdminTenantsHandler{svc: svc, dep: dep}
}

// Register wires the routes onto the provided router.
func (h *AdminTenantsHandler) Register(r chi.Router) {
	r.Get("/tenants", h.List)
	r.Get("/tenants/{id}", h.Detail)
	r.Patch("/tenants/{id}/status", h.ChangeStatus)
}

// List handles GET /admin/tenants
// Query params: status, plan, q, page, page_size.
func (h *AdminTenantsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	in := service.AdminListFilter{
		Status:   strings.TrimSpace(q.Get("status")),
		PlanID:   strings.TrimSpace(q.Get("plan")),
		Search:   strings.TrimSpace(q.Get("q")),
		Page:     atoiDefault(q.Get("page"), 1),
		PageSize: atoiDefault(q.Get("page_size"), 25),
	}
	if in.Page < 1 {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "bad_request",
			Message: "page must be >= 1",
		})
		return
	}
	if in.PageSize < 1 || in.PageSize > 100 {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "bad_request",
			Message: "page_size must be 1..100",
		})
		return
	}
	res, err := h.svc.ListAdmin(r.Context(), in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// Detail handles GET /admin/tenants/{id}
func (h *AdminTenantsHandler) Detail(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	out, err := h.svc.GetAdminDetail(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// ChangeStatusRequest is the PATCH body.
type ChangeStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=active suspended trial"`
	Reason string `json:"reason"`
}

// ChangeStatus handles PATCH /admin/tenants/{id}/status
// Body: {"status":"suspended","reason":"..."}
func (h *AdminTenantsHandler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid id"})
		return
	}
	var body ChangeStatusRequest
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(body); err != nil {
		WriteError(w, err)
		return
	}
	t, err := h.svc.ChangeStatus(r.Context(), id, domain.TenantStatus(strings.ToLower(body.Status)), body.Reason)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, t)
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}
