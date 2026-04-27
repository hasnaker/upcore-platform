package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// OfferHandler exposes the offer-letter HTTP endpoints.
type OfferHandler struct {
	svc *service.OfferService
}

// NewOfferHandler constructs an OfferHandler.
func NewOfferHandler(svc *service.OfferService) *OfferHandler {
	return &OfferHandler{svc: svc}
}

// List handles GET /api/v1/offers.
func (h *OfferHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	params := service.OfferListParams{
		Status:        r.URL.Query().Get("status"),
		RequisitionID: ParseUUIDQuery(r, "requisition_id"),
		CandidateID:   ParseUUIDQuery(r, "candidate_id"),
		Page:          ParseIntQuery(r, "page", 0),
		Limit:         ParseIntQuery(r, "limit", 50),
	}
	items, total, err := h.svc.List(r.Context(), tid, params)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  params.Page,
		"limit": params.Limit,
	})
}

// Create handles POST /api/v1/offers.
func (h *OfferHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	var req service.OfferCreateRequest
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

// Get handles GET /api/v1/offers/{id}.
func (h *OfferHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
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

// Send handles POST /api/v1/offers/{id}/send.
func (h *OfferHandler) Send(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.Send(r.Context(), tid, actor, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Accept handles POST /api/v1/offers/{id}/accept.
func (h *OfferHandler) Accept(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.Accept(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Decline handles POST /api/v1/offers/{id}/decline.
func (h *OfferHandler) Decline(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body service.OfferDeclineRequest
	if r.ContentLength > 0 {
		if err := DecodeJSON(r, &body); err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
			return
		}
	}
	o, err := h.svc.Decline(r.Context(), tid, id, body.Reason)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// Revoke handles POST /api/v1/offers/{id}/revoke.
func (h *OfferHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body service.OfferDeclineRequest
	if r.ContentLength > 0 {
		if err := DecodeJSON(r, &body); err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
			return
		}
	}
	o, err := h.svc.Revoke(r.Context(), tid, id, body.Reason)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

// View handles POST /api/v1/offers/{id}/view — candidate-side ping.
func (h *OfferHandler) View(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	o, err := h.svc.MarkViewed(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, o)
}

