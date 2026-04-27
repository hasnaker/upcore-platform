package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Stripe adapter implements PaymentProvider via direct Stripe REST API.
// No SDK dependency; using Stripe's form-encoded POST interface.
// Docs: https://stripe.com/docs/api
type Stripe struct {
	APIKey        string
	WebhookSecret string
	BaseURL       string
	client        *http.Client
}

// NewStripe reads STRIPE_API_KEY + STRIPE_WEBHOOK_SECRET.
func NewStripe() *Stripe {
	return &Stripe{
		APIKey:        os.Getenv("STRIPE_API_KEY"),
		WebhookSecret: os.Getenv("STRIPE_WEBHOOK_SECRET"),
		BaseURL:       "https://api.stripe.com/v1",
		client:        &http.Client{Timeout: 30 * time.Second},
	}
}

// Name returns provider code.
func (*Stripe) Name() string { return "stripe" }

// post sends form-encoded POST with Basic auth (API key as username, empty password).
func (s *Stripe) post(ctx context.Context, endpoint string, form url.Values, idempotencyKey string) (map[string]any, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("stripe not configured (STRIPE_API_KEY)")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.BaseURL+endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Stripe-Version", "2024-06-20")
	req.SetBasicAuth(s.APIKey, "")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stripe http: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("stripe decode: %w (body=%s)", err, string(raw))
	}
	if resp.StatusCode >= 400 {
		errObj, _ := out["error"].(map[string]any)
		msg, _ := errObj["message"].(string)
		return out, fmt.Errorf("stripe error %d: %s", resp.StatusCode, msg)
	}
	return out, nil
}

// Charge creates a PaymentIntent and confirms immediately with the saved
// payment method. customerID is Stripe's "cus_..." ID (saved at CreateCustomer).
// Amount comes in as TRY; we send in kuruş (integer cents).
func (s *Stripe) Charge(ctx context.Context, customerID string, amountTRY float64, reference string) (string, error) {
	form := url.Values{}
	form.Set("amount", fmt.Sprintf("%d", int64(amountTRY*100)))
	form.Set("currency", "try")
	form.Set("customer", customerID)
	form.Set("confirm", "true")
	form.Set("off_session", "true")
	form.Set("description", reference)
	form.Set("payment_method_types[]", "card")

	resp, err := s.post(ctx, "/payment_intents", form, "billing:"+reference)
	if err != nil {
		return "", err
	}
	piID, _ := resp["id"].(string)
	if piID == "" {
		return "", fmt.Errorf("stripe returned empty payment_intent id")
	}
	return piID, nil
}

// CreateCustomer creates a Stripe Customer, linking tenant_id as metadata.
func (s *Stripe) CreateCustomer(ctx context.Context, tenantID uuid.UUID, email, vkn string) (string, error) {
	form := url.Values{}
	form.Set("email", email)
	form.Set("name", "UpCore tenant "+tenantID.String())
	form.Set("metadata[tenant_id]", tenantID.String())
	if vkn != "" {
		form.Set("metadata[vkn]", vkn)
	}

	resp, err := s.post(ctx, "/customers", form, "")
	if err != nil {
		return "", err
	}
	custID, _ := resp["id"].(string)
	if custID == "" {
		return "", fmt.Errorf("stripe customer id missing")
	}
	return custID, nil
}

// PortalSession creates a Stripe Customer Portal session and returns the
// short-lived URL the admin can hand to the customer. Docs:
// https://stripe.com/docs/api/customer_portal/sessions/create
func (s *Stripe) PortalSession(ctx context.Context, customerID, returnURL string) (string, error) {
	if customerID == "" {
		return "", fmt.Errorf("customer id required")
	}
	form := url.Values{}
	form.Set("customer", customerID)
	if returnURL != "" {
		form.Set("return_url", returnURL)
	}
	resp, err := s.post(ctx, "/billing_portal/sessions", form, "")
	if err != nil {
		return "", err
	}
	urlStr, _ := resp["url"].(string)
	if urlStr == "" {
		return "", fmt.Errorf("stripe portal session URL missing")
	}
	return urlStr, nil
}

// Refund issues a refund against a PaymentIntent.
func (s *Stripe) Refund(ctx context.Context, paymentID string, amountTRY float64) error {
	form := url.Values{}
	form.Set("payment_intent", paymentID)
	if amountTRY > 0 {
		form.Set("amount", fmt.Sprintf("%d", int64(amountTRY*100)))
	}
	_, err := s.post(ctx, "/refunds", form, "refund:"+paymentID)
	return err
}

// VerifyWebhook validates Stripe's "stripe-signature" header.
// Format: t=1492774577,v1=<hex sig> — HMAC-SHA256 of `t.body` with webhook secret.
func (s *Stripe) VerifyWebhook(sigHeader string, body []byte) bool {
	if s.WebhookSecret == "" {
		return false
	}
	parts := strings.Split(sigHeader, ",")
	var timestamp, v1 string
	for _, p := range parts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestamp = kv[1]
		case "v1":
			v1 = kv[1]
		}
	}
	if timestamp == "" || v1 == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(s.WebhookSecret))
	mac.Write([]byte(timestamp + "." + string(body)))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(v1))
}
