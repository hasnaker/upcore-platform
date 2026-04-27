// Package provider implements PaymentProvider adapters.
// Iyzico (TR) REST API direct calls — no SDK dependency.
// API docs: https://dev.iyzipay.com
package provider

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Iyzico adapter implements PaymentProvider via direct Iyzico REST API.
type Iyzico struct {
	APIKey    string
	SecretKey string
	BaseURL   string
	client    *http.Client
}

// NewIyzico reads env: IYZICO_API_KEY, IYZICO_SECRET, IYZICO_BASE_URL.
// Production: https://api.iyzipay.com · Sandbox: https://sandbox-api.iyzipay.com
func NewIyzico() *Iyzico {
	base := os.Getenv("IYZICO_BASE_URL")
	if base == "" {
		base = "https://sandbox-api.iyzipay.com"
	}
	return &Iyzico{
		APIKey:    os.Getenv("IYZICO_API_KEY"),
		SecretKey: os.Getenv("IYZICO_SECRET"),
		BaseURL:   strings.TrimRight(base, "/"),
		client:    &http.Client{Timeout: 30 * time.Second},
	}
}

// Name returns provider code.
func (*Iyzico) Name() string { return "iyzico" }

// authHeader builds Iyzico PKI v1 Authorization header.
// signature = base64(HMAC-SHA256(secret, apiKey + randomString + pkiString))
func (i *Iyzico) authHeader(randomString, pkiString string) string {
	data := i.APIKey + randomString + pkiString
	mac := hmac.New(sha256.New, []byte(i.SecretKey))
	mac.Write([]byte(data))
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("IYZWS %s:%s", i.APIKey, sig)
}

// randomString: 8 hex chars, required by Iyzico PKI.
func randomString() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// buildPKI converts request body to Iyzico's proprietary "pki" string format.
// [key=value,key2=value2] — keys sorted for determinism.
func buildPKI(body map[string]any) string {
	keys := make([]string, 0, len(body))
	for k := range body {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var sb strings.Builder
	sb.WriteString("[")
	for idx, k := range keys {
		if idx > 0 {
			sb.WriteString(",")
		}
		sb.WriteString(k)
		sb.WriteString("=")
		sb.WriteString(fmt.Sprintf("%v", body[k]))
	}
	sb.WriteString("]")
	return sb.String()
}

func (i *Iyzico) post(ctx context.Context, endpoint string, body map[string]any) (map[string]any, error) {
	if i.APIKey == "" || i.SecretKey == "" {
		return nil, fmt.Errorf("iyzico not configured (IYZICO_API_KEY + IYZICO_SECRET required)")
	}
	randStr := randomString()
	body["locale"] = "tr"
	body["conversationId"] = uuid.New().String()
	pki := buildPKI(body)

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, i.BaseURL+endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-iyzi-rnd", randStr)
	req.Header.Set("Authorization", i.authHeader(randStr, pki))

	resp, err := i.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("iyzico http: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("iyzico decode: %w (body=%s)", err, string(raw))
	}
	if status, _ := out["status"].(string); status != "success" {
		errMsg, _ := out["errorMessage"].(string)
		return out, fmt.Errorf("iyzico error: %s (code=%v)", errMsg, out["errorCode"])
	}
	return out, nil
}

// Charge executes a card-on-file recurring payment via /payment/auth.
func (i *Iyzico) Charge(ctx context.Context, customerID string, amountTRY float64, reference string) (string, error) {
	body := map[string]any{
		"price":          fmt.Sprintf("%.2f", amountTRY),
		"paidPrice":      fmt.Sprintf("%.2f", amountTRY),
		"currency":       "TRY",
		"basketId":       reference,
		"paymentChannel": "WEB",
		"paymentGroup":   "SUBSCRIPTION",
		"paymentCard": map[string]any{
			"cardUserKey": customerID,
		},
	}
	resp, err := i.post(ctx, "/payment/auth", body)
	if err != nil {
		return "", err
	}
	paymentID, _ := resp["paymentId"].(string)
	if paymentID == "" {
		return "", fmt.Errorf("iyzico charge returned empty paymentId")
	}
	return paymentID, nil
}

// CreateCustomer stores the cardholder via /cardStorage/card → returns cardUserKey.
func (i *Iyzico) CreateCustomer(ctx context.Context, tenantID uuid.UUID, email, vkn string) (string, error) {
	body := map[string]any{
		"externalId": tenantID.String(),
		"email":      email,
	}
	_ = vkn
	resp, err := i.post(ctx, "/cardStorage/card", body)
	if err != nil {
		return "", err
	}
	cardUserKey, _ := resp["cardUserKey"].(string)
	if cardUserKey == "" {
		return "", fmt.Errorf("iyzico cardUserKey missing")
	}
	return cardUserKey, nil
}

// Refund issues a refund via /payment/refund.
func (i *Iyzico) Refund(ctx context.Context, paymentID string, amountTRY float64) error {
	body := map[string]any{
		"paymentTransactionId": paymentID,
		"price":                fmt.Sprintf("%.2f", amountTRY),
		"currency":             "TRY",
	}
	_, err := i.post(ctx, "/payment/refund", body)
	return err
}

// VerifyWebhook: Iyzico includes "x-iyz-signature" on webhooks.
func (i *Iyzico) VerifyWebhook(signatureHeader string, body []byte) bool {
	mac := hmac.New(sha256.New, []byte(i.SecretKey))
	mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signatureHeader))
}
