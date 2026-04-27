package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
)

// DeductionHandler manages personel ek kesintileri (avans/icra/nafaka).
type DeductionHandler struct {
	repo repository.DeductionRepository
}

// NewDeductionHandler constructs the handler.
func NewDeductionHandler(repo repository.DeductionRepository) *DeductionHandler {
	return &DeductionHandler{repo: repo}
}

// List handles GET /employees/{id}/deductions.
func (h *DeductionHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	activeOnly := r.URL.Query().Get("active") == "true"
	items, err := h.repo.List(r.Context(), tid, empID, activeOnly)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Create handles POST /employees/{id}/deductions.
// Body: {deduction_type, label, monthly_amount, total_cap?, start_period, end_period?, reference_no?, priority?}
func (h *DeductionHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		DeductionType string   `json:"deduction_type"`
		Label         string   `json:"label"`
		MonthlyAmount float64  `json:"monthly_amount"`
		TotalCap      *float64 `json:"total_cap"`
		StartPeriod   string   `json:"start_period"`
		EndPeriod     *string  `json:"end_period"`
		ReferenceNo   *string  `json:"reference_no"`
		Priority      int      `json:"priority"`
		Notes         *string  `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if body.MonthlyAmount <= 0 || body.StartPeriod == "" || body.DeductionType == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error: "invalid", Message: "deduction_type, label, monthly_amount > 0, start_period zorunlu",
		})
		return
	}
	d := &repository.EmployeeDeduction{
		TenantID: tid, EmployeeID: empID,
		DeductionType: body.DeductionType, Label: body.Label,
		MonthlyAmount: body.MonthlyAmount, TotalCap: body.TotalCap,
		StartPeriod: body.StartPeriod, EndPeriod: body.EndPeriod,
		ReferenceNo: body.ReferenceNo, Priority: body.Priority,
		Active: true, Notes: body.Notes,
	}
	if err := h.repo.Create(r.Context(), d); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, d)
}

// Deactivate handles DELETE /deductions/{id}.
func (h *DeductionHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.repo.Deactivate(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}
