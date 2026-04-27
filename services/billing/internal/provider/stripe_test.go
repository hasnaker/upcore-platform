package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func newStripeStub(t *testing.T, h http.HandlerFunc) *Stripe {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return &Stripe{
		APIKey:        "sk_test_123",
		WebhookSecret: "whsec_abc",
		BaseURL:       srv.URL,
		client:        srv.Client(),
	}
}

func TestStripe_Charge_ConvertsTRYToKurush(t *testing.T) {
	var got url.Values
	var idempotency string
	var authUser, stripeVer string

	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		got, _ = url.ParseQuery(string(raw))
		idempotency = r.Header.Get("Idempotency-Key")
		stripeVer = r.Header.Get("Stripe-Version")
		u, _, _ := r.BasicAuth()
		authUser = u
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"pi_xyz","status":"succeeded"}`))
	})

	id, err := s.Charge(context.Background(), "cus_abc", 123.45, "inv-9")
	if err != nil {
		t.Fatalf("Charge: %v", err)
	}
	if id != "pi_xyz" {
		t.Fatalf("want pi_xyz, got %s", id)
	}
	if got.Get("amount") != "12345" {
		t.Fatalf("amount must be kuruş integer 12345, got %s", got.Get("amount"))
	}
	if got.Get("currency") != "try" {
		t.Fatalf("currency must be try, got %s", got.Get("currency"))
	}
	if got.Get("confirm") != "true" || got.Get("off_session") != "true" {
		t.Fatalf("confirm/off_session must be true for card-on-file")
	}
	if idempotency != "billing:inv-9" {
		t.Fatalf("idempotency key missing or wrong: %s", idempotency)
	}
	if authUser != "sk_test_123" {
		t.Fatalf("basic auth user must be API key, got %s", authUser)
	}
	if stripeVer == "" {
		t.Fatalf("Stripe-Version header missing")
	}
}

func TestStripe_Charge_UpstreamError(t *testing.T) {
	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusPaymentRequired)
		_, _ = w.Write([]byte(`{"error":{"message":"Your card was declined.","code":"card_declined"}}`))
	})
	_, err := s.Charge(context.Background(), "cus_abc", 10, "ref-1")
	if err == nil || !strings.Contains(err.Error(), "declined") {
		t.Fatalf("want declined error, got %v", err)
	}
}

func TestStripe_CreateCustomer_StoresTenantMetadata(t *testing.T) {
	var form url.Values
	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		_, _ = w.Write([]byte(`{"id":"cus_new"}`))
	})
	tid := uuid.New()
	cid, err := s.CreateCustomer(context.Background(), tid, "ops@acme.com", "1234567890")
	if err != nil {
		t.Fatalf("CreateCustomer: %v", err)
	}
	if cid != "cus_new" {
		t.Fatalf("want cus_new, got %s", cid)
	}
	if form.Get("metadata[tenant_id]") != tid.String() {
		t.Fatalf("tenant_id metadata missing")
	}
	if form.Get("metadata[vkn]") != "1234567890" {
		t.Fatalf("vkn metadata missing")
	}
}

func TestStripe_Refund_PartialAmount(t *testing.T) {
	var form url.Values
	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		_, _ = w.Write([]byte(`{"id":"re_1","status":"succeeded"}`))
	})
	if err := s.Refund(context.Background(), "pi_x", 25.50); err != nil {
		t.Fatalf("Refund: %v", err)
	}
	if form.Get("amount") != "2550" {
		t.Fatalf("refund amount must be 2550 kuruş, got %s", form.Get("amount"))
	}
	if form.Get("payment_intent") != "pi_x" {
		t.Fatalf("payment_intent missing")
	}
}

func TestStripe_Refund_FullRefundSkipsAmount(t *testing.T) {
	var form url.Values
	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		_, _ = w.Write([]byte(`{"id":"re_full"}`))
	})
	if err := s.Refund(context.Background(), "pi_y", 0); err != nil {
		t.Fatalf("Refund: %v", err)
	}
	if form.Has("amount") {
		t.Fatalf("amount must be omitted for full refund")
	}
}

func TestStripe_VerifyWebhook_ValidSignature(t *testing.T) {
	s := &Stripe{WebhookSecret: "whsec_abc"}
	body := []byte(`{"type":"invoice.paid"}`)
	ts := "1700000000"

	mac := hmac.New(sha256.New, []byte("whsec_abc"))
	mac.Write([]byte(ts + "." + string(body)))
	sig := hex.EncodeToString(mac.Sum(nil))

	header := "t=" + ts + ",v1=" + sig
	if !s.VerifyWebhook(header, body) {
		t.Fatalf("valid webhook sig rejected")
	}
}

func TestStripe_VerifyWebhook_Tamper(t *testing.T) {
	s := &Stripe{WebhookSecret: "whsec_abc"}
	body := []byte(`{"type":"invoice.paid"}`)
	ts := "1700000000"
	mac := hmac.New(sha256.New, []byte("whsec_abc"))
	mac.Write([]byte(ts + "." + string(body)))
	sig := hex.EncodeToString(mac.Sum(nil))
	header := "t=" + ts + ",v1=" + sig

	if s.VerifyWebhook(header, []byte(`{"type":"fraud"}`)) {
		t.Fatalf("body tamper must not verify")
	}
	// wrong secret
	s2 := &Stripe{WebhookSecret: "different"}
	if s2.VerifyWebhook(header, body) {
		t.Fatalf("different secret must not verify")
	}
}

func TestStripe_VerifyWebhook_MalformedHeaders(t *testing.T) {
	s := &Stripe{WebhookSecret: "whsec_abc"}
	cases := []string{
		"",
		"t=1",                // no v1
		"v1=abc",             // no timestamp
		"garbage",            // no kv
		"t=,v1=",             // empty values
	}
	for _, h := range cases {
		if s.VerifyWebhook(h, []byte(`{}`)) {
			t.Fatalf("malformed header %q must not verify", h)
		}
	}
}

func TestStripe_VerifyWebhook_NoSecretConfigured(t *testing.T) {
	s := &Stripe{WebhookSecret: ""}
	if s.VerifyWebhook("t=1,v1=aa", []byte(`{}`)) {
		t.Fatalf("must return false when webhook secret empty")
	}
}

func TestStripe_PortalSession_ReturnsURL(t *testing.T) {
	var form url.Values
	s := newStripeStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		if r.URL.Path != "/billing_portal/sessions" {
			t.Errorf("wrong path: %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"id":"bps_1","url":"https://billing.stripe.com/p/session_abc"}`))
	})

	u, err := s.PortalSession(context.Background(), "cus_abc", "https://admin.upcore.io/billing")
	if err != nil {
		t.Fatalf("PortalSession: %v", err)
	}
	if u != "https://billing.stripe.com/p/session_abc" {
		t.Errorf("wrong url: %s", u)
	}
	if form.Get("customer") != "cus_abc" {
		t.Errorf("customer form field missing")
	}
	if form.Get("return_url") != "https://admin.upcore.io/billing" {
		t.Errorf("return_url form field missing")
	}
}

func TestStripe_PortalSession_MissingCustomer(t *testing.T) {
	s := &Stripe{APIKey: "sk_test"}
	if _, err := s.PortalSession(context.Background(), "", "https://x"); err == nil {
		t.Fatalf("want error when customer id missing")
	}
}
