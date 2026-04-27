// Package linkedin fetches candidate public profile data. The LinkedIn
// official Recruiter API requires enterprise agreement; as a practical
// alternative we support "URL-only" mode (just store the URL) plus a
// "Proxycurl" adapter for tenants who purchase that third-party service.
package linkedin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

// Profile is the normalized schema stored in candidates.linkedin_profile.
type Profile struct {
	FullName    string      `json:"full_name"`
	Headline    string      `json:"headline"`
	Summary     string      `json:"summary"`
	Location    string      `json:"location"`
	Experience  []Position  `json:"experience"`
	Education   []Education `json:"education"`
	Skills      []string    `json:"skills"`
	Certifications []string `json:"certifications"`
	FetchedAt   time.Time   `json:"fetched_at"`
}

// Position = single work experience entry.
type Position struct {
	Title        string `json:"title"`
	Company      string `json:"company"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date,omitempty"`
	Description  string `json:"description,omitempty"`
}

// Education = single education entry.
type Education struct {
	School       string `json:"school"`
	Degree       string `json:"degree"`
	FieldOfStudy string `json:"field_of_study"`
	StartYear    string `json:"start_year"`
	EndYear      string `json:"end_year"`
}

// Fetcher abstracts the upstream source.
type Fetcher interface {
	FetchByURL(ctx context.Context, profileURL string) (*Profile, error)
}

// ProxycurlFetcher uses nubela.co/proxycurl — a paid LinkedIn data API.
// Set env: PROXYCURL_API_KEY. When unset, NoopFetcher is used.
type ProxycurlFetcher struct {
	APIKey  string
	BaseURL string
	client  *http.Client
}

// NewProxycurl constructs.
func NewProxycurl() Fetcher {
	key := os.Getenv("PROXYCURL_API_KEY")
	if key == "" {
		return NoopFetcher{}
	}
	return &ProxycurlFetcher{
		APIKey:  key,
		BaseURL: "https://nubela.co/proxycurl/api/v2/linkedin",
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// FetchByURL resolves a LinkedIn URL to a normalized Profile.
func (p *ProxycurlFetcher) FetchByURL(ctx context.Context, profileURL string) (*Profile, error) {
	q := url.Values{"url": {profileURL}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.BaseURL+"?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("proxycurl http: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		raw, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("proxycurl %d: %s", resp.StatusCode, string(raw))
	}

	// Proxycurl's v2/linkedin response is extensive; we pick a subset.
	var raw struct {
		FullName   string `json:"full_name"`
		Headline   string `json:"headline"`
		Summary    string `json:"summary"`
		City       string `json:"city"`
		Country    string `json:"country"`
		Experiences []struct {
			Title       string `json:"title"`
			Company     string `json:"company"`
			StartsAt    struct{ Day, Month, Year int } `json:"starts_at"`
			EndsAt      *struct{ Day, Month, Year int } `json:"ends_at"`
			Description string `json:"description"`
		} `json:"experiences"`
		Education []struct {
			School       string `json:"school"`
			Degree       string `json:"degree_name"`
			FieldOfStudy string `json:"field_of_study"`
			StartsAt     struct{ Year int } `json:"starts_at"`
			EndsAt       struct{ Year int } `json:"ends_at"`
		} `json:"education"`
		Skills            []string `json:"skills"`
		Certifications []struct {
			Name string `json:"name"`
		} `json:"certifications"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	profile := &Profile{
		FullName:  raw.FullName,
		Headline:  raw.Headline,
		Summary:   raw.Summary,
		Location:  raw.City + ", " + raw.Country,
		Skills:    raw.Skills,
		FetchedAt: time.Now().UTC(),
	}
	for _, e := range raw.Experiences {
		startStr := fmt.Sprintf("%04d-%02d", e.StartsAt.Year, e.StartsAt.Month)
		endStr := ""
		if e.EndsAt != nil {
			endStr = fmt.Sprintf("%04d-%02d", e.EndsAt.Year, e.EndsAt.Month)
		}
		profile.Experience = append(profile.Experience, Position{
			Title: e.Title, Company: e.Company,
			StartDate: startStr, EndDate: endStr,
			Description: e.Description,
		})
	}
	for _, ed := range raw.Education {
		profile.Education = append(profile.Education, Education{
			School: ed.School, Degree: ed.Degree,
			FieldOfStudy: ed.FieldOfStudy,
			StartYear:    fmt.Sprintf("%04d", ed.StartsAt.Year),
			EndYear:      fmt.Sprintf("%04d", ed.EndsAt.Year),
		})
	}
	for _, c := range raw.Certifications {
		profile.Certifications = append(profile.Certifications, c.Name)
	}
	return profile, nil
}

// NoopFetcher used when Proxycurl is not configured. Returns an empty
// profile with just the URL preserved; candidates.linkedin_url still useful.
type NoopFetcher struct{}

// FetchByURL returns a minimal profile.
func (NoopFetcher) FetchByURL(_ context.Context, profileURL string) (*Profile, error) {
	return &Profile{
		FullName:  "",
		Headline:  "",
		Location:  "",
		FetchedAt: time.Now().UTC(),
	}, nil
}
