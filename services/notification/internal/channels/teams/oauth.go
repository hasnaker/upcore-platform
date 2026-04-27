package teams

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Repository is the data layer contract for Teams installations.
// Implementations live in internal/teams/repository.go so tests can swap it.
type Repository interface {
	PutOAuthState(ctx context.Context, state string, tenantID, userID uuid.UUID, ttl time.Duration) error
	ConsumeOAuthState(ctx context.Context, state string) (uuid.UUID, uuid.UUID, error)
	SaveInstallation(ctx context.Context, inst *Installation) error
	GetActiveForTenant(ctx context.Context, tenantID uuid.UUID) (*Installation, error)
	RevokeInstallation(ctx context.Context, tenantID uuid.UUID) error
}

// Installation is a persisted Teams bot install per UpCore tenant.
type Installation struct {
	TenantID     uuid.UUID
	AADTenantID  string // directory (tenant) id from the identity token
	TeamID       string // Teams team id (if installed to a team scope)
	ServiceURL   string // from bot activity — where to POST activities
	BotUserID    string
	BotToken     string // plaintext in memory only
	InstalledBy  uuid.UUID
	InstalledAt  time.Time
}

// OAuthHandler drives install/uninstall through Microsoft identity.
type OAuthHandler struct {
	repo         Repository
	client       *Client
	clientID     string
	clientSecret string
	redirectURL  string
	publicBaseURL string
}

// NewOAuthHandler builds the handler.
func NewOAuthHandler(repo Repository, client *Client, clientID, clientSecret, redirectURL, publicBaseURL string) *OAuthHandler {
	return &OAuthHandler{
		repo:         repo,
		client:       client,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}
}

// AuthorizeURL for Microsoft identity v2.0 + Bot Framework scope.
const AuthorizeURLTemplate = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"

// Install starts the MSAL code flow.
func (h *OAuthHandler) Install(w http.ResponseWriter, r *http.Request, tenantID, userID uuid.UUID) {
	state, err := randomState()
	if err != nil {
		http.Error(w, "state", http.StatusInternalServerError)
		return
	}
	if err := h.repo.PutOAuthState(r.Context(), state, tenantID, userID, 10*time.Minute); err != nil {
		http.Error(w, "state_persist", http.StatusInternalServerError)
		return
	}
	q := url.Values{}
	q.Set("client_id", h.clientID)
	q.Set("response_type", "code")
	q.Set("redirect_uri", h.redirectURL)
	q.Set("response_mode", "query")
	q.Set("scope", "https://graph.microsoft.com/.default offline_access")
	q.Set("state", state)
	http.Redirect(w, r, AuthorizeURLTemplate+"?"+q.Encode(), http.StatusFound)
}

// Callback handles MS identity redirect.
func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		http.Error(w, "missing_code", http.StatusBadRequest)
		return
	}
	tenantID, userID, err := h.repo.ConsumeOAuthState(ctx, state)
	if err != nil {
		http.Error(w, "invalid_state", http.StatusBadRequest)
		return
	}
	tok, aadTenant, err := h.exchangeCode(ctx, code)
	if err != nil {
		http.Error(w, "exchange_failed", http.StatusBadGateway)
		return
	}
	inst := &Installation{
		TenantID:    tenantID,
		AADTenantID: aadTenant,
		BotToken:    tok,
		InstalledBy: userID,
		InstalledAt: time.Now().UTC(),
	}
	if err := h.repo.SaveInstallation(ctx, inst); err != nil {
		http.Error(w, "persist", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, h.publicBaseURL+"/integrations/teams?connected=1", http.StatusFound)
}

// exchangeCode trades an auth code for an access token (common endpoint, we
// read the `tid` claim from the id_token for the AAD tenant id).
func (h *OAuthHandler) exchangeCode(ctx context.Context, code string) (string, string, error) {
	params := url.Values{}
	params.Set("client_id", h.clientID)
	params.Set("client_secret", h.clientSecret)
	params.Set("code", code)
	params.Set("redirect_uri", h.redirectURL)
	params.Set("grant_type", "authorization_code")
	params.Set("scope", "https://graph.microsoft.com/.default offline_access")

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://login.microsoftonline.com/common/oauth2/v2.0/token",
		strings.NewReader(params.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := h.client.http.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	var out struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", "", err
	}
	if out.AccessToken == "" {
		return "", "", errors.New("teams: empty access_token")
	}
	return out.AccessToken, decodeTenantClaim(out.IDToken), nil
}

// decodeTenantClaim extracts the "tid" claim from an id_token JWT without
// verifying — safe for our own identity provider response.
func decodeTenantClaim(jwt string) string {
	parts := strings.Split(jwt, ".")
	if len(parts) < 2 {
		return ""
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}
	var claims struct {
		TID string `json:"tid"`
	}
	_ = json.Unmarshal(payload, &claims)
	return claims.TID
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
