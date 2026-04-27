package google

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Scopes required by the UpCore Google Workspace integration.
var Scopes = []string{
	"https://www.googleapis.com/auth/admin.directory.user.readonly",
	"https://www.googleapis.com/auth/admin.directory.group.readonly",
	"https://www.googleapis.com/auth/calendar.events",
	"https://www.googleapis.com/auth/drive.file",
	"openid",
	"email",
	"profile",
}

// AuthorizeURL is the Google OAuth 2.0 authorize endpoint.
const AuthorizeURL = "https://accounts.google.com/o/oauth2/v2/auth"

// TokenURL is the Google OAuth 2.0 token endpoint.
const TokenURL = "https://oauth2.googleapis.com/token"

// Config holds OAuth2 client credentials.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	HostedDomain string // optional "hd" parameter — forces workspace domain
}

// TokenSet is what the token endpoint returns.
type TokenSet struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	IDToken      string    `json:"id_token"`
	ExpiresIn    int       `json:"expires_in"`
	TokenType    string    `json:"token_type"`
	Scope        string    `json:"scope"`
	ObtainedAt   time.Time `json:"-"`
}

// Expired reports whether this token is too old.
func (t *TokenSet) Expired() bool {
	if t == nil {
		return true
	}
	return time.Since(t.ObtainedAt) > time.Duration(t.ExpiresIn-60)*time.Second
}

// BuildAuthURL returns the URL to redirect the user to.
func (c *Config) BuildAuthURL(state string) string {
	q := url.Values{}
	q.Set("client_id", c.ClientID)
	q.Set("redirect_uri", c.RedirectURL)
	q.Set("response_type", "code")
	q.Set("scope", strings.Join(Scopes, " "))
	q.Set("access_type", "offline")
	q.Set("prompt", "consent")
	q.Set("state", state)
	if c.HostedDomain != "" {
		q.Set("hd", c.HostedDomain)
	}
	return AuthorizeURL + "?" + q.Encode()
}

// Exchange trades an authorization code for a token set.
func (c *Config) Exchange(ctx context.Context, hc *http.Client, code string) (*TokenSet, error) {
	params := url.Values{}
	params.Set("code", code)
	params.Set("client_id", c.ClientID)
	params.Set("client_secret", c.ClientSecret)
	params.Set("redirect_uri", c.RedirectURL)
	params.Set("grant_type", "authorization_code")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("google token exchange %d: %s", resp.StatusCode, string(body))
	}
	var tok TokenSet
	if err := json.Unmarshal(body, &tok); err != nil {
		return nil, err
	}
	tok.ObtainedAt = time.Now().UTC()
	if tok.RefreshToken == "" {
		return nil, errors.New("google: refresh_token missing — request prompt=consent+access_type=offline")
	}
	return &tok, nil
}

// Refresh swaps a refresh token for a new access token.
func (c *Config) Refresh(ctx context.Context, hc *http.Client, refresh string) (*TokenSet, error) {
	params := url.Values{}
	params.Set("refresh_token", refresh)
	params.Set("client_id", c.ClientID)
	params.Set("client_secret", c.ClientSecret)
	params.Set("grant_type", "refresh_token")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, TokenURL, strings.NewReader(params.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("google refresh %d: %s", resp.StatusCode, string(body))
	}
	var tok TokenSet
	if err := json.Unmarshal(body, &tok); err != nil {
		return nil, err
	}
	tok.ObtainedAt = time.Now().UTC()
	tok.RefreshToken = refresh // Google doesn't re-issue refresh tokens
	return &tok, nil
}
