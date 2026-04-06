package handler

import (
	"net/http"

	"github.com/upcore/tenant/internal/service"
)

// SignupHandler serves POST /signup.
type SignupHandler struct {
	svc *service.TenantService
	dep Dependencies
}

// NewSignupHandler constructs a SignupHandler.
func NewSignupHandler(svc *service.TenantService, dep Dependencies) *SignupHandler {
	return &SignupHandler{svc: svc, dep: dep}
}

// Post handles POST /signup.
func (h *SignupHandler) Post(w http.ResponseWriter, r *http.Request) {
	var req service.SignupRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.dep.Validator.Struct(req); err != nil {
		WriteError(w, err)
		return
	}
	result, err := h.svc.Signup(r.Context(), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}
