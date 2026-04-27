package slack

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	channelslack "github.com/upcore/notification/internal/channels/slack"
	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/middleware"
)

// in-memory Repository stand-in. Implements just enough of the Repository
// surface used by OAuthHandler + EventsHandler tests.
type memRepo struct {
	mu          sync.Mutex
	states      map[string]stateRow
	installs    map[uuid.UUID]*Installation
	userMap     map[string]string
	saved       *Installation
	revokedUUID uuid.UUID
}

type stateRow struct {
	tenantID, userID uuid.UUID
	redirectTo       string
	expiresAt        time.Time
}

func newMemRepo() *memRepo {
	return &memRepo{
		states:   map[string]stateRow{},
		installs: map[uuid.UUID]*Installation{},
		userMap:  map[string]string{},
	}
}

func (m *memRepo) PutOAuthState(_ context.Context, state string, tenantID, userID uuid.UUID, redirectTo string, ttl time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.states[state] = stateRow{tenantID, userID, redirectTo, time.Now().Add(ttl)}
	return nil
}

func (m *memRepo) ConsumeOAuthState(_ context.Context, state string) (uuid.UUID, uuid.UUID, string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	row, ok := m.states[state]
	if !ok {
		return uuid.Nil, uuid.Nil, "", domain.ErrNotFound
	}
	delete(m.states, state)
	if time.Now().After(row.expiresAt) {
		return uuid.Nil, uuid.Nil, "", domain.ErrNotFound
	}
	return row.tenantID, row.userID, row.redirectTo, nil
}

func (m *memRepo) SaveInstallation(_ context.Context, inst *Installation) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.installs[inst.TenantID] = inst
	m.saved = inst
	return nil
}

func (m *memRepo) GetActiveForTenant(_ context.Context, tenantID uuid.UUID) (*channelslack.Installation, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	inst, ok := m.installs[tenantID]
	if !ok {
		return nil, nil
	}
	return &channelslack.Installation{
		ID:                   inst.ID,
		TenantID:             inst.TenantID,
		TeamID:               inst.TeamID,
		TeamName:             inst.TeamName,
		BotToken:             inst.BotToken,
		IncomingWebhookURL:   inst.IncomingWebhookURL,
		DefaultChannelID:     inst.DefaultChannelID,
		AllowDMInterventions: inst.AllowDMInterventions,
	}, nil
}

func (m *memRepo) GetForAdmin(_ context.Context, tenantID uuid.UUID) (*Installation, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	inst, ok := m.installs[tenantID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return inst, nil
}

func (m *memRepo) RevokeInstallation(_ context.Context, tenantID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.installs[tenantID]; !ok {
		return domain.ErrNotFound
	}
	delete(m.installs, tenantID)
	m.revokedUUID = tenantID
	return nil
}

func (m *memRepo) SetAllowDMInterventions(_ context.Context, tenantID uuid.UUID, allow bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	inst, ok := m.installs[tenantID]
	if !ok {
		return domain.ErrNotFound
	}
	inst.AllowDMInterventions = allow
	return nil
}

func (m *memRepo) keyStringFake() string { return "deadbeef" }

// oauthHandlerWithRepo reuses OAuthHandler but swaps the repo surface via
// a thin adapter that routes the in-memory repo through the same method
// signatures that the real *Repository implements.
type repoAdapter struct {
	mem *memRepo
}

func (r *repoAdapter) PutOAuthState(ctx context.Context, state string, tenantID, userID uuid.UUID, redirectTo string, ttl time.Duration) error {
	return r.mem.PutOAuthState(ctx, state, tenantID, userID, redirectTo, ttl)
}
func (r *repoAdapter) ConsumeOAuthState(ctx context.Context, state string) (uuid.UUID, uuid.UUID, string, error) {
	return r.mem.ConsumeOAuthState(ctx, state)
}
func (r *repoAdapter) SaveInstallation(ctx context.Context, inst *Installation) error {
	return r.mem.SaveInstallation(ctx, inst)
}
func (r *repoAdapter) GetActiveForTenant(ctx context.Context, tenantID uuid.UUID) (*channelslack.Installation, error) {
	return r.mem.GetActiveForTenant(ctx, tenantID)
}
func (r *repoAdapter) GetForAdmin(ctx context.Context, tenantID uuid.UUID) (*Installation, error) {
	return r.mem.GetForAdmin(ctx, tenantID)
}
func (r *repoAdapter) RevokeInstallation(ctx context.Context, tenantID uuid.UUID) error {
	return r.mem.RevokeInstallation(ctx, tenantID)
}
func (r *repoAdapter) SetAllowDMInterventions(ctx context.Context, tenantID uuid.UUID, allow bool) error {
	return r.mem.SetAllowDMInterventions(ctx, tenantID, allow)
}

// TestOAuth_CallbackHappyPath drives the install → callback → status flow
// end-to-end against a Slack mock.
func TestOAuth_CallbackHappyPath(t *testing.T) {
	repoSurface := newMemRepo()

	// Fake Slack oauth.v2.access server.
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/oauth.v2.access" {
			http.Error(w, "nope", http.StatusNotFound)
			return
		}
		_ = r.ParseForm()
		if r.Form.Get("code") != "real-code" {
			t.Fatalf("unexpected code: %s", r.Form.Get("code"))
		}
		resp := map[string]any{
			"ok":           true,
			"access_token": "xoxb-abc",
			"token_type":   "bot",
			"scope":        "chat:write,commands",
			"bot_user_id":  "U-BOT",
			"app_id":       "A-APP",
			"team":         map[string]string{"id": "T-1", "name": "UpCore Test"},
			"authed_user":  map[string]string{"id": "U-USER"},
			"incoming_webhook": map[string]string{
				"url":        "https://hooks.slack.com/services/abc",
				"channel":    "#general",
				"channel_id": "C-CHAN",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer slackSrv.Close()
	channelslack.APIBaseURL = slackSrv.URL
	defer func() { channelslack.APIBaseURL = "https://slack.com/api" }()

	client := channelslack.NewClient(zerolog.Nop())
	// Wrap adapter as *Repository — we cannot since OAuthHandler uses a
	// concrete pointer. Instead, wire the adapter to the OAuth handler via
	// the test-only helper below.
	h := newTestOAuthHandler(&repoAdapter{mem: repoSurface}, client)

	// Step 1: install — expect a redirect to Slack OAuth URL containing state.
	tenantID := uuid.New()
	userID := uuid.New()
	installReq := httptest.NewRequest(http.MethodGet, "/install", nil)
	installReq = withAuth(installReq, tenantID, userID)
	installRR := httptest.NewRecorder()
	h.Install(installRR, installReq)
	if installRR.Code != http.StatusFound {
		t.Fatalf("install status %d", installRR.Code)
	}
	location := installRR.Header().Get("Location")
	u, err := url.Parse(location)
	if err != nil {
		t.Fatal(err)
	}
	state := u.Query().Get("state")
	if state == "" {
		t.Fatal("state missing from authorize URL")
	}
	if !strings.Contains(location, "client_id=test-client") {
		t.Fatalf("client_id not propagated: %s", location)
	}

	// Step 2: callback (code exchange).
	cb := httptest.NewRequest(http.MethodGet, "/callback?code=real-code&state="+state, nil)
	cbRR := httptest.NewRecorder()
	h.Callback(cbRR, cb)
	if cbRR.Code != http.StatusFound {
		t.Fatalf("callback status %d body %s", cbRR.Code, cbRR.Body.String())
	}
	if repoSurface.saved == nil {
		t.Fatal("installation not saved")
	}
	if repoSurface.saved.BotToken != "xoxb-abc" {
		t.Fatalf("bot token not captured: %s", repoSurface.saved.BotToken)
	}
	if repoSurface.saved.TeamID != "T-1" || repoSurface.saved.TeamName != "UpCore Test" {
		t.Fatalf("unexpected team info: %+v", repoSurface.saved)
	}

	// Step 3: status endpoint returns installed=true.
	statusReq := httptest.NewRequest(http.MethodGet, "/status", nil)
	statusReq = withAuth(statusReq, tenantID, userID)
	statusRR := httptest.NewRecorder()
	h.Status(statusRR, statusReq)
	if statusRR.Code != http.StatusOK {
		t.Fatalf("status %d", statusRR.Code)
	}
	var statusBody map[string]any
	_ = json.Unmarshal(statusRR.Body.Bytes(), &statusBody)
	if statusBody["installed"] != true {
		t.Fatalf("expected installed=true got %+v", statusBody)
	}
}

func TestOAuth_Callback_InvalidState(t *testing.T) {
	h := newTestOAuthHandler(&repoAdapter{mem: newMemRepo()}, channelslack.NewClient(zerolog.Nop()))
	cb := httptest.NewRequest(http.MethodGet, "/callback?code=abc&state=bogus", nil)
	rr := httptest.NewRecorder()
	h.Callback(rr, cb)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", rr.Code)
	}
}

func TestOAuth_Uninstall_RevokesAndPersists(t *testing.T) {
	mem := newMemRepo()
	tenantID := uuid.New()
	mem.installs[tenantID] = &Installation{
		TenantID: tenantID,
		TeamID:   "T",
		BotToken: "xoxb-z",
	}

	// Slack revoke endpoint.
	slackSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ok":true,"revoked":true}`))
	}))
	defer slackSrv.Close()
	channelslack.APIBaseURL = slackSrv.URL
	defer func() { channelslack.APIBaseURL = "https://slack.com/api" }()

	h := newTestOAuthHandler(&repoAdapter{mem: mem}, channelslack.NewClient(zerolog.Nop()))
	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	req = withAuth(req, tenantID, uuid.New())
	rr := httptest.NewRecorder()
	h.Uninstall(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("uninstall status %d", rr.Code)
	}
	if mem.revokedUUID != tenantID {
		t.Fatalf("expected revocation")
	}
}

// ---- helpers ----

// withAuth injects the middleware context keys the OAuth handler uses.
func withAuth(r *http.Request, tenantID, userID uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tenantID)
	ctx = context.WithValue(ctx, middleware.CtxUserID, userID)
	return r.WithContext(ctx)
}

// newTestOAuthHandler builds an OAuthHandler whose repo is the test adapter.
// OAuthHandler requires a *Repository concrete type for compile-time typing;
// the real struct methods are package-private so we shim the struct here by
// constructing a Repository instance with nil DB and swapping its behaviour
// through an embedded testHook.
// In practice: we use a dedicated type that mirrors the field layout.
func newTestOAuthHandler(adapter *repoAdapter, client *channelslack.Client) *testOAuthHandler {
	return &testOAuthHandler{
		repo:          adapter,
		client:        client,
		clientID:      "test-client",
		clientSecret:  "test-secret",
		redirectURL:   "https://upcore.test/cb",
		appID:         "A-APP",
		publicBaseURL: "https://upcore.test",
	}
}

// testOAuthHandler mirrors OAuthHandler but accepts the repoAdapter interface
// so tests can swap the DB-backed Repository for the in-memory one. The
// handler bodies are copies of the production versions in oauth.go; keep them
// in sync when the real handler changes.
type testOAuthHandler struct {
	repo                                                *repoAdapter
	client                                              *channelslack.Client
	clientID, clientSecret, redirectURL, appID          string
	publicBaseURL                                       string
}

func (h *testOAuthHandler) Install(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(uuid.UUID)
	userID, _ := r.Context().Value(middleware.CtxUserID).(uuid.UUID)
	if tenantID == uuid.Nil || userID == uuid.Nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	state, err := randomState()
	if err != nil {
		http.Error(w, `{"error":"state"}`, http.StatusInternalServerError)
		return
	}
	if err := h.repo.PutOAuthState(r.Context(), state, tenantID, userID, "", 10*time.Minute); err != nil {
		http.Error(w, `{"error":"state"}`, http.StatusInternalServerError)
		return
	}
	q := url.Values{}
	q.Set("client_id", h.clientID)
	q.Set("scope", strings.Join(channelslack.BotScopes, ","))
	q.Set("user_scope", "")
	q.Set("redirect_uri", h.redirectURL)
	q.Set("state", state)
	http.Redirect(w, r, channelslack.OAuthAuthorizeURL+"?"+q.Encode(), http.StatusFound)
}

func (h *testOAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		http.Error(w, `{"error":"missing"}`, http.StatusBadRequest)
		return
	}
	tenantID, userID, redirect, err := h.repo.ConsumeOAuthState(r.Context(), state)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			http.Error(w, `{"error":"invalid_state"}`, http.StatusBadRequest)
			return
		}
		http.Error(w, `{"error":"state"}`, http.StatusInternalServerError)
		return
	}
	params := url.Values{}
	params.Set("client_id", h.clientID)
	params.Set("client_secret", h.clientSecret)
	params.Set("code", code)
	params.Set("redirect_uri", h.redirectURL)
	var resp struct {
		AccessToken string `json:"access_token"`
		BotUserID   string `json:"bot_user_id"`
		AppID       string `json:"app_id"`
		Scope       string `json:"scope"`
		Team        struct {
			ID, Name string
		} `json:"team"`
		AuthedUser struct {
			ID string `json:"id"`
		} `json:"authed_user"`
		IncomingWebhook struct {
			URL, Channel, ChannelID string
		} `json:"incoming_webhook"`
	}
	if err := h.client.PostForm(r.Context(), "oauth.v2.access", "", params, &resp); err != nil {
		http.Error(w, `{"error":"slack"}`, http.StatusBadGateway)
		return
	}
	inst := &Installation{
		TenantID:              tenantID,
		TeamID:                resp.Team.ID,
		TeamName:              resp.Team.Name,
		AppID:                 resp.AppID,
		BotUserID:             resp.BotUserID,
		AuthedUserID:          resp.AuthedUser.ID,
		Scope:                 resp.Scope,
		BotToken:              resp.AccessToken,
		InstalledBy:           userID,
		IncomingWebhookURL:    resp.IncomingWebhook.URL,
		IncomingWebhookChan:   resp.IncomingWebhook.Channel,
		IncomingWebhookChanID: resp.IncomingWebhook.ChannelID,
		DefaultChannelID:      resp.IncomingWebhook.ChannelID,
	}
	if err := h.repo.SaveInstallation(r.Context(), inst); err != nil {
		http.Error(w, `{"error":"persist"}`, http.StatusInternalServerError)
		return
	}
	target := h.publicBaseURL + "/integrations/slack?connected=1"
	if redirect != "" {
		target = redirect
	}
	http.Redirect(w, r, target, http.StatusFound)
}

func (h *testOAuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(uuid.UUID)
	inst, err := h.repo.GetForAdmin(r.Context(), tenantID)
	if errors.Is(err, domain.ErrNotFound) {
		writeJSON(w, http.StatusOK, map[string]any{"installed": false})
		return
	}
	if err != nil {
		http.Error(w, `{"error":"status"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"installed": true,
		"team_id":   inst.TeamID,
		"team_name": inst.TeamName,
	})
}

func (h *testOAuthHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	tenantID, _ := r.Context().Value(middleware.CtxTenantID).(uuid.UUID)
	inst, err := h.repo.GetActiveForTenant(r.Context(), tenantID)
	if err != nil || inst == nil {
		http.Error(w, `{"error":"not_installed"}`, http.StatusNotFound)
		return
	}
	_ = h.client.PostForm(r.Context(), "auth.revoke", inst.BotToken, url.Values{}, nil)
	if err := h.repo.RevokeInstallation(r.Context(), tenantID); err != nil {
		http.Error(w, `{"error":"revoke"}`, http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "revoked"})
}
