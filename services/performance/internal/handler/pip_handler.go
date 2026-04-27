// Package handler — PIP REST endpoints.
package handler

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/service"
)

// PipHandler exposes /pip endpoints.
type PipHandler struct {
	svc *service.PipService
}

// NewPipHandler constructs a PIP handler.
func NewPipHandler(svc *service.PipService) *PipHandler { return &PipHandler{svc: svc} }

// Register wires the endpoints onto a chi router (mounted under /api/v1/performance).
func (h *PipHandler) Register(r chi.Router) {
	r.Route("/pip", func(r chi.Router) {
		r.Post("/", h.Initiate)
		r.Get("/", h.List)
		r.Get("/mine", h.ListMine)
		r.Get("/managed", h.ListManaged)

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", h.Get)
			r.Post("/submit-legal", h.SubmitLegal)
			r.Post("/approve-legal", h.ApproveLegal)
			r.Post("/goals", h.AddGoal)
			r.Post("/checkins", h.AddCheckin)
			r.Post("/extend", h.Extend)
			r.Post("/close-passed", h.ClosePassed)
			r.Post("/close-terminated", h.CloseTerminated)
			r.Get("/pdf", h.ExportPDF)
		})

		r.Post("/checkins/{checkinId}/acknowledge", h.AcknowledgeCheckin)
	})
}

// hasRole reports whether the authenticated user has any of the given roles.
func hasRole(r *http.Request, roles ...string) bool {
	role := strings.ToLower(strings.TrimSpace(middleware.Role(r.Context())))
	if role == "" {
		return false
	}
	for _, want := range roles {
		if strings.EqualFold(role, want) {
			return true
		}
	}
	return false
}

func forbidden(w http.ResponseWriter, msg string) {
	WriteJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: msg})
}

// Initiate — POST /pip. Manager or HR.
func (h *PipHandler) Initiate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: "user context required"})
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_or_hr_required")
		return
	}
	var req service.InitiateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.InitiateCase(r.Context(), tid, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// SubmitLegal — POST /pip/{id}/submit-legal. Manager or HR.
func (h *PipHandler) SubmitLegal(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_or_hr_required")
		return
	}
	var body struct {
		HRReviewerID *uuid.UUID `json:"hr_reviewer_id,omitempty"`
	}
	// empty body is allowed — HR reviewer may already be set on the case.
	if err := DecodeJSON(r, &body); err != nil && err != io.EOF {
		// ignore decode errors — body is optional
		_ = err
	}
	c, err := h.svc.SubmitForLegal(r.Context(), tid, id, actor, body.HRReviewerID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// ApproveLegal — POST /pip/{id}/approve-legal. Legal reviewer or HR admin.
func (h *PipHandler) ApproveLegal(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "legal", "legal_reviewer", "hr_admin", "admin") {
		forbidden(w, "legal_reviewer_required")
		return
	}
	var req service.ApproveLegalRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.ApproveLegal(r.Context(), tid, id, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// AddGoal — POST /pip/{id}/goals.
func (h *PipHandler) AddGoal(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_or_hr_required")
		return
	}
	var req service.AddGoalRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	g, err := h.svc.AddGoal(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, g)
}

// AddCheckin — POST /pip/{id}/checkins.
func (h *PipHandler) AddCheckin(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_or_hr_required")
		return
	}
	var req service.AddCheckinRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	k, err := h.svc.AddCheckin(r.Context(), tid, id, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, k)
}

// AcknowledgeCheckin — POST /pip/checkins/{checkinId}/acknowledge.
// Employee only; records IP + UA + timestamp.
func (h *PipHandler) AcknowledgeCheckin(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "checkinId"))
	if !ok {
		return
	}
	var req service.AcknowledgeCheckinRequest
	_ = DecodeJSON(r, &req) // body optional
	ip := clientIP(r)
	ua := r.Header.Get("User-Agent")
	if err := h.svc.AcknowledgeCheckin(r.Context(), tid, cid, ip, ua, req); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "acknowledged_at": time.Now().UTC()})
}

// Extend — POST /pip/{id}/extend.
func (h *PipHandler) Extend(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "hr", "hr_admin", "admin") {
		forbidden(w, "hr_required")
		return
	}
	var req service.ExtendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.ExtendCase(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// ClosePassed — POST /pip/{id}/close-passed.
func (h *PipHandler) ClosePassed(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_or_hr_required")
		return
	}
	var req service.CloseRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.ClosePassed(r.Context(), tid, id, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// CloseTerminated — POST /pip/{id}/close-terminated.
// İş Kanunu 25/2 — requires legal_file_url.
func (h *PipHandler) CloseTerminated(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if !hasRole(r, "hr", "hr_admin", "admin") {
		forbidden(w, "hr_required")
		return
	}
	var req service.CloseRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.CloseTerminated(r.Context(), tid, id, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// Get — GET /pip/{id}.
func (h *PipHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	// Authz: employee can only see own cases.
	if hasRole(r, "employee") && !hasRole(r, "manager", "hr", "hr_admin", "admin", "legal", "legal_reviewer") {
		if c.EmployeeID != actor {
			forbidden(w, "employee_scope")
			return
		}
	}
	WriteJSON(w, http.StatusOK, c)
}

// List — GET /pip. HR/admin (or legal reviewer) only.
func (h *PipHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if !hasRole(r, "hr", "hr_admin", "admin", "legal", "legal_reviewer") {
		forbidden(w, "hr_required")
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	reason := strings.TrimSpace(r.URL.Query().Get("reason"))
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.svc.List(r.Context(), tid, service.ListFilter{
		Status:        status,
		Reason:        reason,
		IncludeClosed: true,
	}, page, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items, "total": total, "page": page, "limit": limit,
	})
}

// ListMine — GET /pip/mine. Employee's own cases (read-only).
func (h *PipHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	items, err := h.svc.ListForEmployee(r.Context(), tid, actor)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ListManaged — GET /pip/managed. Manager's own team cases.
func (h *PipHandler) ListManaged(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	if !hasRole(r, "manager", "hr", "hr_admin", "admin") {
		forbidden(w, "manager_required")
		return
	}
	items, err := h.svc.ListForManager(r.Context(), tid, actor)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// ExportPDF — GET /pip/{id}/pdf. İş Kanunu 25/2 şablonlu PDF.
func (h *PipHandler) ExportPDF(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.BuildPDFPayload(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	pdf, err := RenderPipPDF(c)
	if err != nil {
		WriteError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="PIP_%s.pdf"`, c.ID.String()))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", pdf.Len()))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdf.Bytes())
}

// clientIP extracts the best-effort client IP for audit trail.
func clientIP(r *http.Request) string {
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			candidate := strings.TrimSpace(parts[0])
			if net.ParseIP(candidate) != nil {
				return candidate
			}
		}
	}
	if xrip := strings.TrimSpace(r.Header.Get("X-Real-IP")); xrip != "" {
		if net.ParseIP(xrip) != nil {
			return xrip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

