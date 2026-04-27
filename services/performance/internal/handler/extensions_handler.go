package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/repository"
)

// ExtensionsHandler — calibration session + development plan + peer
// nomination HTTP endpoints. Her biri migration 038'daki tablolara bağlı.
type ExtensionsHandler struct {
	calib  repository.CalibrationRepository
	dev    repository.DevelopmentRepository
	peer   repository.PeerNominationRepository
}

// NewExtensionsHandler constructs.
func NewExtensionsHandler(
	c repository.CalibrationRepository,
	d repository.DevelopmentRepository,
	p repository.PeerNominationRepository,
) *ExtensionsHandler {
	return &ExtensionsHandler{calib: c, dev: d, peer: p}
}

// Register wires endpoints onto a chi router.
func (h *ExtensionsHandler) Register(r chi.Router) {
	r.Route("/calibration", func(r chi.Router) {
		r.Post("/sessions", h.CreateSession)
		r.Get("/sessions", h.ListSessions)
		r.Get("/sessions/{id}", h.GetSession)
		r.Patch("/sessions/{id}/status", h.UpdateSessionStatus)
		r.Post("/sessions/{id}/adjustments", h.AddAdjustment)
		r.Get("/sessions/{id}/adjustments", h.ListAdjustments)
	})
	r.Route("/development", func(r chi.Router) {
		r.Post("/plans", h.CreatePlan)
		r.Get("/employees/{eid}/plans", h.ListPlansForEmployee)
		r.Get("/plans/{id}", h.GetPlan)
		r.Patch("/plans/{id}/progress", h.UpdatePlanProgress)
		r.Post("/plans/{id}/actions", h.AddAction)
		r.Post("/actions/{id}/complete", h.CompleteAction)
		r.Get("/plans/{id}/actions", h.ListActions)
	})
	r.Route("/peer-nominations", func(r chi.Router) {
		r.Post("/", h.CreateNomination)
		r.Get("/cycles/{cid}", h.ListNominations)
		r.Patch("/{id}/status", h.UpdateNominationStatus)
	})
}

// --- Calibration endpoints ---

// CreateSession POST /calibration/sessions
func (h *ExtensionsHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var body struct {
		CycleID       uuid.UUID  `json:"cycle_id"`
		FacilitatorID uuid.UUID  `json:"facilitator_id"`
		Scope         string     `json:"scope"`
		DepartmentID  *uuid.UUID `json:"department_id"`
		ScheduledAt   time.Time  `json:"scheduled_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	s := &repository.CalibrationSession{
		ID: uuid.New(), TenantID: tid, CycleID: body.CycleID,
		FacilitatorID: body.FacilitatorID, Scope: body.Scope,
		DepartmentID: body.DepartmentID, Status: "scheduled",
		ScheduledAt: body.ScheduledAt,
	}
	if err := h.calib.CreateSession(r.Context(), s); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, s)
}

// ListSessions GET /calibration/sessions?cycle_id=&status=
func (h *ExtensionsHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	out, err := h.calib.ListSessions(r.Context(), tid, cycleID, r.URL.Query().Get("status"))
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// GetSession GET /calibration/sessions/{id}
func (h *ExtensionsHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	out, err := h.calib.GetSession(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// UpdateSessionStatus PATCH /calibration/sessions/{id}/status
func (h *ExtensionsHandler) UpdateSessionStatus(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	if err := h.calib.UpdateSessionStatus(r.Context(), tid, id, body.Status); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AddAdjustment POST /calibration/sessions/{id}/adjustments
func (h *ExtensionsHandler) AddAdjustment(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	sid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		EmployeeID    uuid.UUID `json:"employee_id"`
		Field         string    `json:"field"`
		OldValue      *string   `json:"old_value"`
		NewValue      string    `json:"new_value"`
		Justification *string   `json:"justification"`
		DecidedBy     uuid.UUID `json:"decided_by"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	a := &repository.CalibrationAdjustment{
		ID: uuid.New(), SessionID: sid, TenantID: tid,
		EmployeeID: body.EmployeeID, Field: body.Field,
		OldValue: body.OldValue, NewValue: body.NewValue,
		Justification: body.Justification, DecidedBy: body.DecidedBy,
	}
	if err := h.calib.AddAdjustment(r.Context(), a); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, a)
}

// ListAdjustments GET /calibration/sessions/{id}/adjustments
func (h *ExtensionsHandler) ListAdjustments(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	sid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	out, err := h.calib.ListAdjustments(r.Context(), tid, sid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// --- Development plan endpoints ---

// CreatePlan POST /development/plans
func (h *ExtensionsHandler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var body struct {
		EmployeeID uuid.UUID  `json:"employee_id"`
		CycleID    *uuid.UUID `json:"cycle_id"`
		TitleTR    string     `json:"title_tr"`
		Description *string   `json:"description"`
		TargetDate  *time.Time `json:"target_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	p := &repository.DevelopmentPlan{
		ID: uuid.New(), TenantID: tid,
		EmployeeID: body.EmployeeID, CycleID: body.CycleID,
		TitleTR: body.TitleTR, Description: body.Description,
		TargetDate: body.TargetDate, Status: "active",
	}
	if err := h.dev.CreatePlan(r.Context(), p); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// ListPlansForEmployee GET /development/employees/{eid}/plans
func (h *ExtensionsHandler) ListPlansForEmployee(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	eid, ok := ParseUUID(w, chi.URLParam(r, "eid"))
	if !ok {
		return
	}
	out, err := h.dev.ListPlansForEmployee(r.Context(), tid, eid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// GetPlan GET /development/plans/{id}
func (h *ExtensionsHandler) GetPlan(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	out, err := h.dev.GetPlan(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, out)
}

// UpdatePlanProgress PATCH /development/plans/{id}/progress
func (h *ExtensionsHandler) UpdatePlanProgress(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		ProgressPct int    `json:"progress_pct"`
		Status      string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	if err := h.dev.UpdatePlanProgress(r.Context(), tid, id, body.ProgressPct, body.Status); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AddAction POST /development/plans/{id}/actions
func (h *ExtensionsHandler) AddAction(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	planID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Kind            string     `json:"kind"`
		Description     string     `json:"description"`
		OwnerEmployeeID *uuid.UUID `json:"owner_employee_id"`
		DueDate         *time.Time `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	a := &repository.DevelopmentAction{
		ID: uuid.New(), TenantID: tid, PlanID: planID,
		Kind: body.Kind, Description: body.Description,
		OwnerEmployeeID: body.OwnerEmployeeID, DueDate: body.DueDate,
	}
	if err := h.dev.AddAction(r.Context(), a); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, a)
}

// CompleteAction POST /development/actions/{id}/complete
func (h *ExtensionsHandler) CompleteAction(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.dev.CompleteAction(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ListActions GET /development/plans/{id}/actions
func (h *ExtensionsHandler) ListActions(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	pid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	out, err := h.dev.ListActions(r.Context(), tid, pid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// --- Peer Nomination endpoints ---

// CreateNomination POST /peer-nominations
func (h *ExtensionsHandler) CreateNomination(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var body struct {
		CycleID      uuid.UUID `json:"cycle_id"`
		SubjectID    uuid.UUID `json:"subject_id"`
		NomineeID    uuid.UUID `json:"nominee_id"`
		Relationship string    `json:"relationship"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	p := &repository.PeerNomination{
		ID: uuid.New(), TenantID: tid, CycleID: body.CycleID,
		SubjectID: body.SubjectID, NomineeID: body.NomineeID,
		Relationship: body.Relationship, Status: "pending",
	}
	if err := h.peer.Create(r.Context(), p); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, p)
}

// ListNominations GET /peer-nominations/cycles/{cid}?subject_id=
func (h *ExtensionsHandler) ListNominations(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "cid"))
	if !ok {
		return
	}
	subjectID := ParseUUIDQuery(r, "subject_id")
	out, err := h.peer.List(r.Context(), tid, cid, subjectID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// UpdateNominationStatus PATCH /peer-nominations/{id}/status
func (h *ExtensionsHandler) UpdateNominationStatus(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	if err := h.peer.UpdateStatus(r.Context(), tid, id, body.Status); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

