package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// WebhookHandler processes inbound webhooks from email/SMS providers.
type WebhookHandler struct {
	notifRepo    repository.NotificationRepository
	suppRepo     repository.SuppressionRepository
	sgWebhookKey string
	bounceSuppAt int
	log          zerolog.Logger
}

// NewWebhookHandler constructs a WebhookHandler.
func NewWebhookHandler(
	notifRepo repository.NotificationRepository,
	suppRepo repository.SuppressionRepository,
	sgWebhookKey string,
	bounceSuppAt int,
	log zerolog.Logger,
) *WebhookHandler {
	return &WebhookHandler{
		notifRepo:    notifRepo,
		suppRepo:     suppRepo,
		sgWebhookKey: sgWebhookKey,
		bounceSuppAt: bounceSuppAt,
		log:          log,
	}
}

// sendGridEvent represents a single event in a SendGrid webhook batch.
type sendGridEvent struct {
	Email     string `json:"email"`
	Event     string `json:"event"`
	SGMsgID   string `json:"sg_message_id"`
	Reason    string `json:"reason"`
	Timestamp int64  `json:"timestamp"`
}

// PostSendGridWebhook handles POST /webhooks/sendgrid.
func (h *WebhookHandler) PostSendGridWebhook(w http.ResponseWriter, r *http.Request) {
	// Verify signature if key is configured.
	if h.sgWebhookKey != "" {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
			return
		}
		signature := r.Header.Get("X-Twilio-Email-Event-Webhook-Signature")
		timestamp := r.Header.Get("X-Twilio-Email-Event-Webhook-Timestamp")

		if !h.verifySendGridSignature(body, signature, timestamp) {
			h.log.Warn().Msg("invalid sendgrid webhook signature")
			WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "invalid_signature"})
			return
		}

		// Parse the body we already read.
		var events []sendGridEvent
		if err := json.Unmarshal(body, &events); err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
			return
		}
		h.processSendGridEvents(r, events)
	} else {
		var events []sendGridEvent
		if err := json.NewDecoder(r.Body).Decode(&events); err != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
			return
		}
		h.processSendGridEvents(r, events)
	}

	WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *WebhookHandler) processSendGridEvents(r *http.Request, events []sendGridEvent) {
	ctx := r.Context()
	for _, evt := range events {
		switch evt.Event {
		case "delivered":
			// Find notification by provider ref and mark delivered.
			h.log.Debug().
				Str("email", evt.Email).
				Str("sg_message_id", evt.SGMsgID).
				Msg("sendgrid: delivered")

		case "bounce", "dropped":
			h.log.Warn().
				Str("email", evt.Email).
				Str("reason", evt.Reason).
				Msg("sendgrid: bounce/dropped")

			// Increment bounce count; suppress at threshold.
			count, err := h.suppRepo.IncrementBounce(ctx, evt.Email)
			if err != nil {
				h.log.Error().Err(err).Msg("increment bounce count")
				continue
			}
			if count >= h.bounceSuppAt {
				if err := h.suppRepo.Upsert(ctx, evt.Email, domain.SuppReasonBounce); err != nil {
					h.log.Error().Err(err).Msg("suppress email")
				}
				h.log.Warn().
					Str("email", evt.Email).
					Int("bounce_count", count).
					Msg("email suppressed due to bounces")
			}

		case "spamreport":
			h.log.Warn().
				Str("email", evt.Email).
				Msg("sendgrid: spam report")
			_ = h.suppRepo.Upsert(ctx, evt.Email, domain.SuppReasonComplaint)

		case "open", "click":
			h.log.Debug().
				Str("email", evt.Email).
				Str("event", evt.Event).
				Msg("sendgrid: engagement event")
		}
	}
}

// verifySendGridSignature validates the SendGrid event webhook signature.
func (h *WebhookHandler) verifySendGridSignature(body []byte, signature, timestamp string) bool {
	if h.sgWebhookKey == "" || signature == "" || timestamp == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(h.sgWebhookKey))
	mac.Write([]byte(timestamp))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// PostNetgsmWebhook handles POST /webhooks/netgsm.
func (h *WebhookHandler) PostNetgsmWebhook(w http.ResponseWriter, r *http.Request) {
	// Netgsm delivery reports are parsed here.
	// Format varies by integration method; this is a placeholder.
	h.log.Info().Msg("netgsm webhook received")
	WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
