package handler

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/auth/internal/clerk"
	"github.com/upcore/auth/internal/domain"
	"github.com/upcore/auth/internal/rbac"
)

// --- webhook handler integration ---

func TestWebhookHandler_ValidSignature(t *testing.T) {
	secretBytes := []byte("super-secret-key-32-chars-12345678")
	encoded := "whsec_" + base64.StdEncoding.EncodeToString(secretBytes)
	verifier, err := clerk.NewSvixVerifier(encoded)
	require.NoError(t, err)

	sink := &fakeSink{}
	disp := clerk.NewDispatcher(sink)
	h := NewWebhookHandler(verifier, disp)

	body := []byte(`{"type":"user.created","object":"event","data":{"id":"usr_1","email_addresses":[{"id":"e1","email_address":"a@b.com"}],"primary_email_address_id":"e1","public_metadata":{"tenant_id":"11111111-1111-1111-1111-111111111111"}},"timestamp":1700000000}`)
	id := "msg_abc"
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	sig := signSvix(id, ts, body, secretBytes)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/clerk", bytes.NewReader(body))
	req.Header.Set("Svix-Id", id)
	req.Header.Set("Svix-Timestamp", ts)
	req.Header.Set("Svix-Signature", sig)

	rr := httptest.NewRecorder()
	h.Handle(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code, "body=%s", rr.Body.String())
	assert.Equal(t, 1, sink.upsertCount)
}

func TestWebhookHandler_InvalidSignature(t *testing.T) {
	secretBytes := []byte("super-secret-key-32-chars-12345678")
	encoded := "whsec_" + base64.StdEncoding.EncodeToString(secretBytes)
	verifier, err := clerk.NewSvixVerifier(encoded)
	require.NoError(t, err)

	sink := &fakeSink{}
	disp := clerk.NewDispatcher(sink)
	h := NewWebhookHandler(verifier, disp)

	body := []byte(`{"type":"user.created"}`)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/clerk", bytes.NewReader(body))
	req.Header.Set("Svix-Id", "msg_abc")
	req.Header.Set("Svix-Timestamp", strconv.FormatInt(time.Now().Unix(), 10))
	req.Header.Set("Svix-Signature", "v1,wrong")

	rr := httptest.NewRecorder()
	h.Handle(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestWebhookHandler_StaleTimestamp(t *testing.T) {
	secretBytes := []byte("super-secret-key-32-chars-12345678")
	encoded := "whsec_" + base64.StdEncoding.EncodeToString(secretBytes)
	verifier, err := clerk.NewSvixVerifier(encoded)
	require.NoError(t, err)

	sink := &fakeSink{}
	disp := clerk.NewDispatcher(sink)
	h := NewWebhookHandler(verifier, disp)

	body := []byte(`{"type":"user.created"}`)
	oldTs := strconv.FormatInt(time.Now().Add(-1*time.Hour).Unix(), 10)
	sig := signSvix("m1", oldTs, body, secretBytes)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/clerk", bytes.NewReader(body))
	req.Header.Set("Svix-Id", "m1")
	req.Header.Set("Svix-Timestamp", oldTs)
	req.Header.Set("Svix-Signature", sig)

	rr := httptest.NewRecorder()
	h.Handle(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// --- health handlers ---

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	handleHealth(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &payload))
	assert.Equal(t, "ok", payload["status"])
}

// --- check handler with mocked auth ---

func TestCheckHandler_Allow(t *testing.T) {
	policy := rbac.NewPolicy()
	h := MakeCheckPermission(policy)

	req := httptest.NewRequest(http.MethodGet, "/check?action=view:self&resource=self", nil)
	ctx := withFakeUser(req.Context(), "employee")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &payload))
	assert.Equal(t, true, payload["allowed"])
}

func TestCheckHandler_Deny(t *testing.T) {
	policy := rbac.NewPolicy()
	h := MakeCheckPermission(policy)

	req := httptest.NewRequest(http.MethodGet, "/check?action=manage:employees&resource=tenant", nil)
	ctx := withFakeUser(req.Context(), "employee")
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	h(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &payload))
	assert.Equal(t, false, payload["allowed"])
}

func TestCheckHandler_MissingParams(t *testing.T) {
	policy := rbac.NewPolicy()
	h := MakeCheckPermission(policy)
	req := httptest.NewRequest(http.MethodGet, "/check", nil)
	req = req.WithContext(withFakeUser(req.Context(), "employee"))
	rr := httptest.NewRecorder()
	h(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCheckHandler_NoAuthContext(t *testing.T) {
	policy := rbac.NewPolicy()
	h := MakeCheckPermission(policy)
	req := httptest.NewRequest(http.MethodGet, "/check?action=x&resource=y", nil)
	rr := httptest.NewRecorder()
	h(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

// --- helpers ---

func signSvix(id, ts string, body, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(fmt.Sprintf("%s.%s.%s", id, ts, string(body))))
	return "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

type fakeSink struct {
	upsertCount int
	deleteCount int
	revokeCount int
}

func (f *fakeSink) UpsertFromClerk(_ context.Context, clerkID string, tenantID uuid.UUID, email, firstName, lastName, locale string, _ json.RawMessage) (*domain.User, error) {
	f.upsertCount++
	return &domain.User{
		ID:        uuid.New(),
		ClerkID:   clerkID,
		TenantID:  tenantID,
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Locale:    locale,
		Status:    domain.UserStatusActive,
	}, nil
}
func (f *fakeSink) DeleteByClerkID(_ context.Context, _ string) error {
	f.deleteCount++
	return nil
}
func (f *fakeSink) HandleSessionRevoked(_ context.Context, _, _ string) error {
	f.revokeCount++
	return nil
}

func withFakeUser(ctx context.Context, role string) context.Context {
	uc := &domain.UserContext{
		UserID:   uuid.New(),
		TenantID: uuid.New(),
		Email:    "user@example.com",
		Role:     role,
		Roles:    []string{role},
	}
	ctx = domain.WithUser(ctx, uc)
	ctx = domain.WithTenant(ctx, uc.TenantID)
	return ctx
}
