package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
)

// ExpenseHandler exposes /expense-reports CRUD + workflow transitions.
type ExpenseHandler struct{ repo repository.ExpenseRepository }

// NewExpenseHandler constructs.
func NewExpenseHandler(repo repository.ExpenseRepository) *ExpenseHandler {
	return &ExpenseHandler{repo: repo}
}

// Register wires routes on a chi subrouter.
// Expected prefix: /api/v1/bordro/expense-reports
func (h *ExpenseHandler) Register(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", h.Get)
		r.Get("/items", h.ListItems)
		r.Post("/items", h.AddItem)
		r.Delete("/items/{iid}", h.DeleteItem)
		r.Post("/submit", h.Submit)
		r.Post("/approve", h.Approve)
		r.Post("/reject", h.Reject)
		r.Post("/reimburse", h.Reimburse)
	})
}

// List GET /expense-reports?employee_id=&status=&period=&limit=
func (h *ExpenseHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	f := repository.ExpenseFilter{
		Status: r.URL.Query().Get("status"),
		Period: r.URL.Query().Get("period"),
		Limit:  ParseIntQuery(r, "limit", 100),
	}
	if empStr := r.URL.Query().Get("employee_id"); empStr != "" {
		if eid, err := uuid.Parse(empStr); err == nil {
			f.EmployeeID = &eid
		}
	}
	out, err := h.repo.ListReports(r.Context(), tid, f)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// Create POST /expense-reports
func (h *ExpenseHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	uid := middleware.UserID(r.Context())

	var body struct {
		EmployeeID *uuid.UUID `json:"employee_id"`
		Title      string     `json:"title"`
		Period     string     `json:"period"`
		Currency   string     `json:"currency"`
		Notes      string     `json:"notes"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if body.Title == "" {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: map[string]string{"title": "required"}})
		return
	}
	emp := uid
	if body.EmployeeID != nil {
		emp = *body.EmployeeID
	}
	rep := &repository.ExpenseReport{
		TenantID:   tid,
		EmployeeID: emp,
		Title:      body.Title,
		Currency:   body.Currency,
	}
	if body.Period != "" {
		rep.Period = &body.Period
	}
	if body.Notes != "" {
		rep.Notes = &body.Notes
	}
	if err := h.repo.CreateReport(r.Context(), rep); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	WriteJSON(w, http.StatusCreated, rep)
}

// Get GET /expense-reports/{id}
func (h *ExpenseHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	rep, err := h.repo.GetReport(r.Context(), tid, id)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()})
		return
	}
	items, _ := h.repo.ListItems(r.Context(), tid, id)
	WriteJSON(w, http.StatusOK, map[string]any{"report": rep, "items": items})
}

// ListItems GET /expense-reports/{id}/items
func (h *ExpenseHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	items, err := h.repo.ListItems(r.Context(), tid, id)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// AddItem POST /expense-reports/{id}/items
func (h *ExpenseHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	reportID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		IncurredOn     string  `json:"incurred_on"` // YYYY-MM-DD
		Category       string  `json:"category"`
		Vendor         string  `json:"vendor"`
		Description    string  `json:"description"`
		Amount         float64 `json:"amount"`
		VATRate        float64 `json:"vat_rate"`
		ReceiptBlobURL string  `json:"receipt_blob_url"`
		ReceiptMime    string  `json:"receipt_mime"`
		ProjectCode    string  `json:"project_code"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	fields := map[string]string{}
	if body.Category == "" {
		fields["category"] = "required"
	}
	if body.Description == "" {
		fields["description"] = "required"
	}
	if body.Amount <= 0 {
		fields["amount"] = "must be > 0"
	}
	date, err := time.Parse("2006-01-02", body.IncurredOn)
	if err != nil {
		fields["incurred_on"] = "YYYY-MM-DD"
	}
	if len(fields) > 0 {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: fields})
		return
	}

	// Reject if parent report is no longer editable.
	rep, err := h.repo.GetReport(r.Context(), tid, reportID)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()})
		return
	}
	if rep.Status != "draft" && rep.Status != "submitted" {
		WriteJSON(w, http.StatusConflict, ErrorResponse{Error: "invalid_status", Message: "report not editable in status " + rep.Status})
		return
	}

	it := &repository.ExpenseItem{
		TenantID:    tid,
		ReportID:    reportID,
		IncurredOn:  date,
		Category:    body.Category,
		Description: body.Description,
		Amount:      body.Amount,
		VATRate:     body.VATRate,
	}
	if body.Vendor != "" {
		it.Vendor = &body.Vendor
	}
	if body.ReceiptBlobURL != "" {
		it.ReceiptBlobURL = &body.ReceiptBlobURL
	}
	if body.ReceiptMime != "" {
		it.ReceiptMime = &body.ReceiptMime
	}
	if body.ProjectCode != "" {
		it.ProjectCode = &body.ProjectCode
	}
	if err := h.repo.AddItem(r.Context(), it); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	WriteJSON(w, http.StatusCreated, it)
}

// DeleteItem DELETE /expense-reports/{id}/items/{iid}
func (h *ExpenseHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	iid, ok := ParseUUID(w, chi.URLParam(r, "iid"))
	if !ok {
		return
	}
	if err := h.repo.DeleteItem(r.Context(), tid, iid); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Submit POST /expense-reports/{id}/submit
func (h *ExpenseHandler) Submit(w http.ResponseWriter, r *http.Request) {
	h.transition(w, r, "submitted", "")
}

// Approve POST /expense-reports/{id}/approve  body: {note?}
func (h *ExpenseHandler) Approve(w http.ResponseWriter, r *http.Request) {
	var body struct{ Note string `json:"note"` }
	_ = DecodeJSON(r, &body)
	h.transition(w, r, "approved", body.Note)
}

// Reject POST /expense-reports/{id}/reject  body: {note}
func (h *ExpenseHandler) Reject(w http.ResponseWriter, r *http.Request) {
	var body struct{ Note string `json:"note"` }
	_ = DecodeJSON(r, &body)
	h.transition(w, r, "rejected", body.Note)
}

func (h *ExpenseHandler) transition(w http.ResponseWriter, r *http.Request, target, note string) {
	tid := middleware.TenantID(r.Context())
	uid := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	rep, err := h.repo.GetReport(r.Context(), tid, id)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()})
		return
	}
	if !validTransition(rep.Status, target) {
		WriteJSON(w, http.StatusConflict, ErrorResponse{
			Error:   "invalid_status",
			Message: "cannot transition from " + rep.Status + " to " + target,
		})
		return
	}
	var decidedBy *uuid.UUID
	if target == "approved" || target == "rejected" {
		decidedBy = &uid
	}
	if err := h.repo.UpdateReportStatus(r.Context(), tid, id, target, decidedBy, note); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	out, _ := h.repo.GetReport(r.Context(), tid, id)
	WriteJSON(w, http.StatusOK, out)
}

// Reimburse POST /expense-reports/{id}/reimburse  body: {run_id}
// Marks an approved report as reimbursed through a payroll run. The actual
// add-pay line injection into the slip is handled by the bordro calculator
// when it sees a linked reimbursement (future wire-up). For now we flip the
// status + link so reporting can reconcile.
func (h *ExpenseHandler) Reimburse(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		RunID uuid.UUID `json:"run_id"`
	}
	if err := DecodeJSON(r, &body); err != nil || body.RunID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "run_id required"})
		return
	}
	if err := h.repo.MarkReimbursed(r.Context(), tid, id, body.RunID); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
		return
	}
	out, _ := h.repo.GetReport(r.Context(), tid, id)
	WriteJSON(w, http.StatusOK, out)
}

// validTransition enforces the simple FSM:
//   draft    → submitted, cancelled
//   submitted→ approved, rejected, cancelled
//   approved → reimbursed (via Reimburse handler, not transition)
//   rejected → draft (resubmit loop)
func validTransition(from, to string) bool {
	allowed := map[string][]string{
		"draft":     {"submitted", "cancelled"},
		"submitted": {"approved", "rejected", "cancelled"},
		"rejected":  {"draft"},
	}
	for _, t := range allowed[from] {
		if t == to {
			return true
		}
	}
	return false
}
