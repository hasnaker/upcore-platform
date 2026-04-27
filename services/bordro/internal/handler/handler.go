// Package handler exposes bordro HTTP endpoints.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/service"
)

// ErrorResponse is the uniform payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteJSON writes v as JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError maps a domain error to an HTTP response.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON body with a 2MB limit.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 4<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// ParseUUID reads a URL param.
func ParseUUID(w http.ResponseWriter, s string) (uuid.UUID, bool) {
	id, err := uuid.Parse(s)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid uuid"})
		return uuid.Nil, false
	}
	return id, true
}

// ParseIntQuery reads a query int with fallback.
func ParseIntQuery(r *http.Request, name string, fallback int) int {
	s := strings.TrimSpace(r.URL.Query().Get(name))
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return fallback
	}
	return v
}

func mapError(err error) (int, ErrorResponse) {
	if err == nil {
		return http.StatusOK, ErrorResponse{}
	}
	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: ve.Fields}
	}
	switch {
	case errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrConflict):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrPeriodLocked):
		return http.StatusConflict, ErrorResponse{Error: "period_locked", Message: err.Error()}
	case errors.Is(err, domain.ErrInvalidStatus):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "invalid_status", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}

// PayrollHandler exposes all bordro endpoints.
type PayrollHandler struct{ svc *service.PayrollService }

// NewPayrollHandler constructs the handler.
func NewPayrollHandler(svc *service.PayrollService) *PayrollHandler {
	return &PayrollHandler{svc: svc}
}

// ============================================================================
// Periods
// ============================================================================

// CreatePeriod handles POST /periods.
func (h *PayrollHandler) CreatePeriod(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	var req service.PeriodRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	p, err := h.svc.CreatePeriod(r.Context(), tid, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// GetPeriod handles GET /periods/{id}.
func (h *PayrollHandler) GetPeriod(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	p, err := h.svc.GetPeriod(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// ListPeriods handles GET /periods.
func (h *PayrollHandler) ListPeriods(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	year := ParseIntQuery(r, "year", 0)
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 24)
	items, total, err := h.svc.ListPeriods(r.Context(), tid, year, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "limit": limit})
}

// LockPeriod handles POST /periods/{id}/lock.
func (h *PayrollHandler) LockPeriod(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	p, err := h.svc.LockPeriod(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// ClosePeriod handles POST /periods/{id}/close.
func (h *PayrollHandler) ClosePeriod(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	p, err := h.svc.ClosePeriod(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, p)
}

// ============================================================================
// Runs
// ============================================================================

// CreateRun handles POST /runs.
func (h *PayrollHandler) CreateRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var req service.RunRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	run, err := h.svc.CreateRun(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, run)
}

// GetRun handles GET /runs/{id}.
func (h *PayrollHandler) GetRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, err := h.svc.GetRun(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, run)
}

// ListRuns handles GET /periods/{id}/runs.
func (h *PayrollHandler) ListRuns(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	periodID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	items, err := h.svc.ListRuns(r.Context(), tid, periodID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// CalculateRun handles POST /runs/{id}/calculate.
func (h *PayrollHandler) CalculateRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Inputs []domain.SlipInput `json:"inputs"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	run, slips, err := h.svc.CalculateRun(r.Context(), tid, id, body.Inputs)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"run": run, "slips": slips})
}

// CalculateAllActive handles POST /runs/{id}/calculate-all-active.
func (h *PayrollHandler) CalculateAllActive(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, slips, err := h.svc.CalculateAllActive(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"run": run, "slips": slips, "employee_count": len(slips)})
}

// CalculateKamuRun handles POST /runs/{id}/calculate-kamu.
// 657 kamu memur maaşı hesabı — tüm aktif kadrolu personel için tek çağrıda.
func (h *PayrollHandler) CalculateKamuRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, slips, err := h.svc.CalculateKamuRun(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"run": run, "slips": slips, "employee_count": len(slips), "flavor": "kamu_657",
	})
}

// ApplyOvertime handles POST /runs/{id}/employees/{eid}/overtime.
// Body: {"entries":[{"kind":"weekday_normal","hours":3}, ...], "cumulative_weekday_ytd":N}
func (h *PayrollHandler) ApplyOvertime(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	runID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "eid"))
	if !ok {
		return
	}

	var body struct {
		Entries              []service.OvertimeEntryRequest `json:"entries"`
		CumulativeWeekdayYTD float64                        `json:"cumulative_weekday_ytd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	slip, err := h.svc.ApplyOvertime(r.Context(), tid, runID, empID, body.Entries, body.CumulativeWeekdayYTD)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"slip": slip})
}

// ApproveRun handles POST /runs/{id}/approve.
func (h *PayrollHandler) ApproveRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, err := h.svc.Approve(r.Context(), tid, id, actor)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, run)
}

// FinaliseRun handles POST /runs/{id}/finalise.
func (h *PayrollHandler) FinaliseRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, err := h.svc.Finalise(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, run)
}

// VoidRun handles POST /runs/{id}/void.
func (h *PayrollHandler) VoidRun(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	run, err := h.svc.Void(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, run)
}

// ============================================================================
// Slips
// ============================================================================

// ListRunSlips handles GET /runs/{id}/slips.
func (h *PayrollHandler) ListRunSlips(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	items, err := h.svc.ListSlips(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetSlip handles GET /slips/{id}.
func (h *PayrollHandler) GetSlip(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	slip, err := h.svc.GetSlip(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, slip)
}

// EmployeeSlips handles GET /employees/{id}/slips.
func (h *PayrollHandler) EmployeeSlips(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	year := ParseIntQuery(r, "year", 0)
	items, err := h.svc.EmployeeSlips(r.Context(), tid, empID, year)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}
