package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/service"
)

// BalanceHandler serves leave-balance endpoints.
type BalanceHandler struct {
	svc *service.BalanceService
	dep Dependencies
}

// NewBalanceHandler constructs a BalanceHandler.
func NewBalanceHandler(svc *service.BalanceService, dep Dependencies) *BalanceHandler {
	return &BalanceHandler{svc: svc, dep: dep}
}

// Get handles GET /leaves/balances/{employee_id}.
func (h *BalanceHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	empStr := chi.URLParam(r, "employee_id")
	empID, err := uuid.Parse(empStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee_id"})
		return
	}
	year := time.Now().UTC().Year()
	if y := r.URL.Query().Get("year"); y != "" {
		if n, err := strconv.Atoi(y); err == nil {
			year = n
		}
	}
	balances, err := h.svc.Get(r.Context(), tid, empID, year)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"employee_id": empID,
		"year":        year,
		"items":       balances,
	})
}

// Adjust handles POST /leaves/balances/{employee_id}/adjust.
type adjustBody struct {
	LeaveTypeID string  `json:"leave_type_id" validate:"required"`
	Year        int     `json:"year" validate:"required"`
	Delta       float64 `json:"delta" validate:"required"`
	Reason      string  `json:"reason" validate:"required,min=3,max=500"`
}

// Adjust handles POST /leaves/balances/{employee_id}/adjust.
func (h *BalanceHandler) Adjust(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	empStr := chi.URLParam(r, "employee_id")
	empID, err := uuid.Parse(empStr)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid employee_id"})
		return
	}
	var body adjustBody
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(body); err != nil {
		WriteError(w, err)
		return
	}
	ltID, err := uuid.Parse(body.LeaveTypeID)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid leave_type_id"})
		return
	}
	if err := h.svc.Adjust(r.Context(), tid, empID, ltID, body.Year, body.Delta, body.Reason); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "adjusted"})
}
