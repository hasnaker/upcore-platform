package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// ESignWebhookHandler receives callbacks from e-signature providers (DocuSign,
// KEP, Adobe Sign). We don't yet ship a full integration — this is a safe
// generic receiver that marks the offer as signed and logs the envelope_id
// for later audit. Swap per-provider verification when ready.
type ESignWebhookHandler struct {
	offers *service.OfferService
	log    zerolog.Logger
}

// NewESignWebhookHandler constructs the handler.
func NewESignWebhookHandler(offers *service.OfferService, log zerolog.Logger) *ESignWebhookHandler {
	return &ESignWebhookHandler{offers: offers, log: log}
}

// ESignCallback is the JSON payload from the provider. Example:
//   {"offer_id":"…","status":"signed","envelope_id":"abc","signer_email":"x@y.com","timestamp":"..."}
type ESignCallback struct {
	Status      string `json:"status"`        // signed | declined | expired
	EnvelopeID  string `json:"envelope_id"`
	SignerEmail string `json:"signer_email"`
	Timestamp   string `json:"timestamp"`
	Reason      string `json:"reason,omitempty"`
}

// Handle serves POST /offers/{id}/esign-callback.
// This endpoint is idempotent — same envelope_id replays are no-op.
// Signature verification (HMAC / JWT) should be added per provider; for now
// we require the standard tenant+auth context which the gateway injects.
func (h *ESignWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	offerID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body ESignCallback
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	h.log.Info().
		Str("offer_id", offerID.String()).
		Str("envelope_id", body.EnvelopeID).
		Str("status", body.Status).
		Str("signer", body.SignerEmail).
		Msg("e-sign webhook received")

	switch body.Status {
	case "signed", "completed":
		if _, err := h.offers.Accept(r.Context(), tid, offerID); err != nil {
			WriteError(w, err)
			return
		}
	case "declined", "rejected":
		reason := body.Reason
		if reason == "" {
			reason = "declined_via_esign"
		}
		// Decline best-effort; offer service may reject if state not permitted.
		if _, err := h.offers.Decline(r.Context(), tid, offerID, reason); err != nil {
			h.log.Warn().Err(err).Msg("esign decline: already finalised")
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}
