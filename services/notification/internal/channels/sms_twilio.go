package channels

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// TwilioChannel is the HTTP Twilio Messages API adapter.
// Türkiye dışına SMS veya uluslararası operatör routing için kullanılır.
// Yerli (TR) operatörler için Netgsm adapter'ı daha ucuz + 9h/gönder SLA.
type TwilioChannel struct {
	accountSID string
	authToken  string
	from       string
	client     *http.Client
	log        zerolog.Logger
}

// NewTwilioChannel constructs the adapter.
func NewTwilioChannel(accountSID, authToken, fromNumber string, log zerolog.Logger) *TwilioChannel {
	return &TwilioChannel{
		accountSID: accountSID,
		authToken:  authToken,
		from:       fromNumber,
		client:     &http.Client{Timeout: 15 * time.Second},
		log:        log,
	}
}

// Name returns the channel name for preferences.
func (t *TwilioChannel) Name() domain.NotifChannel { return domain.ChannelSMS }

// Send dispatches a single SMS via Twilio REST API.
func (t *TwilioChannel) Send(ctx context.Context, n *domain.Notification) (string, error) {
	to := strings.TrimSpace(n.RecipientEmail) // Notification struct reuses email field
	// Convention: SMS recipient comes in the RecipientEmail field as E.164 phone.
	// Cleaner design would add RecipientPhone; kept minimal to avoid schema churn.
	if to == "" {
		return "", fmt.Errorf("%w: no recipient phone", domain.ErrMissingRecipient)
	}
	body := ""
	if n.Body != nil {
		body = *n.Body
	}
	if body == "" {
		return "", fmt.Errorf("%w: empty body", domain.ErrMissingRecipient)
	}

	form := url.Values{}
	form.Set("From", t.from)
	form.Set("To", to)
	form.Set("Body", body)

	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", t.accountSID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	auth := base64.StdEncoding.EncodeToString([]byte(t.accountSID + ":" + t.authToken))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := t.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrProviderError, err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= http.StatusBadRequest {
		return "", fmt.Errorf("%w: twilio %d: %s",
			domain.ErrProviderError, resp.StatusCode, string(raw))
	}
	t.log.Debug().Str("to", to).Bytes("resp", bytes.TrimSpace(raw)).Msg("twilio sms sent")

	// Twilio returns JSON with "sid" — we return it as provider reference.
	// Parse is intentionally loose to avoid dependency on their schema.
	sid := extractSID(string(raw))
	if sid == "" {
		sid = "twilio-" + n.ID.String()[:8]
	}
	return sid, nil
}

func extractSID(s string) string {
	const key = "\"sid\":\""
	i := strings.Index(s, key)
	if i < 0 {
		return ""
	}
	rest := s[i+len(key):]
	j := strings.Index(rest, "\"")
	if j < 0 {
		return ""
	}
	return rest[:j]
}
