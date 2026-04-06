package config

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadRoutes_Valid(t *testing.T) {
	content := `
routes:
  - path_prefix: "/api/v1/auth"
    upstream: "auth"
    target: "http://auth:8001"
    auth_required: false
    timeout: 30s
    rate_limit:
      per_user: 10
      per_tenant: 100
    methods: ["GET", "POST"]
  - path_prefix: "/api/v1/tenants"
    upstream: "tenant"
    target: "http://tenant:8002"
    auth_required: true
    timeout: 15s
    rate_limit:
      per_user: 100
      per_tenant: 1000
    methods: ["GET", "POST", "PUT", "DELETE"]
`
	tmpFile := writeTemp(t, content)
	routes, err := LoadRoutes(tmpFile)
	require.NoError(t, err)
	assert.Len(t, routes, 2)

	assert.Equal(t, "/api/v1/auth", routes[0].PathPrefix)
	assert.Equal(t, "auth", routes[0].Upstream)
	assert.Equal(t, "http://auth:8001", routes[0].Target)
	assert.False(t, routes[0].AuthRequired)
	assert.Equal(t, 30*time.Second, routes[0].Timeout)
	assert.Equal(t, 10, routes[0].RateLimit.PerUser)
	assert.Equal(t, []string{"GET", "POST"}, routes[0].Methods)

	assert.Equal(t, "/api/v1/tenants", routes[1].PathPrefix)
	assert.True(t, routes[1].AuthRequired)
}

func TestLoadRoutes_DefaultTimeout(t *testing.T) {
	content := `
routes:
  - path_prefix: "/api/v1/test"
    upstream: "test"
    target: "http://test:8001"
    auth_required: true
`
	tmpFile := writeTemp(t, content)
	routes, err := LoadRoutes(tmpFile)
	require.NoError(t, err)
	assert.Equal(t, 30*time.Second, routes[0].Timeout)
}

func TestLoadRoutes_DefaultMethods(t *testing.T) {
	content := `
routes:
  - path_prefix: "/api/v1/test"
    upstream: "test"
    target: "http://test:8001"
    auth_required: true
`
	tmpFile := writeTemp(t, content)
	routes, err := LoadRoutes(tmpFile)
	require.NoError(t, err)
	assert.Len(t, routes[0].Methods, 6)
}

func TestLoadRoutes_EmptyFile(t *testing.T) {
	tmpFile := writeTemp(t, "routes: []")
	_, err := LoadRoutes(tmpFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no routes")
}

func TestLoadRoutes_MissingPathPrefix(t *testing.T) {
	content := `
routes:
  - upstream: "test"
    target: "http://test:8001"
`
	tmpFile := writeTemp(t, content)
	_, err := LoadRoutes(tmpFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "path_prefix")
}

func TestLoadRoutes_MissingTarget(t *testing.T) {
	content := `
routes:
  - path_prefix: "/api/v1/test"
    upstream: "test"
`
	tmpFile := writeTemp(t, content)
	_, err := LoadRoutes(tmpFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "target")
}

func TestLoadRoutes_MissingUpstream(t *testing.T) {
	content := `
routes:
  - path_prefix: "/api/v1/test"
    target: "http://test:8001"
`
	tmpFile := writeTemp(t, content)
	_, err := LoadRoutes(tmpFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "upstream")
}

func TestLoadRoutes_FileNotFound(t *testing.T) {
	_, err := LoadRoutes("/nonexistent/routes.yaml")
	assert.Error(t, err)
}

func TestRouteConfig_Match(t *testing.T) {
	route := RouteConfig{
		PathPrefix: "/api/v1/auth",
		Methods:    []string{"GET", "POST"},
	}

	tests := []struct {
		name   string
		method string
		path   string
		want   bool
	}{
		{"exact path GET", "GET", "/api/v1/auth", true},
		{"sub path GET", "GET", "/api/v1/auth/login", true},
		{"POST method", "POST", "/api/v1/auth/login", true},
		{"wrong method", "DELETE", "/api/v1/auth/login", false},
		{"wrong path", "GET", "/api/v1/tenants", false},
		{"partial prefix", "GET", "/api/v1/au", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			assert.Equal(t, tt.want, route.Match(req))
		})
	}
}

func TestRouteConfig_Match_AllMethods(t *testing.T) {
	route := RouteConfig{
		PathPrefix: "/api/v1/test",
		Methods:    nil, // empty means all methods
	}

	for _, method := range []string{"GET", "POST", "PUT", "DELETE", "PATCH"} {
		req := httptest.NewRequest(method, "/api/v1/test/foo", nil)
		assert.True(t, route.Match(req), "should match %s", method)
	}
}

func TestFindRoute_LongestPrefixMatch(t *testing.T) {
	routes := []RouteConfig{
		{PathPrefix: "/api/v1", Methods: []string{"GET"}},
		{PathPrefix: "/api/v1/auth", Methods: []string{"GET"}},
		{PathPrefix: "/api/v1/auth/login", Methods: []string{"GET"}},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/login", nil)
	route := FindRoute(routes, req)
	require.NotNil(t, route)
	assert.Equal(t, "/api/v1/auth/login", route.PathPrefix)
}

func TestFindRoute_NoMatch(t *testing.T) {
	routes := []RouteConfig{
		{PathPrefix: "/api/v1/auth", Methods: []string{"GET"}},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v2/test", nil)
	route := FindRoute(routes, req)
	assert.Nil(t, route)
}

func writeTemp(t *testing.T, content string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "routes.yaml")
	err := os.WriteFile(path, []byte(content), 0644)
	require.NoError(t, err)
	return path
}
