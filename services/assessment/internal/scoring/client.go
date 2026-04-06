// Package scoring provides the HTTP client for the psychometric scoring service.
package scoring

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/domain"
)

// Client communicates with the psychometric-scoring service.
type Client interface {
	Score(ctx context.Context, req ScoreRequest) (*ScoreResponse, error)
}

// ScoreRequest is sent to the scoring service.
type ScoreRequest struct {
	AssessmentID   uuid.UUID          `json:"assessment_id"`
	TenantID       uuid.UUID          `json:"tenant_id"`
	InstrumentCode string             `json:"instrument_code"`
	Responses      []ResponseItem     `json:"responses"`
	Metadata       map[string]any     `json:"metadata,omitempty"`
}

// ResponseItem is a single item response for scoring.
type ResponseItem struct {
	ItemCode         string  `json:"item_code"`
	ItemIndex        int     `json:"item_index"`
	ResponseValue    int     `json:"response_value"`
	TimeSpentSeconds float64 `json:"time_spent_seconds"`
}

// ScoreResponse is returned by the scoring service.
type ScoreResponse struct {
	AssessmentID uuid.UUID    `json:"assessment_id"`
	Scales       []ScaleScore `json:"scales"`
	ScoredAt     time.Time    `json:"scored_at"`
}

// ScaleScore is one scale result.
type ScaleScore struct {
	ScaleCode  string   `json:"scale_code"`
	ScaleName  string   `json:"scale_name"`
	RawScore   float64  `json:"raw_score"`
	TScore     *float64 `json:"t_score,omitempty"`
	Percentile *float64 `json:"percentile,omitempty"`
	RiskLevel  *string  `json:"risk_level,omitempty"`
	NormGroup  *string  `json:"norm_group,omitempty"`
}

// HTTPClient is the real HTTP implementation.
type HTTPClient struct {
	baseURL string
	client  *http.Client
	log     zerolog.Logger
}

// NewHTTPClient constructs a scoring HTTP client.
func NewHTTPClient(baseURL string, timeout time.Duration, log zerolog.Logger) *HTTPClient {
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return &HTTPClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: timeout},
		log:     log,
	}
}

// Score sends a scoring request and returns the results.
func (c *HTTPClient) Score(ctx context.Context, req ScoreRequest) (*ScoreResponse, error) {
	instrument := domain.InstrumentCode(req.InstrumentCode)
	endpoint := instrument.ScoringEndpoint()
	if endpoint == "" {
		return nil, fmt.Errorf("no scoring endpoint for instrument %s", req.InstrumentCode)
	}

	url := c.baseURL + endpoint

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal score request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create score request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	c.log.Info().
		Str("url", url).
		Str("assessment_id", req.AssessmentID.String()).
		Int("response_count", len(req.Responses)).
		Msg("sending score request")

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("scoring service request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scoring service returned status %d", resp.StatusCode)
	}

	var result ScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode score response: %w", err)
	}

	c.log.Info().
		Str("assessment_id", req.AssessmentID.String()).
		Int("scale_count", len(result.Scales)).
		Msg("scoring complete")

	return &result, nil
}

// NewClient is a convenience constructor that creates an HTTPClient with a no-op logger.
// Used from main.go where the logger is not yet available at construction time.
func NewClient(baseURL string, timeout time.Duration) Client {
	return NewHTTPClient(baseURL, timeout, zerolog.Nop())
}

// NopClient is a no-op scoring client for development/testing.
type NopClient struct {
	log zerolog.Logger
}

// NewNopClient creates a no-op scoring client.
func NewNopClient(log zerolog.Logger) *NopClient {
	return &NopClient{log: log}
}

// Score returns mock scores.
func (c *NopClient) Score(_ context.Context, req ScoreRequest) (*ScoreResponse, error) {
	c.log.Info().
		Str("assessment_id", req.AssessmentID.String()).
		Msg("nop scoring client: returning mock scores")

	return &ScoreResponse{
		AssessmentID: req.AssessmentID,
		Scales: []ScaleScore{
			{
				ScaleCode: "total",
				ScaleName: "Total Score",
				RawScore:  0,
			},
		},
		ScoredAt: time.Now().UTC(),
	}, nil
}
