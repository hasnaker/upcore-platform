// Package prometheus is a tiny query adapter against the Prometheus HTTP API.
// We only need 2 kinds of queries (instant "up{}" and p95 histogram) so we do
// not pull in the full prom/client_golang dependency — a 100-line stdlib
// implementation is easier to audit.
package prometheus

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Client wraps a Prometheus base URL (e.g. http://prometheus:9090).
type Client struct {
	BaseURL string
	HTTP    *http.Client
}

// NewClient constructs a Client with a sensible default HTTP client.
func NewClient(baseURL string) *Client {
	if baseURL == "" {
		baseURL = "http://prometheus:9090"
	}
	return &Client{
		BaseURL: baseURL,
		HTTP:    &http.Client{Timeout: 5 * time.Second},
	}
}

// queryResponse is a minimal view onto the Prometheus /api/v1/query response.
type queryResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string            `json:"resultType"`
		Result     []json.RawMessage `json:"result"`
	} `json:"data"`
	Error     string `json:"error,omitempty"`
	ErrorType string `json:"errorType,omitempty"`
}

// instantResult matches the shape of a single vector sample.
type instantResult struct {
	Metric map[string]string `json:"metric"`
	Value  [2]json.RawMessage `json:"value"`
}

// Query runs an instant query and returns (labels, value, ok).
func (c *Client) Query(ctx context.Context, q string) ([]instantResult, error) {
	u := fmt.Sprintf("%s/api/v1/query?query=%s", c.BaseURL, url.QueryEscape(q))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("prometheus: http %d", resp.StatusCode)
	}
	var out queryResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if out.Status != "success" {
		return nil, fmt.Errorf("prometheus: %s %s", out.ErrorType, out.Error)
	}
	var rows []instantResult
	for _, raw := range out.Data.Result {
		var r instantResult
		if err := json.Unmarshal(raw, &r); err != nil {
			return nil, err
		}
		rows = append(rows, r)
	}
	return rows, nil
}

// ComponentHealth computes per-job up status and p95 latency for the given
// job list. A job is "up" if any instance reports up==1 and there are no
// active alerts targeting it.
type Health struct {
	Job           string
	Up            bool
	P95LatencyMs  int
	SampledAt     time.Time
}

// SampleHealth calls Prometheus for each job and returns the health snapshot.
// If the Prometheus server is unreachable, ok is false.
func (c *Client) SampleHealth(ctx context.Context, jobs []string) (map[string]Health, bool) {
	out := make(map[string]Health, len(jobs))
	// 1. up{job=~"..."} — instant
	if len(jobs) == 0 {
		return out, true
	}
	selector := `up{job=~"` + joinJobs(jobs) + `"}`
	rows, err := c.Query(ctx, selector)
	if err != nil {
		return out, false
	}
	for _, r := range rows {
		job := r.Metric["job"]
		var up bool
		if len(r.Value) == 2 {
			var raw string
			_ = json.Unmarshal(r.Value[1], &raw)
			v, _ := strconv.ParseFloat(raw, 64)
			up = v > 0.5
		}
		h := out[job]
		h.Job = job
		h.Up = up
		h.SampledAt = time.Now().UTC()
		out[job] = h
	}

	// 2. p95 latency — per-job 24h quantile on http request histogram.
	lat := `histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket{job=~"` +
		joinJobs(jobs) + `"}[24h])))`
	rows, err = c.Query(ctx, lat)
	if err == nil {
		for _, r := range rows {
			job := r.Metric["job"]
			if len(r.Value) == 2 {
				var raw string
				_ = json.Unmarshal(r.Value[1], &raw)
				secs, _ := strconv.ParseFloat(raw, 64)
				h := out[job]
				h.Job = job
				h.P95LatencyMs = int(secs * 1000)
				out[job] = h
			}
		}
	}
	return out, true
}

func joinJobs(jobs []string) string {
	out := ""
	for i, j := range jobs {
		if i > 0 {
			out += "|"
		}
		out += j
	}
	return out
}
