// Package handler — 360° feedback endpoints.
package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/service"
)

// Survey360Handler exposes /surveys/360 endpoints.
type Survey360Handler struct{ svc *service.Survey360Service }

// NewSurvey360Handler constructs the handler.
func NewSurvey360Handler(svc *service.Survey360Service) *Survey360Handler {
	return &Survey360Handler{svc: svc}
}

// Register wires endpoints onto a chi router mounted at /surveys/360.
func (h *Survey360Handler) Register(r chi.Router) {
	r.Route("/campaigns", func(r chi.Router) {
		r.Post("/", h.CreateCampaign)
		r.Get("/", h.ListCampaigns)
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", h.GetCampaign)
			r.Post("/invitations", h.AddInvitation)
			r.Get("/invitations", h.ListInvitationsByCampaign)
			r.Post("/distribute", h.Distribute)
			r.Get("/report", h.GetReport)
		})
	})
	r.Route("/invitations", func(r chi.Router) {
		r.Get("/", h.ListMyInvitations)
		r.Get("/{id}", h.GetInvitation)
		r.Post("/{id}/responses", h.SubmitResponse)
	})
}

// CreateCampaign POST /surveys/360/campaigns
func (h *Survey360Handler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if tid == uuid.Nil || actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateCampaignRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	c, err := h.svc.CreateCampaign(r.Context(), tid, actor, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, c)
}

// ListCampaigns GET /surveys/360/campaigns?subject_user_id=<uuid>
func (h *Survey360Handler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	subj := ParseUUIDQuery(r, "subject_user_id")
	items, err := h.svc.ListCampaignsForSubject(r.Context(), tid, subj)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetCampaign GET /surveys/360/campaigns/{id}
func (h *Survey360Handler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.GetCampaign(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// AddInvitation POST /surveys/360/campaigns/{id}/invitations
func (h *Survey360Handler) AddInvitation(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.InviteRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	inv, err := h.svc.AddInvitation(r.Context(), tid, cid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, inv)
}

// ListInvitationsByCampaign GET /surveys/360/campaigns/{id}/invitations
// In anonymous mode we strip reviewer_user_id before responding so tenant admins
// cannot correlate responses back to individual reviewers.
func (h *Survey360Handler) ListInvitationsByCampaign(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	camp, err := h.svc.GetCampaign(r.Context(), tid, cid)
	if err != nil {
		WriteError(w, err)
		return
	}
	invs, err := h.svc.InvitationsByCampaign(r.Context(), tid, cid)
	if err != nil {
		WriteError(w, err)
		return
	}
	actor := middleware.UserID(r.Context())
	anonymize := camp.IsAnonymous() && actor != camp.CreatedBy && actor != camp.SubjectUserID
	out := make([]map[string]any, 0, len(invs))
	for _, inv := range invs {
		item := map[string]any{
			"id":           inv.ID,
			"campaign_id":  inv.CampaignID,
			"relation":     inv.Relation,
			"status":       inv.Status,
			"sent_at":      inv.SentAt,
			"responded_at": inv.RespondedAt,
			"created_at":   inv.CreatedAt,
			"updated_at":   inv.UpdatedAt,
		}
		if !anonymize {
			item["reviewer_user_id"] = inv.ReviewerUserID
		}
		out = append(out, item)
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

// Distribute POST /surveys/360/campaigns/{id}/distribute
func (h *Survey360Handler) Distribute(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Distribute(r.Context(), tid, cid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, c)
}

// GetReport GET /surveys/360/campaigns/{id}/report
func (h *Survey360Handler) GetReport(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	cid, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	rep, err := h.svc.Report(r.Context(), tid, cid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, rep)
}

// ListMyInvitations GET /surveys/360/invitations?reviewer_user_id=<uuid>
func (h *Survey360Handler) ListMyInvitations(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	reviewer := ParseUUIDQuery(r, "reviewer_user_id")
	if reviewer == uuid.Nil {
		// Default to the authenticated user's own invitations.
		reviewer = middleware.UserID(r.Context())
	}
	if reviewer == uuid.Nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "reviewer_user_id required"})
		return
	}
	items, err := h.svc.ListInvitationsForReviewer(r.Context(), tid, reviewer)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// GetInvitation GET /surveys/360/invitations/{id}
func (h *Survey360Handler) GetInvitation(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	actor := middleware.UserID(r.Context())
	inv, err := h.svc.GetInvitation(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	// Reviewer sadece kendi davetine erişebilir.
	if actor != uuid.Nil && inv.ReviewerUserID != actor {
		WriteJSON(w, http.StatusForbidden, ErrorResponse{Error: "forbidden"})
		return
	}
	WriteJSON(w, http.StatusOK, inv)
}

// SubmitResponse POST /surveys/360/invitations/{id}/responses
func (h *Survey360Handler) SubmitResponse(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.SubmitResponseRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.svc.SubmitResponse(r.Context(), tid, id, actor, req); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{"ok": true})
}
