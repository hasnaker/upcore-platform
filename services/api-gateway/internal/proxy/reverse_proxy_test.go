package proxy

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/api-gateway/internal/config"
)

func TestGateway_ProxiesToUpstream(t *testing.T) {
	// Create a test upstream server
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"path":      r.URL.Path,
			"method":    r.Method,
			"tenant_id": r.Header.Get("X-Tenant-Id"),
			"user_id":   r.Header.Get("X-User-Id"),
		})
	}))
	defer upstream.Close()

	routes := []config.RouteConfig{
		{
			PathPrefix:   "/api/v1/test",
			Upstream:     "test-svc",
			Target:       upstream.URL,
			AuthRequired: true,
			Timeout:      30 * time.Second,
			Methods:      []string{"GET", "POST", "PUT", "DELETE"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test/items/123", nil)
	req.Header.Set("X-Tenant-Id", "tenant-456")
	req.Header.Set("X-User-Id", "user-789")
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)

	var body map[string]string
	err = json.NewDecoder(rec.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "/api/v1/test/items/123", body["path"])
	assert.Equal(t, "GET", body["method"])
	assert.Equal(t, "tenant-456", body["tenant_id"])
	assert.Equal(t, "user-789", body["user_id"])
}

func TestGateway_NoMatchingRoute(t *testing.T) {
	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/test",
			Upstream:   "test-svc",
			Target:     "http://localhost:9999",
			Methods:    []string{"GET"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/unknown", nil)
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNotFound, rec.Code)

	var body map[string]string
	err = json.NewDecoder(rec.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "not_found", body["error"])
}

func TestGateway_PreservesRequestBody(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(body)
	}))
	defer upstream.Close()

	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/test",
			Upstream:   "test-svc",
			Target:     upstream.URL,
			Methods:    []string{"POST"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	payload := `{"name":"test","value":42}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/test", nil)
	req.Body = io.NopCloser(stringReader(payload))
	req.ContentLength = int64(len(payload))
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, payload, rec.Body.String())
}

func TestGateway_SetsForwardingHeaders(t *testing.T) {
	var capturedHeaders http.Header
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedHeaders = r.Header.Clone()
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/test",
			Upstream:   "test-svc",
			Target:     upstream.URL,
			Methods:    []string{"GET"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	assert.NotEmpty(t, capturedHeaders.Get("X-Forwarded-For"))
	assert.NotEmpty(t, capturedHeaders.Get("X-Forwarded-Proto"))
	assert.Equal(t, "test-svc", capturedHeaders.Get("X-Gateway-Upstream"))
}

func TestGateway_DeduplicatesUpstreams(t *testing.T) {
	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/departments",
			Upstream:   "organization",
			Target:     "http://organization:8004",
			Methods:    []string{"GET"},
		},
		{
			PathPrefix: "/api/v1/positions",
			Upstream:   "organization",
			Target:     "http://organization:8004",
			Methods:    []string{"GET"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	// Should only have one upstream for "organization"
	assert.Len(t, gw.Upstreams(), 1)
	_, exists := gw.Upstreams()["organization"]
	assert.True(t, exists)
}

type stringReaderType struct {
	*io.LimitedReader
}

func stringReader(s string) io.Reader {
	return io.LimitReader(stringReaderImpl(s), int64(len(s)))
}

type stringReaderImpl string

func (s stringReaderImpl) Read(p []byte) (n int, err error) {
	n = copy(p, string(s))
	return n, io.EOF
}
