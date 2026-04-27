package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/repository"
	"github.com/upcore/mobility/internal/service"
)

// RotationHandler exposes rotation endpoints.
type RotationHandler struct {
	svc    *service.RotationService
	logger zerolog.Logger
}

func NewRotationHandler(svc *service.RotationService, logger zerolog.Logger) *RotationHandler {
	return &RotationHandler{svc: svc, logger: logger}
}

// Propose — POST /api/v1/mobility/rotations
func (h *RotationHandler) Propose(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	userID, _ := middleware.UserID(r.Context())

	var body struct {
		EmployeeID     uuid.UUID  `json:"employee_id"`
		FromPositionID uuid.UUID  `json:"from_position_id"`
		ToPositionID   uuid.UUID  `json:"to_position_id"`
		FromDeptID     uuid.UUID  `json:"from_department_id"`
		ToDeptID       uuid.UUID  `json:"to_department_id"`
		ReasonTR       string     `json:"reason_tr"`
		StartDate      *time.Time `json:"start_date,omitempty"`
		EndDate        *time.Time `json:"end_date,omitempty"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}

	rot, err := h.svc.Propose(r.Context(), service.ProposeInput{
		TenantID:       tenantID,
		EmployeeID:     body.EmployeeID,
		FromPositionID: body.FromPositionID,
		ToPositionID:   body.ToPositionID,
		FromDeptID:     body.FromDeptID,
		ToDeptID:       body.ToDeptID,
		ReasonTR:       body.ReasonTR,
		StartDate:      body.StartDate,
		EndDate:        body.EndDate,
		RequestedByID:  userID,
	})
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	h.logger.Info().
		Str("tenant_id", tenantID.String()).
		Str("rotation_id", rot.ID.String()).
		Str("employee_id", rot.EmployeeID.String()).
		Str("actor", userID.String()).
		Msg("audit: rotation.proposed")
	WriteJSON(w, http.StatusCreated, rot)
}

// Approve — POST /api/v1/mobility/rotations/{id}/approve
func (h *RotationHandler) Approve(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	userID, _ := middleware.UserID(r.Context())

	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	if err := h.svc.Approve(r.Context(), tenantID, id, userID); err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	h.logger.Info().
		Str("tenant_id", tenantID.String()).
		Str("rotation_id", id.String()).
		Str("actor", userID.String()).
		Str("role", middleware.Role(r.Context())).
		Msg("audit: rotation.approved")
	WriteJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

// Reject — POST /api/v1/mobility/rotations/{id}/reject  body: { "reason": "…" }
func (h *RotationHandler) Reject(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	userID, _ := middleware.UserID(r.Context())

	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	// Body is optional for backward compatibility but reason must come through
	// when present. The service enforces min length.
	var body struct {
		Reason string `json:"reason"`
	}
	// Silently tolerate missing body — service will reject empty reasons.
	_ = decodeJSONOptional(r, &body)

	if err := h.svc.Reject(r.Context(), tenantID, id, body.Reason); err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	h.logger.Info().
		Str("tenant_id", tenantID.String()).
		Str("rotation_id", id.String()).
		Str("actor", userID.String()).
		Str("role", middleware.Role(r.Context())).
		Str("reason", body.Reason).
		Msg("audit: rotation.rejected")
	WriteJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

// Complete — POST /api/v1/mobility/rotations/{id}/complete
func (h *RotationHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	userID, _ := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	if err := h.svc.Complete(r.Context(), tenantID, id); err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	h.logger.Info().
		Str("tenant_id", tenantID.String()).
		Str("rotation_id", id.String()).
		Str("actor", userID.String()).
		Msg("audit: rotation.completed")
	WriteJSON(w, http.StatusOK, map[string]string{"status": "completed"})
}

// ListByEmployee — GET /api/v1/mobility/employees/{employeeId}/rotations
func (h *RotationHandler) ListByEmployee(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	empID, ok := ParseUUID(w, chi.URLParam(r, "employeeId"), "employeeId")
	if !ok {
		return
	}
	rows, err := h.svc.ListByEmployee(r.Context(), tenantID, empID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"rotations": rows, "total": len(rows)})
}

// List — GET /api/v1/mobility/rotations?status=&employee_id=&cursor=&limit=
// Keyset paginated listing; next_cursor + has_more in envelope.
func (h *RotationHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	cursor, ok := ParseCursorQuery(w, r)
	if !ok {
		return
	}
	limit := ParseLimit(r, 50, 200)
	f := repository.RotationListFilter{
		TenantID: tenantID,
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Limit:    limit,
	}
	if v := strings.TrimSpace(r.URL.Query().Get("employee_id")); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			f.EmployeeID = &id
		}
	}
	if cursor != nil {
		ts := cursor.CreatedAt
		id := cursor.ID
		f.CursorCreatedAt = &ts
		f.CursorID = &id
	}
	rows, err := h.svc.List(r.Context(), f)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	resp := map[string]any{"items": rows, "total": len(rows)}
	if len(rows) > 0 {
		last := rows[len(rows)-1]
		resp["next_cursor"] = EncodeCursor(last.CreatedAt, last.ID)
		resp["has_more"] = len(rows) == limit
	} else {
		resp["next_cursor"] = ""
		resp["has_more"] = false
	}
	WriteJSON(w, http.StatusOK, resp)
}

// ListPending — GET /api/v1/mobility/rotations/pending?role=current_manager|target_manager|hr
// Returns rotations in proposed state for the tenant. Caller's approver scope
// (current vs. target manager) is surfaced by the frontend for now; an HR
// caller always sees the full list.
func (h *RotationHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := middleware.TenantID(r.Context())
	role := r.URL.Query().Get("role")
	switch role {
	case "current_manager", "target_manager", "hr":
	default:
		WriteErr(w, http.StatusBadRequest, "invalid_role", "role parametresi geçersiz")
		return
	}
	rows, err := h.svc.ListPending(r.Context(), tenantID)
	if err != nil {
		MapDomainErr(w, h.logger, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"rotations": rows, "total": len(rows), "role": role})
}
