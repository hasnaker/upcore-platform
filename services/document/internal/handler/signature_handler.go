package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/service"
)

// SignatureHandler serves e-signature endpoints.
type SignatureHandler struct {
	svc *service.SignatureService
	dep Dependencies
}

// NewSignatureHandler constructs a SignatureHandler.
func NewSignatureHandler(svc *service.SignatureService, dep Dependencies) *SignatureHandler {
	return &SignatureHandler{svc: svc, dep: dep}
}

// InitiateRequest is the JSON body for POST /documents/{id}/signature.
type InitiateRequest struct {
	SignerEmployeeID string `json:"signer_employee_id" validate:"required,uuid"`
	Provider         string `json:"provider" validate:"required"`
	SignerName       string `json:"signer_name"`
	SignerTCKN       string `json:"signer_tckn"`
	SignerEmail      string `json:"signer_email"`
	CallbackURL      string `json:"callback_url"`
}

// Initiate handles POST /documents/{id}/signature.
func (h *SignatureHandler) Initiate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	var body InitiateRequest
	if err := DecodeJSON(r, &body); err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	if err := h.dep.Validator.Struct(body); err != nil {
		WriteError(w, err)
		return
	}
	signerID, err := uuid.Parse(body.SignerEmployeeID)
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	provider, err := domain.ParseSignProvider(body.Provider)
	if err != nil {
		WriteError(w, err)
		return
	}
	sig, signURL, err := h.svc.Initiate(ctx, service.SignatureInitiateRequest{
		TenantID:         tenantID,
		DocumentID:       docID,
		SignerEmployeeID: signerID,
		Provider:         provider,
		SignerName:       body.SignerName,
		SignerTCKN:       body.SignerTCKN,
		SignerEmail:      body.SignerEmail,
		CallbackURL:      body.CallbackURL,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{
		"signature_id": sig.ID,
		"status":       sig.Status,
		"provider":     sig.Provider,
		"sign_url":     signURL,
		"expires_at":   sig.ExpiresAt,
	})
}

// Status handles GET /documents/{id}/signature/status?signature_id=...
func (h *SignatureHandler) Status(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	sigIDStr := r.URL.Query().Get("signature_id")
	sigID, err := uuid.Parse(sigIDStr)
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	sig, err := h.svc.GetStatus(ctx, tenantID, sigID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sig)
}

// Cancel handles DELETE /signatures/{id}.
func (h *SignatureHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	sigID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	sig, err := h.svc.Cancel(ctx, tenantID, sigID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sig)
}
