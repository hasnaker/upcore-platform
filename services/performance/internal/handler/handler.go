// Package handler exposes performance HTTP endpoints.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/repository"
	"github.com/upcore/performance/internal/service"
)

// ErrorResponse is the uniform error payload.
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

// WriteError maps a domain error to an HTTP status + payload.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON body with a 2MB limit.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 2<<20)
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

// ParseUUIDQuery reads a query UUID or uuid.Nil.
func ParseUUIDQuery(r *http.Request, name string) uuid.UUID {
	s := strings.TrimSpace(r.URL.Query().Get(name))
	if s == "" {
		return uuid.Nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return uuid.Nil
	}
	return id
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
	case errors.Is(err, domain.ErrInvalidStatus):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "invalid_status", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}

// ============================================================================
// Cycle
// ============================================================================

// CycleHandler exposes /cycles endpoints.
type CycleHandler struct{ svc *service.CycleService }

// NewCycleHandler constructs the handler.
func NewCycleHandler(svc *service.CycleService) *CycleHandler { return &CycleHandler{svc: svc} }

// Create handles POST /cycles.
func (h *CycleHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	var req service.CycleRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.Create(r.Context(), tid, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// Get handles GET /cycles/{id}.
func (h *CycleHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// List handles GET /cycles.
func (h *CycleHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	status := r.URL.Query().Get("status")
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.svc.List(r.Context(), tid, status, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "total": total, "page": page, "limit": limit})
}

// Advance handles POST /cycles/{id}/advance.
func (h *CycleHandler) Advance(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Advance(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// ============================================================================
// Goal
// ============================================================================

// GoalHandler exposes /goals endpoints.
type GoalHandler struct{ svc *service.GoalService }

// NewGoalHandler constructs the handler.
func NewGoalHandler(svc *service.GoalService) *GoalHandler { return &GoalHandler{svc: svc} }

// Create handles POST /goals.
func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var req service.GoalRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	g, err := h.svc.Create(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, g)
}

// Get handles GET /goals/{id}.
func (h *GoalHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	g, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, g)
}

// Patch handles PATCH /goals/{id}.
func (h *GoalHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.GoalUpdateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	g, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, g)
}

// List handles GET /goals.
func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	empID := ParseUUIDQuery(r, "employee_id")
	status := r.URL.Query().Get("status")
	items, err := h.svc.List(r.Context(), tid, cycleID, empID, status)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ============================================================================
// OKR
// ============================================================================

// OKRHandler exposes /okrs endpoints.
type OKRHandler struct{ svc *service.OKRService }

// NewOKRHandler constructs the handler.
func NewOKRHandler(svc *service.OKRService) *OKRHandler { return &OKRHandler{svc: svc} }

// Create handles POST /okrs.
func (h *OKRHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	var req service.OKRRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	o, err := h.svc.Create(r.Context(), tid, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, o)
}

// Get handles GET /okrs/{id}.
func (h *OKRHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// List handles GET /okrs.
// Supports both legacy (no pagination) and keyset-paginated modes. When
// ?cursor= or ?limit= is provided, the keyset path engages and the response
// includes { next_cursor, has_more }. Without them the caller gets the full
// page up to the 50-row default cap (backward-compatible).
func (h *OKRHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	ownerType := r.URL.Query().Get("owner_type")
	ownerID := ParseUUIDQuery(r, "owner_id")

	cursor, ok := ParseCursorQuery(w, r)
	if !ok {
		return
	}
	limit := ParseIntQuery(r, "limit", 50)
	if limit > 200 {
		limit = 200
	}
	f := repository.OKRListFilter{
		TenantID:  tid,
		CycleID:   cycleID,
		OwnerType: ownerType,
		OwnerID:   ownerID,
		Limit:     limit,
	}
	if cursor != nil {
		ts := cursor.CreatedAt
		id := cursor.ID
		f.CursorCreatedAt = &ts
		f.CursorID = &id
	}
	items, err := h.svc.ListPaged(r.Context(), f)
	if err != nil {
		WriteError(w, err)
		return
	}
	resp := map[string]any{"items": items}
	if len(items) > 0 {
		last := items[len(items)-1]
		resp["next_cursor"] = EncodeCursor(last.CreatedAt, last.ID)
		resp["has_more"] = len(items) == limit
	} else {
		resp["next_cursor"] = ""
		resp["has_more"] = false
	}
	WriteJSON(w, http.StatusOK, resp)
}

// Patch handles PATCH /okrs/{id}.
func (h *OKRHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.OKRProgressRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	o, err := h.svc.UpdateProgress(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Tree handles GET /okrs/tree?cycle_id=... — parent→child cascade for the
// active cycle. Returns `{ "items": [tree roots] }` with nested `children`
// arrays and fully hydrated key-results.
func (h *OKRHandler) Tree(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	if cycleID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "cycle_id required"})
		return
	}
	items, err := h.svc.Tree(r.Context(), tid, cycleID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// PatchKR handles PATCH /okrs/{id}/key-results/{krId}.
func (h *OKRHandler) PatchKR(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	krID, ok := ParseUUID(w, chi.URLParam(r, "krId"))
	if !ok {
		return
	}
	var kr domain.OKRKeyResult
	if err := DecodeJSON(r, &kr); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	kr.ID = krID
	o, err := h.svc.UpdateKR(r.Context(), tid, id, kr)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// ============================================================================
// Review
// ============================================================================

// ReviewHandler exposes /reviews endpoints.
type ReviewHandler struct{ svc *service.ReviewService }

// NewReviewHandler constructs the handler.
func NewReviewHandler(svc *service.ReviewService) *ReviewHandler { return &ReviewHandler{svc: svc} }

// Create handles POST /reviews.
func (h *ReviewHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var req service.ReviewRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	rv, err := h.svc.Create(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, rv)
}

// Get handles GET /reviews/{id}.
func (h *ReviewHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	rv, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, rv)
}

// List handles GET /reviews.
func (h *ReviewHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	empID := ParseUUIDQuery(r, "employee_id")
	rtype := r.URL.Query().Get("review_type")
	items, err := h.svc.List(r.Context(), tid, cycleID, empID, rtype)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Patch handles PATCH /reviews/{id}.
func (h *ReviewHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.ReviewContentRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	rv, err := h.svc.UpdateContent(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, rv)
}

// Transition handles POST /reviews/{id}/transition.
func (h *ReviewHandler) Transition(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	rv, err := h.svc.Transition(r.Context(), tid, id, domain.ReviewStatus(strings.TrimSpace(body.Status)))
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, rv)
}

// AddFeedback handles POST /reviews/{id}/feedback.
func (h *ReviewHandler) AddFeedback(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.FeedbackRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	f, err := h.svc.AddFeedback(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, f)
}

// ============================================================================
// Competency
// ============================================================================

// CompetencyHandler exposes /competencies endpoints.
type CompetencyHandler struct{ svc *service.CompetencyService }

// NewCompetencyHandler constructs the handler.
func NewCompetencyHandler(svc *service.CompetencyService) *CompetencyHandler {
	return &CompetencyHandler{svc: svc}
}

// List handles GET /competencies.
func (h *CompetencyHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	category := r.URL.Query().Get("category")
	activeOnly := r.URL.Query().Get("active") != "false" // default true
	items, err := h.svc.List(r.Context(), tid, category, activeOnly)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Upsert handles PUT /competencies.
func (h *CompetencyHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	var req service.CompetencyRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.Upsert(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// ============================================================================
// Nine Box
// ============================================================================

// NineBoxHandler exposes /nine-box endpoints.
type NineBoxHandler struct{ svc *service.NineBoxService }

// NewNineBoxHandler constructs the handler.
func NewNineBoxHandler(svc *service.NineBoxService) *NineBoxHandler { return &NineBoxHandler{svc: svc} }

// Upsert handles POST /nine-box.
func (h *NineBoxHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	setBy := middleware.UserID(r.Context())
	var req service.NineBoxRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	a, err := h.svc.Upsert(r.Context(), tid, setBy, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, a)
}

// Grid handles GET /nine-box/grid?cycle_id=...
func (h *NineBoxHandler) Grid(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID := ParseUUIDQuery(r, "cycle_id")
	if cycleID == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "cycle_id required"})
		return
	}
	segment := r.URL.Query().Get("segment")
	items, err := h.svc.Grid(r.Context(), tid, cycleID, segment)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Get handles GET /nine-box/cycles/{cycleId}/employees/{employeeId}.
func (h *NineBoxHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cycleID, ok := ParseUUID(w, chi.URLParam(r, "cycleId"))
	if !ok {
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "employeeId"))
	if !ok {
		return
	}
	a, err := h.svc.Get(r.Context(), tid, cycleID, empID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, a)
}
