package channels

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/rs/zerolog"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"

	"github.com/upcore/notification/internal/domain"
)

// SendGridChannel delivers emails via the SendGrid API.
type SendGridChannel struct {
	client    *sendgrid.Client
	fromEmail string
	fromName  string
	log       zerolog.Logger
}

// NewSendGridChannel constructs a SendGrid email channel.
func NewSendGridChannel(apiKey, fromEmail, fromName string, log zerolog.Logger) *SendGridChannel {
	return &SendGridChannel{
		client:    sendgrid.NewSendClient(apiKey),
		fromEmail: fromEmail,
		fromName:  fromName,
		log:       log,
	}
}

// Name returns the channel identifier.
func (s *SendGridChannel) Name() domain.NotifChannel {
	return domain.ChannelEmail
}

// Send delivers an email notification via SendGrid.
func (s *SendGridChannel) Send(ctx context.Context, n *domain.Notification) (string, error) {
	if strings.TrimSpace(n.RecipientEmail) == "" {
		return "", fmt.Errorf("%w: no recipient email", domain.ErrMissingRecipient)
	}

	from := mail.NewEmail(s.fromName, s.fromEmail)
	to := mail.NewEmail("", n.RecipientEmail)

	subject := ""
	if n.Subject != nil {
		subject = *n.Subject
	}
	body := ""
	if n.Body != nil {
		body = *n.Body
	}

	message := mail.NewSingleEmail(from, subject, to, body, body)

	s.log.Debug().
		Str("to", n.RecipientEmail).
		Str("subject", subject).
		Msg("sending email via SendGrid")

	resp, err := s.client.SendWithContext(ctx, message)
	if err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrProviderError, err)
	}

	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("%w: sendgrid status %d: %s",
			domain.ErrProviderError, resp.StatusCode, resp.Body)
	}

	// Extract provider message ID from X-Message-Id header.
	providerID := resp.Headers["X-Message-Id"]
	if len(providerID) > 0 {
		return providerID[0], nil
	}
	return fmt.Sprintf("sg-%s", n.ID.String()[:8]), nil
}
