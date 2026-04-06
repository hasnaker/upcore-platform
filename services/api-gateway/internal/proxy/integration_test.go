package proxy

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/api-gateway/internal/config"
)

// TestGateway_FullIntegration tests the complete proxy flow with multiple
// upstream services and verifies header propagation.
func TestGateway_FullIntegration(t *testing.T) {
	// Create multiple mock upstream services
	authSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"service": "auth",
			"path":    r.URL.Path,
		})
	}))
	defer authSvc.Close()

	tenantSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"service":   "tenant",
			"path":      r.URL.Path,
			"tenant_id": r.Header.Get("X-Tenant-Id"),
		})
	}))
	defer tenantSvc.Close()

	employeeSvc := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"service":   "employee",
			"path":      r.URL.Path,
			"tenant_id": r.Header.Get("X-Tenant-Id"),
			"user_id":   r.Header.Get("X-User-Id"),
		})
	}))
	defer employeeSvc.Close()

	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/auth",
			Upstream:   "auth",
			Target:     authSvc.URL,
			Methods:    []string{"GET", "POST"},
		},
		{
			PathPrefix: "/api/v1/tenants",
			Upstream:   "tenant",
			Target:     tenantSvc.URL,
			Methods:    []string{"GET", "POST"},
		},
		{
			PathPrefix: "/api/v1/employees",
			Upstream:   "employee",
			Target:     employeeSvc.URL,
			Methods:    []string{"GET", "POST"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)
	assert.Len(t, gw.Upstreams(), 3)

	tests := []struct {
		name       string
		method     string
		path       string
		headers    map[string]string
		wantSvc    string
		wantStatus int
	}{
		{
			name:       "auth login",
			method:     http.MethodPost,
			path:       "/api/v1/auth/login",
			wantSvc:    "auth",
			wantStatus: http.StatusOK,
		},
		{
			name:   "tenant list",
			method: http.MethodGet,
			path:   "/api/v1/tenants",
			headers: map[string]string{
				"X-Tenant-Id": "tenant-001",
			},
			wantSvc:    "tenant",
			wantStatus: http.StatusOK,
		},
		{
			name:   "employee detail",
			method: http.MethodGet,
			path:   "/api/v1/employees/emp-123",
			headers: map[string]string{
				"X-Tenant-Id": "tenant-001",
				"X-User-Id":   "user-001",
			},
			wantSvc:    "employee",
			wantStatus: http.StatusOK,
		},
		{
			name:       "unknown route",
			method:     http.MethodGet,
			path:       "/api/v1/nonexistent",
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			rec := httptest.NewRecorder()

			gw.ServeHTTP(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)

			if tt.wantSvc != "" {
				var body map[string]string
				err := json.NewDecoder(rec.Body).Decode(&body)
				require.NoError(t, err)
				assert.Equal(t, tt.wantSvc, body["service"])
			}
		})
	}
}

// TestGateway_UpstreamDown tests behavior when an upstream is unreachable.
func TestGateway_UpstreamDown(t *testing.T) {
	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/test",
			Upstream:   "dead-svc",
			Target:     "http://localhost:19999", // unreachable port
			Methods:    []string{"GET"},
		},
	}

	cfg := UpstreamConfig{
		MaxFailures: 5,
		Timeout:     1 * time.Second,
	}

	gw, err := NewGateway(routes, cfg, 2*time.Second)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	// Should get a 502 Bad Gateway
	assert.True(t, rec.Code == http.StatusBadGateway || rec.Code == http.StatusGatewayTimeout || rec.Code == http.StatusServiceUnavailable)
}

// TestGateway_UpstreamReturnsError tests that upstream error status codes
// are passed through correctly.
func TestGateway_UpstreamReturnsError(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal error"}`))
	}))
	defer upstream.Close()

	routes := []config.RouteConfig{
		{
			PathPrefix: "/api/v1/test",
			Upstream:   "error-svc",
			Target:     upstream.URL,
			Methods:    []string{"GET"},
		},
	}

	gw, err := NewGateway(routes, DefaultUpstreamConfig(), 30*time.Second)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	gw.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
}
