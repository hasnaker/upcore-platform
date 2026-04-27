package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func newIyzicoStub(t *testing.T, h http.HandlerFunc) *Iyzico {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return &Iyzico{
		APIKey:    "test-key",
		SecretKey: "test-secret",
		BaseURL:   srv.URL,
		client:    srv.Client(),
	}
}

func TestBuildPKI_DeterministicSorted(t *testing.T) {
	body := map[string]any{
		"z": 1,
		"a": "hello",
		"m": 3.14,
	}
	got := buildPKI(body)
	want := "[a=hello,m=3.14,z=1]"
	if got != want {
		t.Fatalf("buildPKI: got %q, want %q", got, want)
	}
}

func TestIyzico_AuthHeader_HMACFormat(t *testing.T) {
	i := &Iyzico{APIKey: "k", SecretKey: "s"}
	got := i.authHeader("rand1", "[x=1]")

	expectedData := "k" + "rand1" + "[x=1]"
	mac := hmac.New(sha256.New, []byte("s"))
	mac.Write([]byte(expectedData))
	wantSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	wantHeader := "IYZWS k:" + wantSig
	if got != wantHeader {
		t.Fatalf("authHeader mismatch:\n  got:  %s\n  want: %s", got, wantHeader)
	}
}

func TestIyzico_VerifyWebhook_HMACValidAndInvalid(t *testing.T) {
	i := &Iyzico{SecretKey: "topsecret"}
	body := []byte(`{"event":"payment.success","id":"123"}`)

	mac := hmac.New(sha256.New, []byte("topsecret"))
	mac.Write(body)
	validSig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if !i.VerifyWebhook(validSig, body) {
		t.Fatalf("valid signature should verify")
	}
	if i.VerifyWebhook("wrong-sig", body) {
		t.Fatalf("invalid signature must not verify")
	}
	// tamper body must fail
	if i.VerifyWebhook(validSig, []byte(`{"tampered":true}`)) {
		t.Fatalf("tampered body must not verify")
	}
}

func TestIyzico_Charge_Success(t *testing.T) {
	var capturedAuth, capturedRnd, capturedPath string
	var capturedBody map[string]any

	i := newIyzicoStub(t, func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		capturedAuth = r.Header.Get("Authorization")
		capturedRnd = r.Header.Get("x-iyzi-rnd")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &capturedBody)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"success","paymentId":"pay_abc123"}`))
	})

	id, err := i.Charge(context.Background(), "cu_x", 99.99, "inv-42")
	if err != nil {
		t.Fatalf("Charge failed: %v", err)
	}
	if id != "pay_abc123" {
		t.Fatalf("want paymentId pay_abc123, got %s", id)
	}
	if capturedPath != "/payment/auth" {
		t.Fatalf("want /payment/auth endpoint, got %s", capturedPath)
	}
	if !strings.HasPrefix(capturedAuth, "IYZWS test-key:") {
		t.Fatalf("Authorization header missing: %s", capturedAuth)
	}
	if capturedRnd == "" {
		t.Fatalf("x-iyzi-rnd random string missing")
	}
	if capturedBody["currency"] != "TRY" || capturedBody["price"] != "99.99" {
		t.Fatalf("body missing TRY/99.99: %+v", capturedBody)
	}
	if capturedBody["conversationId"] == "" {
		t.Fatalf("conversationId auto-injection missing")
	}
}

func TestIyzico_Charge_UpstreamError(t *testing.T) {
	i := newIyzicoStub(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"failure","errorCode":"10051","errorMessage":"invalid card"}`))
	})
	_, err := i.Charge(context.Background(), "cu_x", 50, "inv-1")
	if err == nil {
		t.Fatalf("expected error on failure status")
	}
	if !strings.Contains(err.Error(), "invalid card") {
		t.Fatalf("error should include upstream message, got: %v", err)
	}
}

func TestIyzico_Charge_NotConfigured(t *testing.T) {
	i := &Iyzico{} // empty keys
	_, err := i.Charge(context.Background(), "x", 10, "ref")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("want configuration error, got %v", err)
	}
}

func TestIyzico_CreateCustomer_ReturnsCardUserKey(t *testing.T) {
	i := newIyzicoStub(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"success","cardUserKey":"cuk_abc"}`))
	})
	key, err := i.CreateCustomer(context.Background(), uuid.New(), "a@b.com", "1234567890")
	if err != nil {
		t.Fatalf("CreateCustomer: %v", err)
	}
	if key != "cuk_abc" {
		t.Fatalf("want cuk_abc, got %s", key)
	}
}

func TestIyzico_Refund_NoReturnData(t *testing.T) {
	i := newIyzicoStub(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"success"}`))
	})
	if err := i.Refund(context.Background(), "pay_abc", 10.00); err != nil {
		t.Fatalf("Refund: %v", err)
	}
}

func TestRandomString_LengthAndHex(t *testing.T) {
	s := randomString()
	if len(s) != 8 {
		t.Fatalf("randomString length: want 8, got %d", len(s))
	}
	for _, c := range s {
		hexChar := (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')
		if !hexChar {
			t.Fatalf("randomString non-hex char: %q", c)
		}
	}
}
