package slack

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	channelslack "github.com/upcore/notification/internal/channels/slack"
	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/middleware"
)

// OAuthHandler implements the install/callback/status/uninstall flow.
type OAuthHandler struct {
	repo          *Repository
	client        *channelslack.Client
	clientID      string
	clientSecret  string
	redirectURL   string
	appID         string
	publicBaseURL string
	log           zerolog.Logger
	now           func() time.Time
}

// NewOAuthHandler constructs the handler.
func NewOAuthHandler(
	repo *Repository,
	client *channelslack.Client,
	clientID, clientSecret, redirectURL, appID, publicBaseURL string,
	log zerolog.Logger,
) *OAuthHandler {
	return &OAuthHandler{
		repo:          repo,
		client:        client,
		clientID:      clientID,
		clientSecret:  clientSecret,
		redirectURL:   redirectURL,
		appID:         appID,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
		log:           log,
		now:           time.Now,
	}
}

// Install redirects the caller to Slack's OAuth v2 authorize URL.
// GET /api/v1/integrations/slack/install
func (h *OAuthHandler) Install(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	userID := middleware.UserIDFromContext(r.Context())
	if tenantID == uuid.Nil || userID == uuid.Nil {
		writeJSONErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	state, err := randomState()
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, "state_generate_failed")
		return
	}

	redirectTo := r.URL.Query().Get("redirect_to")
	if err := h.repo.PutOAuthState(r.Context(), state, tenantID, userID, redirectTo, 10*time.Minute); err != nil {
		h.log.Error().Err(err).Msg("put oauth state")
		writeJSONErr(w, http.StatusInternalServerError, "state_persist_failed")
		return
	}

	q := url.Values{}
	q.Set("client_id", h.clientID)
	q.Set("scope", strings.Join(channelslack.BotScopes, ","))
	q.Set("user_scope", "")
	q.Set("redirect_uri", h.redirectURL)
	q.Set("state", state)

	target := channelslack.OAuthAuthorizeURL + "?" + q.Encode()
	http.Redirect(w, r, target, http.StatusFound)
}

// Callback handles Slack's OAuth v2 redirect.
// GET /api/v1/integrations/slack/callback?code=...&state=...
func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if e := r.URL.Query().Get("error"); e != "" {
		h.log.Warn().Str("error", e).Msg("slack oauth denied by user")
		http.Redirect(w, r, h.publicBaseURL+"/integrations/slack?error="+url.QueryEscape(e), http.StatusFound)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		writeJSONErr(w, http.StatusBadRequest, "missing_code_or_state")
		return
	}

	tenantID, userID, redirectTo, err := h.repo.ConsumeOAuthState(ctx, state)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSONErr(w, http.StatusBadRequest, "invalid_or_expired_state")
			return
		}
		h.log.Error().Err(err).Msg("consume state")
		writeJSONErr(w, http.StatusInternalServerError, "state_load_failed")
		return
	}

	params := url.Values{}
	params.Set("client_id", h.clientID)
	params.Set("client_secret", h.clientSecret)
	params.Set("code", code)
	params.Set("redirect_uri", h.redirectURL)

	var resp struct {
		AccessToken    string `json:"access_token"`     // xoxb-...
		TokenType      string `json:"token_type"`
		Scope          string `json:"scope"`
		BotUserID      string `json:"bot_user_id"`
		AppID          string `json:"app_id"`
		Team           struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"team"`
		Enterprise *struct {
			ID string `json:"id"`
		} `json:"enterprise"`
		AuthedUser struct {
			ID string `json:"id"`
		} `json:"authed_user"`
		IncomingWebhook *struct {
			URL          string `json:"url"`
			Channel      string `json:"channel"`
			ChannelID    string `json:"channel_id"`
			ConfigURL    string `json:"configuration_url"`
		} `json:"incoming_webhook"`
	}
	if err := h.client.PostForm(ctx, "oauth.v2.access", "", params, &resp); err != nil {
		h.log.Error().Err(err).Msg("oauth.v2.access")
		writeJSONErr(w, http.StatusBadGateway, "slack_exchange_failed")
		return
	}
	if !strings.HasPrefix(resp.AccessToken, "xoxb-") {
		writeJSONErr(w, http.StatusBadGateway, "unexpected_token_type")
		return
	}

	inst := &Installation{
		TenantID:     tenantID,
		TeamID:       resp.Team.ID,
		TeamName:     resp.Team.Name,
		AppID:        resp.AppID,
		BotUserID:    resp.BotUserID,
		AuthedUserID: resp.AuthedUser.ID,
		Scope:        resp.Scope,
		BotToken:     resp.AccessToken,
		InstalledBy:  userID,
	}
	if resp.Enterprise != nil {
		inst.EnterpriseID = resp.Enterprise.ID
	}
	if resp.IncomingWebhook != nil {
		inst.IncomingWebhookURL = resp.IncomingWebhook.URL
		inst.IncomingWebhookChan = resp.IncomingWebhook.Channel
		inst.IncomingWebhookChanID = resp.IncomingWebhook.ChannelID
		inst.DefaultChannelID = resp.IncomingWebhook.ChannelID
	}

	if err := h.repo.SaveInstallation(ctx, inst); err != nil {
		h.log.Error().Err(err).Msg("save slack install")
		writeJSONErr(w, http.StatusInternalServerError, "persist_failed")
		return
	}
	h.log.Info().Str("tenant", tenantID.String()).Str("team", inst.TeamID).
		Str("team_name", inst.TeamName).Msg("slack installation persisted")

	// Redirect back to UI.
	target := h.publicBaseURL + "/integrations/slack?connected=1"
	if redirectTo != "" {
		target = redirectTo
	}
	http.Redirect(w, r, target, http.StatusFound)
}

// Status returns install details for the caller's tenant.
// GET /api/v1/integrations/slack/status
func (h *OAuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromContext(r.Context())
	inst, err := h.repo.GetForAdmin(r.Context(), tenantID)
	if errors.Is(err, domain.ErrNotFound) {
		writeJSON(w, http.StatusOK, map[string]any{"installed": false})
		return
	}
	if err != nil {
		h.log.Error().Err(err).Msg("slack status")
		writeJSONErr(w, http.StatusInternalServerError, "status_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"installed":               true,
		"team_id":                 inst.TeamID,
		"team_name":               inst.TeamName,
		"enterprise_id":           inst.EnterpriseID,
		"app_id":                  inst.AppID,
		"bot_user_id":             inst.BotUserID,
		"scope":                   inst.Scope,
		"default_channel_id":      inst.DefaultChannelID,
		"webhook_channel":         inst.IncomingWebhookChan,
		"webhook_channel_id":      inst.IncomingWebhookChanID,
		"allow_dm_interventions":  inst.AllowDMInterventions,
		"installed_at":            inst.InstalledAt,
		"installed_by":            inst.InstalledBy,
	})
}

// Uninstall revokes the bot token with Slack and marks the row as revoked.
// DELETE /api/v1/integrations/slack
func (h *OAuthHandler) Uninstall(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	inst, err := h.repo.GetActiveForTenant(ctx, tenantID)
	if err != nil {
		h.log.Error().Err(err).Msg("lookup install for uninstall")
		writeJSONErr(w, http.StatusInternalServerError, "lookup_failed")
		return
	}
	if inst == nil {
		writeJSONErr(w, http.StatusNotFound, "not_installed")
		return
	}

	// Best-effort Slack revoke; failures are logged but do not block revocation.
	if err := h.client.PostForm(ctx, "auth.revoke", inst.BotToken, url.Values{}, nil); err != nil {
		h.log.Warn().Err(err).Msg("slack auth.revoke failed (continuing)")
	}

	if err := h.repo.RevokeInstallation(ctx, tenantID); err != nil {
		h.log.Error().Err(err).Msg("revoke slack install")
		writeJSONErr(w, http.StatusInternalServerError, "revoke_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "revoked"})
}

// UpdateSettings toggles tenant-level Slack flags (currently only the KVKK
// opt-in for intervention DMs).
// PATCH /api/v1/integrations/slack/settings
func (h *OAuthHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AllowDMInterventions *bool `json:"allow_dm_interventions"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&body); err != nil {
		writeJSONErr(w, http.StatusBadRequest, "bad_request")
		return
	}
	tenantID := middleware.TenantIDFromContext(r.Context())
	if body.AllowDMInterventions != nil {
		if err := h.repo.SetAllowDMInterventions(r.Context(), tenantID, *body.AllowDMInterventions); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				writeJSONErr(w, http.StatusNotFound, "not_installed")
				return
			}
			writeJSONErr(w, http.StatusInternalServerError, "update_failed")
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

// TestMessage posts a test Block Kit message to the tenant's default channel
// (or installed webhook channel). Used by the admin UI to validate install.
// POST /api/v1/integrations/slack/test
func (h *OAuthHandler) TestMessage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	inst, err := h.repo.GetActiveForTenant(ctx, tenantID)
	if err != nil || inst == nil {
		writeJSONErr(w, http.StatusNotFound, "not_installed")
		return
	}
	msg := channelslack.PlainDM("UpCore · Test Bildirimi", ":white_check_mark: UpCore Slack entegrasyonu çalışıyor. Bu test mesajıdır.")
	channel := inst.DefaultChannelID
	if channel == "" {
		channel = inst.IncomingWebhookChanID
	}
	if channel == "" && inst.IncomingWebhookURL != "" {
		if err := h.client.PostJSON(ctx, inst.IncomingWebhookURL, msg); err != nil {
			writeJSONErr(w, http.StatusBadGateway, "slack_test_failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "sent", "via": "webhook"})
		return
	}

	params := url.Values{}
	params.Set("channel", channel)
	params.Set("text", msg.Text)
	if blocks, err := json.Marshal(msg.Blocks); err == nil {
		params.Set("blocks", string(blocks))
	}
	var resp struct {
		TS string `json:"ts"`
	}
	if err := h.client.PostForm(ctx, "chat.postMessage", inst.BotToken, params, &resp); err != nil {
		h.log.Error().Err(err).Msg("slack test message failed")
		writeJSONErr(w, http.StatusBadGateway, "slack_test_failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "sent", "ts": resp.TS, "channel": channel})
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONErr(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}

// Expose constants so tests can assert they are set.
func (h *OAuthHandler) RedirectURL() string { return h.redirectURL }
func (h *OAuthHandler) ClientID() string    { return h.clientID }

// ensure strings import is used even if future refactor removes TrimRight.
var _ = strings.TrimRight
