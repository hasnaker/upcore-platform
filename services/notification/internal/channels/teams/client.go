// Package teams implements the Microsoft Teams (Azure Bot Framework) adapter
// for the notification service. Supports OAuth2 v2 install (Bot Framework
// identity), Adaptive Cards 1.5 (intervention consent + pulse reminder),
// proactive messaging and slash-command parsing (@UpCore pulse, @UpCore
// feedback).
//
// Identity model:
//   - Tenant-scoped bot registration stored in Azure Bot Service (manifest in
//     infrastructure/teams/manifest.json) — one multi-tenant app.
//   - Per-tenant "installation" row holds the AAD tenant ID + service URL +
//     bot access token (AAD client-credentials flow, ~1h expiry → cached).
//   - Messages to users use `conversations/{conversationId}/activities` under
//     the tenant's service URL, signed with a Bearer token from
//     login.microsoftonline.com/<aad-tenant>/oauth2/v2.0/token.
package teams

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// OAuthScope is the Bot Framework resource scope (single-tenant token).
const OAuthScope = "https://api.botframework.com/.default"

// TokenEndpoint returns the MSAL v2.0 token endpoint for an AAD tenant.
func TokenEndpoint(aadTenantID string) string {
	if aadTenantID == "" {
		aadTenantID = "botframework.com"
	}
	return fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", aadTenantID)
}

// ErrRateLimited — 429 with Retry-After honoured by the caller.
var ErrRateLimited = errors.New("teams: rate limited")

// ErrUnauthorized — 401/403, caller should re-auth.
var ErrUnauthorized = errors.New("teams: unauthorized")

// Client calls the Bot Framework and MS Graph APIs with cached AAD tokens.
type Client struct {
	http     *http.Client
	log      zerolog.Logger
	appID    string
	appKey   string // client_secret
	mu       sync.Mutex
	tokens   map[string]cachedToken
}

type cachedToken struct {
	val string
	exp time.Time
}

// NewClient builds a new Teams client.
func NewClient(appID, appSecret string, log zerolog.Logger) *Client {
	return &Client{
		http:   &http.Client{Timeout: 15 * time.Second},
		log:    log,
		appID:  appID,
		appKey: appSecret,
		tokens: make(map[string]cachedToken),
	}
}

// BotToken returns a (possibly cached) access token for the given AAD tenant.
func (c *Client) BotToken(ctx context.Context, aadTenantID string) (string, error) {
	c.mu.Lock()
	if t, ok := c.tokens[aadTenantID]; ok && time.Until(t.exp) > 60*time.Second {
		c.mu.Unlock()
		return t.val, nil
	}
	c.mu.Unlock()

	params := url.Values{}
	params.Set("grant_type", "client_credentials")
	params.Set("client_id", c.appID)
	params.Set("client_secret", c.appKey)
	params.Set("scope", OAuthScope)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		TokenEndpoint(aadTenantID), strings.NewReader(params.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("teams token http: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("teams token status %d: %s", resp.StatusCode, string(body))
	}
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("teams token decode: %w", err)
	}
	c.mu.Lock()
	c.tokens[aadTenantID] = cachedToken{
		val: out.AccessToken,
		exp: time.Now().Add(time.Duration(out.ExpiresIn) * time.Second),
	}
	c.mu.Unlock()
	return out.AccessToken, nil
}

// SendActivity posts a Bot Framework activity JSON to a conversation.
// serviceURL is tenant-bound (comes from the installation record) and
// looks like https://smba.trafficmanager.net/emea/.
func (c *Client) SendActivity(ctx context.Context, serviceURL, conversationID, aadTenantID string, activity any) error {
	token, err := c.BotToken(ctx, aadTenantID)
	if err != nil {
		return err
	}
	endpoint := strings.TrimRight(serviceURL, "/") +
		"/v3/conversations/" + url.PathEscape(conversationID) + "/activities"
	data, err := json.Marshal(activity)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("teams send http: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	switch {
	case resp.StatusCode == http.StatusTooManyRequests:
		return ErrRateLimited
	case resp.StatusCode == http.StatusUnauthorized, resp.StatusCode == http.StatusForbidden:
		return ErrUnauthorized
	case resp.StatusCode >= 400:
		return fmt.Errorf("teams activity status %d: %s", resp.StatusCode, string(body))
	}
	return nil
}

// CreateDM opens a 1:1 conversation with a user (by AAD object id) and returns
// the conversation id.
func (c *Client) CreateDM(ctx context.Context, serviceURL, aadTenantID, aadUserID string) (string, error) {
	token, err := c.BotToken(ctx, aadTenantID)
	if err != nil {
		return "", err
	}
	endpoint := strings.TrimRight(serviceURL, "/") + "/v3/conversations"
	payload := map[string]any{
		"bot":      map[string]string{"id": "28:" + c.appID, "name": "UpCore"},
		"members":  []map[string]string{{"id": aadUserID}},
		"tenantId": aadTenantID,
		"isGroup":  false,
	}
	data, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("teams create conv %d: %s", resp.StatusCode, string(body))
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}
