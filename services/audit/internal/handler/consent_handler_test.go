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
	"github.com/upcore/audit/internal/handler"
	"github.com/upcore/audit/internal/middleware"
	"github.com/upcore/audit/internal/repository"
	"github.com/upcore/audit/internal/service"
)

// --- In-memory fake repo ---------------------------------------------------

type memConsentRepo struct {
	rows    map[string]*domain.DataConsent
	history map[string][]*domain.ConsentHistoryEntry
}

func newMemConsentRepo() *memConsentRepo {
	return &memConsentRepo{
		rows:    map[string]*domain.DataConsent{},
		history: map[string][]*domain.ConsentHistoryEntry{},
	}
}
func (m *memConsentRepo) key(t, u uuid.UUID, ct domain.ConsentType, v int) string {
	return t.String() + "|" + u.String() + "|" + string(ct) + "|" + itoaSimple(v)
}
func (m *memConsentRepo) hkey(t, u uuid.UUID, ct domain.ConsentType) string {
	return t.String() + "|" + u.String() + "|" + string(ct)
}
func (m *memConsentRepo) ListByUser(_ context.Context, tenantID, userID uuid.UUID) ([]*domain.DataConsent, error) {
	out := []*domain.DataConsent{}
	byType := map[domain.ConsentType]*domain.DataConsent{}
	for _, r := range m.rows {
		if r.TenantID != tenantID || r.UserID != userID {
			continue
		}
		if cur, ok := byType[r.ConsentType]; !ok || cur.Version < r.Version {
			byType[r.ConsentType] = r
		}
	}
	for _, v := range byType {
		out = append(out, v)
	}
	return out, nil
}
func (m *memConsentRepo) GetLatest(_ context.Context, tenantID, userID uuid.UUID, ct domain.ConsentType) (*domain.DataConsent, error) {
	var best *domain.DataConsent
	for _, r := range m.rows {
		if r.TenantID != tenantID || r.UserID != userID || r.ConsentType != ct {
			continue
		}
		if best == nil || r.Version > best.Version {
			best = r
		}
	}
	if best == nil {
		return nil, domain.ErrNotFound
	}
	cp := *best
	return &cp, nil
}
func (m *memConsentRepo) Upsert(_ context.Context, c *domain.DataConsent) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	c.UpdatedAt = time.Now().UTC()
	k := m.key(c.TenantID, c.UserID, c.ConsentType, c.Version)
	var prev *domain.ConsentStatus
	if cur, ok := m.rows[k]; ok {
		p := cur.Status
		prev = &p
	}
	cp := *c
	m.rows[k] = &cp
	hk := m.hkey(c.TenantID, c.UserID, c.ConsentType)
	m.history[hk] = append(m.history[hk], &domain.ConsentHistoryEntry{
		ID: uuid.New(), TenantID: c.TenantID, ConsentID: c.ID, UserID: c.UserID,
		ConsentType: c.ConsentType, Version: c.Version,
		PreviousStatus: prev, NewStatus: c.Status, ChangeReason: "user_action",
		IPAddr: c.IPAddr, UserAgent: c.UserAgent, Metadata: c.Metadata,
		ChangedAt: time.Now().UTC(),
	})
	return nil
}
func (m *memConsentRepo) ListHistory(_ context.Context, tenantID, userID uuid.UUID, ct domain.ConsentType) ([]*domain.ConsentHistoryEntry, error) {
	hk := m.hkey(tenantID, userID, ct)
	src := m.history[hk]
	out := make([]*domain.ConsentHistoryEntry, len(src))
	for i, e := range src {
		out[len(src)-1-i] = e
	}
	return out, nil
}

var _ repository.ConsentRepository = (*memConsentRepo)(nil)

func itoaSimple(i int) string {
	if i == 0 {
		return "0"
	}
	buf := []byte{}
	for i > 0 {
		buf = append([]byte{byte('0' + i%10)}, buf...)
		i /= 10
	}
	return string(buf)
}

// --- Helpers ---------------------------------------------------------------

func setupConsentHandler() (*handler.ConsentHandler, *memConsentRepo) {
	repo := newMemConsentRepo()
	svc := service.NewConsentService(repo, zerolog.Nop())
	h := handler.NewConsentHandler(svc)
	return h, repo
}

func withTenantUser(r *http.Request, tid, uid uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tid)
	ctx = context.WithValue(ctx, middleware.CtxUserID, uid)
	ctx = context.WithValue(ctx, middleware.CtxRole, "employee")
	return r.WithContext(ctx)
}

// --- Tests -----------------------------------------------------------------

func TestConsentHandler_List_EmptyCatalog(t *testing.T) {
	h, _ := setupConsentHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents", nil)
	req = withTenantUser(req, uuid.New(), uuid.New())
	rr := httptest.NewRecorder()
	h.List(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var out service.ConsentsOverview
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.Len(t, out.Catalog, 5)
	assert.Equal(t, domain.ConsentVersion, out.Version)
	assert.Len(t, out.Consents, 0)
}

func TestConsentHandler_List_MissingTenant(t *testing.T) {
	h, _ := setupConsentHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents", nil)
	rr := httptest.NewRecorder()
	h.List(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestConsentHandler_List_MissingUser(t *testing.T) {
	h, _ := setupConsentHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents", nil)
	ctx := context.WithValue(req.Context(), middleware.CtxTenantID, uuid.New())
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.List(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestConsentHandler_Upsert_RecordsIPAndUserAgent(t *testing.T) {
	h, repo := setupConsentHandler()
	tid, uid := uuid.New(), uuid.New()

	body := map[string]any{
		"consent_type": "ai_recommendations",
		"status":       "granted",
	}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 test")
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
	req = withTenantUser(req, tid, uid)

	rr := httptest.NewRecorder()
	h.Upsert(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)

	var resp domain.DataConsent
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "granted", string(resp.Status))
	require.NotNil(t, resp.IPAddr)
	assert.Equal(t, "203.0.113.7", *resp.IPAddr, "X-Forwarded-For first hop")
	require.NotNil(t, resp.UserAgent)
	assert.Equal(t, "Mozilla/5.0 test", *resp.UserAgent)

	// Confirm a row exists in the fake repo.
	rows, _ := repo.ListByUser(context.Background(), tid, uid)
	require.Len(t, rows, 1)
}

func TestConsentHandler_Upsert_RejectsUnknownType(t *testing.T) {
	h, _ := setupConsentHandler()
	body := map[string]any{"consent_type": "marketing", "status": "granted"}
	raw, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req = withTenantUser(req, uuid.New(), uuid.New())

	rr := httptest.NewRecorder()
	h.Upsert(rr, req)
	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestConsentHandler_Upsert_RejectsRequiredDecline(t *testing.T) {
	h, _ := setupConsentHandler()
	body := map[string]any{"consent_type": "data_processing", "status": "declined"}
	raw, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req = withTenantUser(req, uuid.New(), uuid.New())

	rr := httptest.NewRecorder()
	h.Upsert(rr, req)
	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestConsentHandler_Upsert_BadJSON(t *testing.T) {
	h, _ := setupConsentHandler()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader([]byte("{bad")))
	req.Header.Set("Content-Type", "application/json")
	req = withTenantUser(req, uuid.New(), uuid.New())
	rr := httptest.NewRecorder()
	h.Upsert(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestConsentHandler_GetHistory_Roundtrip(t *testing.T) {
	h, _ := setupConsentHandler()
	tid, uid := uuid.New(), uuid.New()

	// Seed: two toggles via POST.
	for _, st := range []string{"granted", "declined"} {
		body := map[string]any{"consent_type": "analytics", "status": st}
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		req = withTenantUser(req, tid, uid)
		rr := httptest.NewRecorder()
		h.Upsert(rr, req)
		require.Equal(t, http.StatusOK, rr.Code)
	}

	// Now query history via chi router.
	r := chi.NewRouter()
	r.Get("/api/v1/kvkk/consents/history/{consentType}", h.GetHistory)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents/history/analytics", nil)
	req = withTenantUser(req, tid, uid)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var resp struct {
		ConsentType domain.ConsentType            `json:"consent_type"`
		Entries     []*domain.ConsentHistoryEntry `json:"entries"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, domain.ConsentAnalytics, resp.ConsentType)
	assert.Len(t, resp.Entries, 2)
}

func TestConsentHandler_GetHistory_InvalidType(t *testing.T) {
	h, _ := setupConsentHandler()
	r := chi.NewRouter()
	r.Get("/api/v1/kvkk/consents/history/{consentType}", h.GetHistory)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents/history/marketing", nil)
	req = withTenantUser(req, uuid.New(), uuid.New())
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestConsentHandler_AIAllowed_DefaultDeny(t *testing.T) {
	h, _ := setupConsentHandler()
	tid, uid := uuid.New(), uuid.New()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents/ai-allowed", nil)
	req = withTenantUser(req, tid, uid)
	rr := httptest.NewRecorder()
	h.GetAIAllowed(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var out struct {
		AIAllowed bool `json:"ai_allowed"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.False(t, out.AIAllowed, "no record → default deny")
}

func TestConsentHandler_AIAllowed_AfterGrant(t *testing.T) {
	h, _ := setupConsentHandler()
	tid, uid := uuid.New(), uuid.New()

	// Grant ai_recommendations via POST.
	body := map[string]any{"consent_type": "ai_recommendations", "status": "granted"}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/kvkk/consents", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req = withTenantUser(req, tid, uid)
	rr := httptest.NewRecorder()
	h.Upsert(rr, req)
	require.Equal(t, http.StatusOK, rr.Code)

	// Check via ai-allowed endpoint.
	req = httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents/ai-allowed", nil)
	req = withTenantUser(req, tid, uid)
	rr = httptest.NewRecorder()
	h.GetAIAllowed(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var out struct {
		AIAllowed bool `json:"ai_allowed"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &out))
	assert.True(t, out.AIAllowed)
}

func TestConsentHandler_AIAllowed_InvalidUserID(t *testing.T) {
	h, _ := setupConsentHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/kvkk/consents/ai-allowed?user_id=not-a-uuid", nil)
	req = withTenantUser(req, uuid.New(), uuid.New())
	rr := httptest.NewRecorder()
	h.GetAIAllowed(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}
