// Package slack implements the Slack adapter (chat.postMessage, OAuth v2,
// slash commands and Events API URL verification) for the notification
// service. Signed request verification, rate limit handling with
// exponential backoff and Block Kit message construction live here.
//
// The adapter follows Slack App Directory requirements: no Socket Mode
// (Events API only), signed requests on every inbound route, bot tokens
// encrypted at rest (pgcrypto + optional Azure Key Vault reference) and
// Tier 2 rate limit compliance (~20 req/min per workspace).
package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

// APIBaseURL is the Slack Web API base URL. Overridable for tests.
var APIBaseURL = "https://slack.com/api"

// OAuthAuthorizeURL is the Slack OAuth v2 authorize endpoint. Overridable for tests.
var OAuthAuthorizeURL = "https://slack.com/oauth/v2/authorize"

// BotScopes is the set of scopes requested during OAuth install.
// chat:write — post messages as the app.
// chat:write.public — post into public channels without being a member.
// im:write — open DM conversations with users.
// users:read and users:read.email — resolve internal user e-mails to Slack user IDs.
// incoming-webhook — requested for legacy incoming-webhook fallback channel.
// commands — register slash commands.
// team:read — surface workspace name in admin UI.
var BotScopes = []string{
	"chat:write",
	"chat:write.public",
	"im:write",
	"users:read",
	"users:read.email",
	"incoming-webhook",
	"commands",
	"team:read",
}

// ErrRateLimited is returned when Slack responds with HTTP 429 and the
// caller must retry after the returned duration.
var ErrRateLimited = errors.New("slack: rate limited")

// ErrTokenRevoked is returned when Slack rejects the bot token (invalid_auth,
// token_revoked, account_inactive). Callers should treat the install as dead.
var ErrTokenRevoked = errors.New("slack: token revoked")

// ErrSlackAPI wraps arbitrary Slack "ok: false" responses.
type ErrSlackAPI struct {
	Code     string
	Response string
}

// Error implements error.
func (e *ErrSlackAPI) Error() string {
	return fmt.Sprintf("slack api error: %s", e.Code)
}

// Client calls the Slack Web API. It handles token-less endpoints (oauth.v2.access,
// oauth.v2.exchange) as well as bot-token authenticated endpoints.
type Client struct {
	http    *http.Client
	log     zerolog.Logger
	maxTier int // rate-limit tier (1..4). Slack publishes Tier 2 for chat.postMessage.
}

// NewClient builds a Slack Web API client with sensible defaults.
func NewClient(log zerolog.Logger) *Client {
	return &Client{
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
		log:     log,
		maxTier: 2,
	}
}

// WithHTTPClient overrides the underlying http client (used by tests).
func (c *Client) WithHTTPClient(hc *http.Client) *Client {
	c.http = hc
	return c
}

// apiResponse is the shared envelope Slack returns.
type apiResponse struct {
	OK       bool   `json:"ok"`
	Error    string `json:"error"`
	Warning  string `json:"warning"`
	Needed   string `json:"needed"`
	Provided string `json:"provided"`
}

// PostForm performs a form-urlencoded POST to api.slack.com and decodes the
// response into out. If Slack returns ok:false, an *ErrSlackAPI is returned.
// Rate-limit responses (HTTP 429) are retried transparently up to 3 times
// using the Retry-After header plus a small random jitter.
func (c *Client) PostForm(ctx context.Context, method, token string, params url.Values, out any) error {
	endpoint := APIBaseURL + "/" + strings.TrimPrefix(method, "/")

	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint,
			strings.NewReader(params.Encode()))
		if err != nil {
			return fmt.Errorf("build slack request: %w", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=utf-8")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := c.http.Do(req)
		if err != nil {
			return fmt.Errorf("slack http error: %w", err)
		}
		body, readErr := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if readErr != nil {
			return fmt.Errorf("slack read body: %w", readErr)
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			delay := parseRetryAfter(resp.Header.Get("Retry-After"))
			delay += time.Duration(rand.Intn(500)) * time.Millisecond
			if attempt == 3 {
				return fmt.Errorf("%w after %d retries", ErrRateLimited, attempt)
			}
			c.log.Warn().Int("attempt", attempt+1).
				Dur("retry_after", delay).Msg("slack rate-limited, backing off")
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				continue
			}
		}

		if resp.StatusCode >= 500 && attempt < 3 {
			delay := time.Duration(math.Pow(2, float64(attempt))) * 250 * time.Millisecond
			c.log.Warn().Int("status", resp.StatusCode).Int("attempt", attempt+1).
				Dur("retry_after", delay).Msg("slack 5xx, backing off")
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				continue
			}
		}

		if resp.StatusCode >= 400 {
			return fmt.Errorf("slack http status %d: %s", resp.StatusCode, string(body))
		}

		// Slack returns ok/err in the JSON body.
		var envelope apiResponse
		if err := json.Unmarshal(body, &envelope); err != nil {
			return fmt.Errorf("slack unmarshal envelope: %w", err)
		}
		if !envelope.OK {
			switch envelope.Error {
			case "invalid_auth", "token_revoked", "account_inactive", "not_authed":
				return fmt.Errorf("%w: %s", ErrTokenRevoked, envelope.Error)
			case "ratelimited":
				return ErrRateLimited
			}
			return &ErrSlackAPI{Code: envelope.Error, Response: string(body)}
		}

		if out != nil {
			if err := json.Unmarshal(body, out); err != nil {
				return fmt.Errorf("slack unmarshal response: %w", err)
			}
		}
		return nil
	}
	return errors.New("slack: exhausted retries")
}

// PostJSON posts a JSON payload to an arbitrary URL (used for incoming webhooks
// which accept JSON and return a text 200 / 4xx status code).
func (c *Client) PostJSON(ctx context.Context, urlStr string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("slack marshal webhook payload: %w", err)
	}

	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, urlStr, bytes.NewReader(data))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		resp, err := c.http.Do(req)
		if err != nil {
			return fmt.Errorf("slack webhook http: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests {
			delay := parseRetryAfter(resp.Header.Get("Retry-After"))
			if attempt == 3 {
				return ErrRateLimited
			}
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
				continue
			}
		}
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil
		}
		if resp.StatusCode >= 500 && attempt < 3 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(time.Duration(math.Pow(2, float64(attempt))) * 250 * time.Millisecond):
				continue
			}
		}
		return fmt.Errorf("slack webhook status %d: %s", resp.StatusCode, string(body))
	}
	return errors.New("slack webhook: exhausted retries")
}

func parseRetryAfter(header string) time.Duration {
	if header == "" {
		return 2 * time.Second
	}
	if secs, err := strconv.Atoi(strings.TrimSpace(header)); err == nil && secs >= 0 {
		return time.Duration(secs) * time.Second
	}
	// RFC1123 date fallback
	if t, err := http.ParseTime(header); err == nil {
		d := time.Until(t)
		if d < 0 {
			return 2 * time.Second
		}
		return d
	}
	return 2 * time.Second
}
