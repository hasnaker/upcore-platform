// Package subscriber drives e-mail double opt-in and incident
// notification fan-out. The default provider is Postmark but any provider
// that accepts "from/to/subject/body" satisfies the Mailer interface.
package subscriber

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// Mailer sends a transactional email.
type Mailer interface {
	Send(ctx context.Context, msg Message) error
}

// Message is the minimal form a Mailer must accept.
type Message struct {
	From    string
	To      string
	Subject string
	HTML    string
	Text    string
	Tag     string
}

// NoopMailer logs but does not actually send — used in dev/test.
type NoopMailer struct{}

// Send is a no-op that validates input.
func (NoopMailer) Send(_ context.Context, m Message) error {
	if strings.TrimSpace(m.To) == "" {
		return errors.New("to_required")
	}
	return nil
}

// PostmarkMailer implements Mailer against the Postmark API.
type PostmarkMailer struct {
	Token  string
	From   string
	Stream string
	HTTP   *http.Client
}

// NewPostmark builds a mailer from env (POSTMARK_TOKEN, POSTMARK_FROM).
// Returns NoopMailer if no token is set.
func NewPostmark() Mailer {
	tok := os.Getenv("POSTMARK_TOKEN")
	if tok == "" {
		return NoopMailer{}
	}
	return &PostmarkMailer{
		Token:  tok,
		From:   envOr("POSTMARK_FROM", "status@upcore.io"),
		Stream: envOr("POSTMARK_STREAM", "outbound"),
		HTTP:   &http.Client{Timeout: 8 * time.Second},
	}
}

// Send posts the message to Postmark's /email endpoint.
func (p *PostmarkMailer) Send(ctx context.Context, m Message) error {
	payload := map[string]string{
		"From":          firstNonEmpty(m.From, p.From),
		"To":            m.To,
		"Subject":       m.Subject,
		"HtmlBody":      m.HTML,
		"TextBody":      m.Text,
		"MessageStream": p.Stream,
		"Tag":           m.Tag,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.postmarkapp.com/email", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Postmark-Server-Token", p.Token)

	resp, err := p.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("postmark: http %d", resp.StatusCode)
	}
	return nil
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func firstNonEmpty(a, b string) string {
	if strings.TrimSpace(a) != "" {
		return a
	}
	return b
}

// ConfirmationTemplate renders a tiny HTML/plain-text body for double opt-in.
func ConfirmationTemplate(baseURL, token string) (html, text string) {
	link := fmt.Sprintf("%s/status/subscribe/confirm?token=%s", strings.TrimRight(baseURL, "/"), token)
	html = fmt.Sprintf(`<!doctype html><html><body style="font-family:system-ui,sans-serif">
<h2>UpCore Status · aboneliğinizi doğrulayın</h2>
<p>Aboneliğinizi aktif etmek için aşağıdaki bağlantıyı tıklayın:</p>
<p><a href="%s">%s</a></p>
<p>Bu bağlantıyı talep etmediyseniz e-postayı görmezden gelin.</p>
</body></html>`, link, link)
	text = fmt.Sprintf("UpCore Status · aboneliğinizi doğrulayın: %s", link)
	return
}

// IncidentNotifyTemplate renders a message for incident announcements.
func IncidentNotifyTemplate(baseURL, title, status, body string) (html, text string) {
	html = fmt.Sprintf(`<!doctype html><html><body style="font-family:system-ui,sans-serif">
<h2>[%s] %s</h2>
<p>%s</p>
<p><a href="%s/status">Detay</a></p>
</body></html>`, status, title, body, strings.TrimRight(baseURL, "/"))
	text = fmt.Sprintf("[%s] %s — %s\n%s/status", status, title, body, strings.TrimRight(baseURL, "/"))
	return
}
