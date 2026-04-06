package proxy

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewUpstream_ValidURL(t *testing.T) {
	u, err := NewUpstream("test", "http://localhost:8001", DefaultUpstreamConfig())
	require.NoError(t, err)
	assert.Equal(t, "test", u.Name)
	assert.Equal(t, "localhost:8001", u.BaseURL.Host)
	assert.True(t, u.IsHealthy())
}

func TestNewUpstream_InvalidURL(t *testing.T) {
	_, err := NewUpstream("test", "://invalid", DefaultUpstreamConfig())
	assert.Error(t, err)
}

func TestUpstream_CircuitBreaker_Success(t *testing.T) {
	u, err := NewUpstream("test", "http://localhost:8001", DefaultUpstreamConfig())
	require.NoError(t, err)

	resp, err := u.Execute(func() (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusOK}, nil
	})
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestUpstream_CircuitBreaker_Opens(t *testing.T) {
	cfg := UpstreamConfig{
		MaxFailures: 3,
		Timeout:     1 * time.Second,
	}

	u, err := NewUpstream("test", "http://localhost:8001", cfg)
	require.NoError(t, err)

	// Cause 3 consecutive failures to open the circuit
	for i := 0; i < 3; i++ {
		_, err := u.Execute(func() (*http.Response, error) {
			return nil, assert.AnError
		})
		assert.Error(t, err)
	}

	// Circuit should be open now, calls should fail immediately
	_, err = u.Execute(func() (*http.Response, error) {
		t.Fatal("should not reach upstream when circuit is open")
		return nil, nil
	})
	assert.Error(t, err)
}

func TestUpstream_HealthCheck(t *testing.T) {
	// Create a healthy upstream
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	u, err := NewUpstream("test", server.URL, DefaultUpstreamConfig())
	require.NoError(t, err)

	assert.True(t, u.IsHealthy())
}

func TestDefaultUpstreamConfig(t *testing.T) {
	cfg := DefaultUpstreamConfig()
	assert.Equal(t, uint32(5), cfg.MaxFailures)
	assert.Equal(t, 30*time.Second, cfg.Timeout)
}
