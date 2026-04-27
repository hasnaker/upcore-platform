package google

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// DirectoryUser is a subset of the Admin SDK User resource.
type DirectoryUser struct {
	ID          string `json:"id"`
	PrimaryEmail string `json:"primaryEmail"`
	Suspended   bool   `json:"suspended"`
	Archived    bool   `json:"archived"`
	Name        struct {
		GivenName  string `json:"givenName"`
		FamilyName string `json:"familyName"`
		FullName   string `json:"fullName"`
	} `json:"name"`
	OrgUnitPath string `json:"orgUnitPath"`
	LastLoginTime time.Time `json:"lastLoginTime,omitempty"`
	CreationTime  time.Time `json:"creationTime"`
	Organizations []struct {
		Title      string `json:"title"`
		Department string `json:"department"`
	} `json:"organizations,omitempty"`
}

// ListUsersResponse is the Admin SDK pagination shape.
type ListUsersResponse struct {
	Users         []DirectoryUser `json:"users"`
	NextPageToken string          `json:"nextPageToken,omitempty"`
}

// ListUsers fetches a page of Directory users. Use customer="my_customer" to
// default to the authenticated workspace.
//
// Delta sync: pass "query" like "email:*@example.com" + "projection=full" and
// filter client-side by lastLoginTime / updateTime > since.
func ListUsers(ctx context.Context, hc *http.Client, accessToken, pageToken string, pageSize int) (*ListUsersResponse, error) {
	if pageSize <= 0 || pageSize > 500 {
		pageSize = 200
	}
	q := url.Values{}
	q.Set("customer", "my_customer")
	q.Set("maxResults", fmt.Sprintf("%d", pageSize))
	q.Set("projection", "full")
	q.Set("orderBy", "email")
	if pageToken != "" {
		q.Set("pageToken", pageToken)
	}

	endpoint := "https://admin.googleapis.com/admin/directory/v1/users?" + q.Encode()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("google dir list %d: %s", resp.StatusCode, string(body))
	}
	var out ListUsersResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// SyncStats is returned by the daily delta worker.
type SyncStats struct {
	Inserted int
	Updated  int
	Archived int
	Errored  int
}
