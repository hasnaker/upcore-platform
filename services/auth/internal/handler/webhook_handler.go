package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/upcore/auth/internal/clerk"
	"github.com/upcore/auth/internal/domain"
)

// WebhookHandler validates & dispatches Clerk webhooks.
type WebhookHandler struct {
	verifier   *clerk.SvixVerifier
	dispatcher *clerk.Dispatcher
}

// NewWebhookHandler constructs a WebhookHandler.
func NewWebhookHandler(verifier *clerk.SvixVerifier, dispatcher *clerk.Dispatcher) *WebhookHandler {
	return &WebhookHandler{verifier: verifier, dispatcher: dispatcher}
}

// Handle is POST /webhooks/clerk.
func (h *WebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "read_body", err.Error())
		return
	}
	defer r.Body.Close()

	if err := h.verifier.Verify(r.Header, body); err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, domain.ErrWebhookStaleTimestamp) {
			status = http.StatusBadRequest
		}
		log.Warn().Err(err).Msg("webhook signature verification failed")
		writeError(w, status, "invalid_signature", err.Error())
		return
	}

	var evt clerk.Event
	if err := json.Unmarshal(body, &evt); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", err.Error())
		return
	}

	if err := h.dispatcher.Dispatch(r.Context(), evt); err != nil {
		log.Error().Err(err).Str("event", evt.Type).Msg("dispatch failed")
		writeError(w, http.StatusUnprocessableEntity, "dispatch_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"received": true, "type": evt.Type})
}
