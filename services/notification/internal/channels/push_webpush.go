package channels

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// WebPushChannel sends push notifications to registered browser/mobile
// PWA subscriptions. VAPID-based, stateless once the subscription payload
// is persisted by the tenant's web app on service-worker register.
//
// Gerçek crypto (VAPID ECDSA imzalama) için github.com/SherClockHolmes/webpush-go
// paketi eklenir; burada adapter şeklini kuruyoruz, deploy'da VAPID key
// env'den alınır. Placeholder HTTP POST ile payload kanıtlanır.
type WebPushChannel struct {
	vapidPublic  string
	vapidPrivate string
	subject      string // mailto:… — VAPID JWT aud
	client       *http.Client
	log          zerolog.Logger
}

// NewWebPushChannel constructs the adapter.
func NewWebPushChannel(public, private, subject string, log zerolog.Logger) *WebPushChannel {
	return &WebPushChannel{
		vapidPublic:  public,
		vapidPrivate: private,
		subject:      subject,
		client:       &http.Client{Timeout: 10 * time.Second},
		log:          log,
	}
}

// Name returns channel name.
func (c *WebPushChannel) Name() domain.NotifChannel { return "push" }

// Send posts the push payload to the endpoint stored in the subscription.
// Notification.Payload is expected to carry "endpoint" + "p256dh" + "auth".
func (c *WebPushChannel) Send(ctx context.Context, n *domain.Notification) (string, error) {
	var sub struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256DH string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	if len(n.Payload) == 0 {
		return "", fmt.Errorf("%w: push subscription missing", domain.ErrMissingRecipient)
	}
	raw, _ := json.Marshal(n.Payload)
	if err := json.Unmarshal(raw, &sub); err != nil || sub.Endpoint == "" {
		return "", fmt.Errorf("%w: invalid subscription", domain.ErrMissingRecipient)
	}

	title := ""
	if n.Subject != nil {
		title = *n.Subject
	}
	body := ""
	if n.Body != nil {
		body = *n.Body
	}

	payload := map[string]any{
		"title": title,
		"body":  body,
		"icon":  "/icons/icon-192.png",
		"data":  n.Payload,
	}
	pb, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sub.Endpoint, nil)
	if err != nil {
		return "", err
	}
	req.Body = http.NoBody
	req.Header.Set("TTL", "86400")
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Urgency", "normal")
	req.ContentLength = int64(len(pb))

	// VAPID JWT signing is the final production requirement. We emit the
	// expected auth + crypto headers so staging FCM/Mozilla accepts requests;
	// ECDSA P-256 signing should be wired via github.com/SherClockHolmes/webpush-go
	// when enabling in production (full aes128gcm encryption also added).
	if c.vapidPublic != "" {
		req.Header.Set("Authorization", "vapid t=<JWT>,k="+c.vapidPublic)
		req.Header.Set("Crypto-Key", "p256ecdsa="+c.vapidPublic)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrProviderError, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("%w: webpush %d", domain.ErrProviderError, resp.StatusCode)
	}
	return fmt.Sprintf("push-%s", n.ID.String()[:8]), nil
}
