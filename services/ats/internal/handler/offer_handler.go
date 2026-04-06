package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/service"
)

// OfferHandler exposes offer endpoints.
type OfferHandler struct {
	svc *service.OfferService
	dep Dependencies
}

// NewOfferHandler constructs an OfferHandler.
func NewOfferHandler(svc *service.OfferService, dep Dependencies) *OfferHandler {
	return &OfferHandler{svc: svc, dep: dep}
}

// Create handles POST /api/v1/ats/offers.
func (h *OfferHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateOfferRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Create(r.Context(), tid, uid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/ats/offers/{id}.
func (h *OfferHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Patch handles PATCH /api/v1/ats/offers/{id}.
func (h *OfferHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.UpdateOfferRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Send handles POST /api/v1/ats/offers/{id}/send.
func (h *OfferHandler) Send(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Send(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"sent_at":     result.SentAt,
		"document_id": result.DocumentID,
	})
}

// Accept handles POST /api/v1/ats/offers/{id}/accept.
func (h *OfferHandler) Accept(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	_, err := h.svc.Accept(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// Decline handles POST /api/v1/ats/offers/{id}/decline.
func (h *OfferHandler) Decline(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.DeclineOfferRequest
	_ = DecodeJSON(r, &req)
	_, err := h.svc.Decline(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "declined"})
}

// Withdraw handles POST /api/v1/ats/offers/{id}/withdraw.
func (h *OfferHandler) Withdraw(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.WithdrawOfferRequest
	_ = DecodeJSON(r, &req)
	_, err := h.svc.Withdraw(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "withdrawn"})
}
