package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
)

// SubscriptionHandler exposes subscription management endpoints.
type SubscriptionHandler struct {
	svc *service.SubscriptionService
	dep Dependencies
}

// NewSubscriptionHandler constructs a SubscriptionHandler.
func NewSubscriptionHandler(svc *service.SubscriptionService, dep Dependencies) *SubscriptionHandler {
	return &SubscriptionHandler{svc: svc, dep: dep}
}

// GetCurrent handles GET /subscriptions/current.
func (h *SubscriptionHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	view, err := h.svc.GetCurrent(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, view)
}

// changePlanRequest is the body of POST /subscriptions.
type changePlanRequest struct {
	PlanID string `json:"plan_id" validate:"required"`
}

// ChangePlan handles POST /subscriptions.
func (h *SubscriptionHandler) ChangePlan(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req changePlanRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(req); err != nil {
		WriteError(w, err)
		return
	}
	view, err := h.svc.ChangePlan(r.Context(), tid, req.PlanID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, view)
}

// Cancel handles POST /subscriptions/cancel.
func (h *SubscriptionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	sub, err := h.svc.Cancel(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sub)
}

// Resume handles POST /subscriptions/resume.
func (h *SubscriptionHandler) Resume(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	sub, err := h.svc.Resume(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sub)
}

// seatsRequest carries the body of PATCH /subscriptions/seats.
type seatsRequest struct {
	Seats int `json:"seats" validate:"gte=0"`
}

// UpdateSeats handles PATCH /subscriptions/seats.
func (h *SubscriptionHandler) UpdateSeats(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req seatsRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(req); err != nil {
		WriteError(w, err)
		return
	}
	sub, err := h.svc.UpdateSeats(r.Context(), tid, req.Seats)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sub)
}
