package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/handler"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/repository"
	"github.com/upcore/audit/internal/service"
)

// --- Fakes ---

type fakeEventRepo struct {
	events []*domain.Event
}

func (f *fakeEventRepo) Insert(_ context.Context, e *domain.Event) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	f.events = append(f.events, e)
	return nil
}

func (f *fakeEventRepo) BulkInsert(_ context.Context, events []*domain.Event) (int, error) {
	f.events = append(f.events, events...)
	return len(events), nil
}

func (f *fakeEventRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Event, error) {
	for _, e := range f.events {
		if e.ID == id && e.TenantID == tenantID {
			return e, nil
		}
	}
	return nil, domain.ErrEventNotFound
}

func (f *fakeEventRepo) Query(_ context.Context, _ domain.QueryFilter, _, limit int) ([]*domain.Event, int, error) {
	if limit > len(f.events) {
		limit = len(f.events)
	}
	return f.events[:limit], len(f.events), nil
}

func (f *fakeEventRepo) CountByAction(_ context.Context, _ uuid.UUID, _, _ time.Time) (map[string]int, error) {
	return map[string]int{"create": 1}, nil
}

func (f *fakeEventRepo) CountByService(_ context.Context, _ uuid.UUID, _, _ time.Time) (map[string]int, error) {
	return map[string]int{"auth": 1}, nil
}

func (f *fakeEventRepo) CountByResult(_ context.Context, _ uuid.UUID, _, _ time.Time) (map[string]int, error) {
	return map[string]int{"success": 1}, nil
}

func (f *fakeEventRepo) GetResourceHistory(_ context.Context, _ uuid.UUID, _ string, _ uuid.UUID) ([]*domain.Event, error) {
	return f.events, nil
}

func (f *fakeEventRepo) GetActorActivity(_ context.Context, _, _ uuid.UUID, _, _ time.Time) ([]*domain.Event, error) {
	return f.events, nil
}

var _ repository.EventRepository = (*fakeEventRepo)(nil)

// --- Helpers ---

func setupEventHandler() (*handler.EventHandler, *fakeEventRepo) {
	repo := &fakeEventRepo{events: make([]*domain.Event, 0)}
	pub := event.NewNopPublisher(zerolog.Nop())
	svc := service.NewEventService(repo, pub, zerolog.Nop())
	h := handler.NewEventHandler(svc)
	return h, repo
}

func withTenant(r *http.Request, tenantID, userID uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tenantID)
	ctx = context.WithValue(ctx, middleware.CtxUserID, userID)
	ctx = context.WithValue(ctx, middleware.CtxRole, "admin")
	return r.WithContext(ctx)
}

// --- Tests ---

func TestEventHandler_Log(t *testing.T) {
	h, repo := setupEventHandler()
	tenantID := uuid.New()
	userID := uuid.New()

	body := map[string]any{
		"event_type":    "user.login",
		"actor_type":    "user",
		"actor_id":      userID.String(),
		"service":       "auth",
		"action":        "login_success",
		"resource_type": "session",
		"resource_id":   uuid.New().String(),
		"result":        "success",
	}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/audit/events", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req = withTenant(req, tenantID, userID)

	rr := httptest.NewRecorder()
	h.Log(rr, req)

	assert.Equal(t, http.StatusAccepted, rr.Code)
	require.Len(t, repo.events, 1)
	assert.Equal(t, tenantID, repo.events[0].TenantID)
}

func TestEventHandler_Query(t *testing.T) {
	h, repo := setupEventHandler()
	tenantID := uuid.New()

	repo.events = append(repo.events, &domain.Event{
		ID:       uuid.New(),
		TenantID: tenantID,
		Service:  "auth",
		Action:   "login",
		Result:   domain.ResultSuccess,
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events?page=1&limit=10", nil)
	req = withTenant(req, tenantID, uuid.New())

	rr := httptest.NewRecorder()
	h.Query(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]any
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, float64(1), resp["total"])
}

func TestEventHandler_GetByID_NotFound(t *testing.T) {
	h, _ := setupEventHandler()

	r := chi.NewRouter()
	r.Get("/api/v1/audit/events/{id}", h.GetByID)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events/"+uuid.New().String(), nil)
	req = withTenant(req, uuid.New(), uuid.New())

	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestEventHandler_GetStats(t *testing.T) {
	h, _ := setupEventHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/audit/events/stats", nil)
	req = withTenant(req, uuid.New(), uuid.New())

	rr := httptest.NewRecorder()
	h.GetStats(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp domain.StatsSummary
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp.ByAction, "create")
}

func TestWriteError_Maps(t *testing.T) {
	tests := []struct {
		err    error
		status int
	}{
		{domain.ErrEventNotFound, http.StatusNotFound},
		{domain.ErrDSRNotFound, http.StatusNotFound},
		{domain.ErrInvalidInput, http.StatusUnprocessableEntity},
		{domain.ErrImmutable, http.StatusConflict},
		{domain.ErrUnauthorized, http.StatusUnauthorized},
		{domain.ErrForbidden, http.StatusForbidden},
		{domain.ErrBackpressure, http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.err.Error(), func(t *testing.T) {
			rr := httptest.NewRecorder()
			handler.WriteError(rr, tt.err)
			assert.Equal(t, tt.status, rr.Code)
		})
	}
}
