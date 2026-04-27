package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/repository"
	"github.com/upcore/employee/internal/service"
)

// EmployeeHandler exposes employee CRUD endpoints.
type EmployeeHandler struct {
	svc *service.EmployeeService
	dep Dependencies
}

// NewEmployeeHandler constructs an EmployeeHandler.
func NewEmployeeHandler(svc *service.EmployeeService, dep Dependencies) *EmployeeHandler {
	return &EmployeeHandler{svc: svc, dep: dep}
}

// List handles GET /employees.
func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	cursor, ok := ParseCursorQuery(w, r)
	if !ok {
		return
	}
	f := repository.ListFilter{
		TenantID:     tid,
		Search:       r.URL.Query().Get("search"),
		Status:       r.URL.Query().Get("status"),
		DepartmentID: ParseUUIDQuery(r, "department_id"),
		PositionID:   ParseUUIDQuery(r, "position_id"),
		ManagerID:    ParseUUIDQuery(r, "manager_id"),
		Page:         ParseIntQuery(r, "page", 1),
		Limit:        ParseIntQuery(r, "limit", 50),
		SortBy:       r.URL.Query().Get("sort_by"),
		SortDir:      r.URL.Query().Get("sort_dir"),
	}
	if cursor != nil {
		ts := cursor.CreatedAt
		id := cursor.ID
		f.CursorCreatedAt = &ts
		f.CursorID = &id
	}

	// Scope enforcement:
	//   - Admin roles (hr_admin, hr_director, cxo, ...) — see everything.
	//   - Manager role — restricted to their subordinate tree (recursive).
	//   - Employee role — restricted to their own record only.
	role := middleware.RoleFromContext(r.Context())
	callerEmpID := middleware.EmployeeIDFromContext(r.Context())
	switch {
	case middleware.IsAdminRole(role):
		// no additional filter
	case middleware.IsManagerRole(role) && callerEmpID != uuid.Nil:
		f.ScopeManagerID = &callerEmpID
	case middleware.IsEmployeeOnlyRole(role) && callerEmpID != uuid.Nil:
		// Employee-only: treat self as the scope (they see themselves in list).
		f.ScopeManagerID = &callerEmpID
	case callerEmpID == uuid.Nil && !middleware.IsAdminRole(role):
		// Unknown role without employee mapping → empty result.
		WriteJSON(w, http.StatusOK, map[string]any{
			"items": []any{}, "total": 0, "page": f.Page, "limit": f.Limit,
		})
		return
	}

	items, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		WriteError(w, err)
		return
	}
	resp := map[string]any{
		"items": items,
		"total": total,
		"page":  f.Page,
		"limit": f.Limit,
	}
	// Keyset cursor semantics: emit next_cursor + has_more when cursor mode
	// used or caller asked for cursor response (limit + items.len >= limit).
	if len(items) > 0 {
		last := items[len(items)-1]
		resp["next_cursor"] = EncodeCursor(last.CreatedAt, last.ID)
		resp["has_more"] = len(items) == f.Limit
	} else {
		resp["next_cursor"] = ""
		resp["has_more"] = false
	}
	WriteJSON(w, http.StatusOK, resp)
}

// Get handles GET /employees/{id}.
func (h *EmployeeHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	e, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

// GetMe handles GET /employees/me — returns the employee profile of the
// authenticated user (self-service).
func (h *EmployeeHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	e, err := h.svc.GetByUserID(r.Context(), tid, uid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

// Create handles POST /employees.
func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateEmployeeRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	e, err := h.svc.Create(r.Context(), tid, middleware.UserIDFromContext(r.Context()), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, e)
}

// Patch handles PATCH /employees/{id}.
func (h *EmployeeHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.UpdateEmployeeRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	e, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

// Terminate handles POST /employees/{id}/terminate.
func (h *EmployeeHandler) Terminate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.TerminateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	e, err := h.svc.Terminate(r.Context(), tid, id, middleware.UserIDFromContext(r.Context()), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

// Reinstate handles POST /employees/{id}/reinstate.
func (h *EmployeeHandler) Reinstate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	e, err := h.svc.Reinstate(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, e)
}

// Delete handles DELETE /employees/{id}.
func (h *EmployeeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
