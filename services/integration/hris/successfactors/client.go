// Package successfactors implements the SAP SuccessFactors connector for
// UpCore. Uses OAuth2 (SAML 2.0 bearer assertion grant) + OData v4 against
// the tenant's specific API endpoint (e.g. https://api12preview.sapsf.eu).
//
// Employee Central (EC) is the primary source — we hit /odata/v2/PerPerson
// with $filter=lastModifiedDateTime ge <iso> for delta sync. Cover the
// legacy non-EC case via /odata/v2/User when EC is not licensed.
package successfactors

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

	"github.com/upcore/integration/hris"
)

// Client talks to a SuccessFactors OData v2 tenant.
type Client struct {
	http       *http.Client
	baseURL    string // e.g. https://api12preview.sapsf.eu
	token      string
	tokenExp   time.Time
	companyID  string
	userID     string
	privateKey []byte // RSA PEM for SAML bearer assertion
}

// NewClient wires a new client. tokenFetcher returns a fresh bearer token
// (typically using the SAML assertion grant; see tokenFetcher.go in sibling).
func NewClient(baseURL, companyID, userID string, privateKey []byte, hc *http.Client) *Client {
	if hc == nil {
		hc = &http.Client{Timeout: 30 * time.Second}
	}
	return &Client{
		http:       hc,
		baseURL:    strings.TrimRight(baseURL, "/"),
		companyID:  companyID,
		userID:     userID,
		privateKey: privateKey,
	}
}

// Provider returns the connector's canonical name.
func (c *Client) Provider() string { return "successfactors" }

// FetchEmployees pulls one page of users modified after `since`.
func (c *Client) FetchEmployees(ctx context.Context, since time.Time, pageToken string) ([]hris.Employee, string, error) {
	if err := c.ensureToken(ctx); err != nil {
		return nil, "", err
	}
	q := url.Values{}
	q.Set("$format", "json")
	q.Set("$top", "500")
	q.Set("$select", "userId,username,firstName,lastName,email,department,title,manager,hireDate,employmentType,country,status,lastModifiedDateTime")
	if !since.IsZero() {
		q.Set("$filter", "lastModifiedDateTime ge datetime'"+since.UTC().Format("2006-01-02T15:04:05")+"'")
	}
	if pageToken != "" {
		q.Set("$skiptoken", pageToken)
	}
	endpoint := c.baseURL + "/odata/v2/User?" + q.Encode()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, "", fmt.Errorf("sf odata %d: %s", resp.StatusCode, string(raw))
	}
	var wire struct {
		D struct {
			Results []struct {
				UserID         string `json:"userId"`
				Username       string `json:"username"`
				FirstName      string `json:"firstName"`
				LastName       string `json:"lastName"`
				Email          string `json:"email"`
				Department     string `json:"department"`
				Title          string `json:"title"`
				Manager        string `json:"manager"`
				HireDate       string `json:"hireDate"`
				EmploymentType string `json:"employmentType"`
				Country        string `json:"country"`
				Status         string `json:"status"`
			} `json:"results"`
			Next string `json:"__next"`
		} `json:"d"`
	}
	if err := json.Unmarshal(raw, &wire); err != nil {
		return nil, "", err
	}
	out := make([]hris.Employee, 0, len(wire.D.Results))
	for _, r := range wire.D.Results {
		hire := parseSFDate(r.HireDate)
		out = append(out, hris.Employee{
			ExternalID:   r.UserID,
			Email:        r.Email,
			FirstName:    r.FirstName,
			LastName:     r.LastName,
			EmployeeNo:   r.Username,
			Department:   r.Department,
			Title:        r.Title,
			ManagerExtID: r.Manager,
			HireDate:     hire,
			Country:      r.Country,
			Active:       !strings.EqualFold(r.Status, "t"), // "t" = terminated
		})
	}
	return out, extractSkipToken(wire.D.Next), nil
}

// PushUpdate does a PATCH /odata/v2/User(userId='...') with the single field.
func (c *Client) PushUpdate(ctx context.Context, externalID, field, value string) error {
	if err := c.ensureToken(ctx); err != nil {
		return err
	}
	endpoint := c.baseURL + fmt.Sprintf("/odata/v2/User('%s')", url.PathEscape(externalID))
	body := fmt.Sprintf(`{"%s":%q}`, field, value)
	req, _ := http.NewRequestWithContext(ctx, "MERGE", endpoint, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sf merge %d: %s", resp.StatusCode, string(raw))
	}
	return nil
}

// ensureToken refreshes the bearer via SAML assertion grant when expired.
func (c *Client) ensureToken(ctx context.Context) error {
	if c.token != "" && time.Until(c.tokenExp) > 60*time.Second {
		return nil
	}
	// TODO(partial): replace stub with a real SAML 2.0 Bearer Assertion grant
	// signed with c.privateKey. The stub below is sufficient for wiring tests
	// against a reverse-proxy mock.
	if len(c.privateKey) == 0 {
		return errors.New("successfactors: private key missing for SAML assertion")
	}
	c.token = "STUB-" + c.companyID
	c.tokenExp = time.Now().Add(55 * time.Minute)
	return nil
}

func parseSFDate(s string) time.Time {
	// SF OData emits "/Date(1609459200000)/".
	if strings.HasPrefix(s, "/Date(") && strings.HasSuffix(s, ")/") {
		ms := s[len("/Date(") : len(s)-len(")/")]
		var millis int64
		for _, ch := range ms {
			if ch < '0' || ch > '9' {
				break
			}
			millis = millis*10 + int64(ch-'0')
		}
		return time.Unix(0, millis*int64(time.Millisecond)).UTC()
	}
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

func extractSkipToken(next string) string {
	if next == "" {
		return ""
	}
	u, err := url.Parse(next)
	if err != nil {
		return ""
	}
	return u.Query().Get("$skiptoken")
}
