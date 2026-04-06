package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/handler"
	"github.com/upcore/notification/internal/middleware"
	"github.com/upcore/notification/internal/service"
)

// --- Helpers ---

func withTenant(r *http.Request, tenantID, userID uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tenantID)
	ctx = context.WithValue(ctx, middleware.CtxUserID, userID)
	ctx = context.WithValue(ctx, middleware.CtxRole, "admin")
	return r.WithContext(ctx)
}

// --- Tests ---

func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	handler.WriteJSON(rr, http.StatusOK, map[string]string{"foo": "bar"})

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Header().Get("Content-Type"), "application/json")

	var resp map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "bar", resp["foo"])
}

func TestWriteError_Maps(t *testing.T) {
	tests := []struct {
		err    error
		status int
	}{
		{domain.ErrNotFound, http.StatusNotFound},
		{domain.ErrTemplateNotFound, http.StatusNotFound},
		{domain.ErrNotificationNotFound, http.StatusNotFound},
		{domain.ErrValidation, http.StatusUnprocessableEntity},
		{domain.ErrEmailSuppressed, http.StatusUnprocessableEntity},
		{domain.ErrOptedOut, http.StatusUnprocessableEntity},
		{domain.ErrRateLimitExceeded, http.StatusTooManyRequests},
		{domain.ErrChannelUnavailable, http.StatusBadGateway},
		{domain.ErrProviderError, http.StatusBadGateway},
		{domain.ErrUnauthorized, http.StatusUnauthorized},
		{domain.ErrForbidden, http.StatusForbidden},
		{domain.ErrWebhookSignature, http.StatusUnauthorized},
	}
	for _, tt := range tests {
		t.Run(tt.err.Error(), func(t *testing.T) {
			rr := httptest.NewRecorder()
			handler.WriteError(rr, tt.err)
			assert.Equal(t, tt.status, rr.Code)
		})
	}
}

func TestParseUUID_Valid(t *testing.T) {
	rr := httptest.NewRecorder()
	id := uuid.New()
	parsed, ok := handler.ParseUUID(rr, id.String())
	assert.True(t, ok)
	assert.Equal(t, id, parsed)
}

func TestParseUUID_Invalid(t *testing.T) {
	rr := httptest.NewRecorder()
	_, ok := handler.ParseUUID(rr, "not-a-uuid")
	assert.False(t, ok)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDecodeJSON(t *testing.T) {
	body := map[string]string{"key": "value"}
	raw, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")

	var decoded map[string]string
	err := handler.DecodeJSON(req, &decoded)
	require.NoError(t, err)
	assert.Equal(t, "value", decoded["key"])
}

func TestInAppHandler_UnreadCount(t *testing.T) {
	// This test validates the handler can be constructed and route invoked.
	// Full integration tests require a database.
	inappSvc := service.NewInAppService(&fakeInAppRepo{}, zerolog.Nop())
	h := handler.NewInAppHandler(inappSvc)

	r := chi.NewRouter()
	r.Get("/api/v1/notifications/inapp/unread-count", h.UnreadCount)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/inapp/unread-count", nil)
	req = withTenant(req, uuid.New(), uuid.New())

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, float64(0), resp["count"])
}

// --- Fakes ---

type fakeInAppRepo struct{}

func (f *fakeInAppRepo) Create(_ context.Context, _ *domain.InAppNotification) error { return nil }
func (f *fakeInAppRepo) ListByUser(_ context.Context, _, _ uuid.UUID, _ bool, _, _ int) ([]*domain.InAppNotification, int, error) {
	return nil, 0, nil
}
func (f *fakeInAppRepo) ListUnread(_ context.Context, _, _ uuid.UUID) ([]*domain.InAppNotification, error) {
	return nil, nil
}
func (f *fakeInAppRepo) MarkRead(_ context.Context, _, _, _ uuid.UUID) error    { return nil }
func (f *fakeInAppRepo) MarkAllRead(_ context.Context, _, _ uuid.UUID) error    { return nil }
func (f *fakeInAppRepo) CountUnread(_ context.Context, _, _ uuid.UUID) (int, error) { return 0, nil }
func (f *fakeInAppRepo) Delete(_ context.Context, _, _, _ uuid.UUID) error      { return nil }

