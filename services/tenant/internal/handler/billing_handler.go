package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/upcore/tenant/internal/service"
)

// BillingHandler processes billing provider webhooks.
type BillingHandler struct {
	svc             *service.BillingService
	stripeSecret    string
	iyzicoSecret    string
	dep             Dependencies
}

// NewBillingHandler constructs a BillingHandler.
func NewBillingHandler(svc *service.BillingService, stripeSecret, iyzicoSecret string, dep Dependencies) *BillingHandler {
	return &BillingHandler{svc: svc, stripeSecret: stripeSecret, iyzicoSecret: iyzicoSecret, dep: dep}
}

// HandleWebhook is POST /webhooks/billing (provider in query ?provider=stripe|iyzico).
func (h *BillingHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	provider := service.WebhookProvider(r.URL.Query().Get("provider"))
	if provider == "" {
		provider = service.ProviderStripe
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	// Signature verification (simplified). Production would use provider-specific verification.
	sig := r.Header.Get("X-Signature")
	if !h.verifySignature(provider, body, sig) {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "invalid_signature"})
		return
	}

	var raw struct {
		ID   string          `json:"id"`
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}

	evt := service.WebhookEvent{
		Provider:   provider,
		EventID:    raw.ID,
		EventType:  raw.Type,
		Payload:    raw.Data,
		ReceivedAt: time.Now().UTC(),
	}
	if err := h.svc.HandleWebhook(r.Context(), evt); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]bool{"received": true})
}

// verifySignature is intentionally lenient: if no secret is configured, skip.
// Production deployments must wire real Stripe/Iyzico signature verification.
func (h *BillingHandler) verifySignature(provider service.WebhookProvider, _ []byte, sig string) bool {
	var secret string
	switch provider {
	case service.ProviderStripe:
		secret = h.stripeSecret
	case service.ProviderIyzico:
		secret = h.iyzicoSecret
	}
	if secret == "" {
		// Dev mode: allow without signature.
		return true
	}
	return sig != "" // accept any non-empty signature when secret configured
}
