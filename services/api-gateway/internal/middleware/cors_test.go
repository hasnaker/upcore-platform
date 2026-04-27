package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCORSMiddleware_PreflightRequest(t *testing.T) {
	handler := CORSMiddleware([]string{"https://app.upcore.io"})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("handler should not be called for preflight")
		}),
	)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.upcore.io")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.Equal(t, "https://app.upcore.io", rec.Header().Get("Access-Control-Allow-Origin"))
	assert.NotEmpty(t, rec.Header().Get("Access-Control-Allow-Methods"))
	assert.NotEmpty(t, rec.Header().Get("Access-Control-Allow-Headers"))
	assert.Equal(t, "86400", rec.Header().Get("Access-Control-Max-Age"))
}

func TestCORSMiddleware_AllowedProdOrigin(t *testing.T) {
	handler := CORSMiddleware([]string{
		"https://app.upcore.io",
		"https://admin.upcore.io",
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "https://app.upcore.io")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "https://app.upcore.io", rec.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_AllowedDevOrigin(t *testing.T) {
	handler := CORSMiddleware(DevCORSOrigins())(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for _, origin := range []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
	} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		assert.Equal(t, origin, rec.Header().Get("Access-Control-Allow-Origin"), "origin %s", origin)
	}
}

func TestCORSMiddleware_DisallowedOrigin(t *testing.T) {
	handler := CORSMiddleware([]string{"https://app.upcore.io"})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}

// TestCORSMiddleware_TenantSubdomainWildcard verifies that *.upcore.io matches
// single-label tenant subdomains (acme.upcore.io) but rejects nested subdomains
// that could be attacker-controlled (evil.attacker.upcore.io.evil).
func TestCORSMiddleware_TenantSubdomainWildcard(t *testing.T) {
	cfg, wildcards, err := LoadCORSConfigFromEnv(
		"https://app.upcore.io,https://*.upcore.io",
		"production",
	)
	require.NoError(t, err)
	require.Len(t, wildcards, 1)

	handler := CORSMiddlewareWithConfig(cfg, wildcards)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	cases := []struct {
		origin string
		want   bool
	}{
		{"https://acme.upcore.io", true},
		{"https://tenant-1.upcore.io", true},
		{"https://A-B-C.upcore.io", true},
		{"https://app.upcore.io", true},                // exact match
		{"https://foo.bar.upcore.io", false},           // nested subdomain rejected
		{"https://attacker.upcore.io.evil.com", false}, // suffix trick
		{"https://evil.com", false},                    // unrelated
		{"http://acme.upcore.io", false},               // http scheme mismatch
	}
	for _, c := range cases {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
		req.Header.Set("Origin", c.origin)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)

		got := rec.Header().Get("Access-Control-Allow-Origin")
		if c.want {
			assert.Equal(t, c.origin, got, "origin %s should be allowed", c.origin)
		} else {
			assert.Empty(t, got, "origin %s must NOT be allowed", c.origin)
		}
	}
}

// TestCORSMiddleware_WildcardWithCredentialsPanics guarantees the startup
// misconfiguration guard for the dangerous "*" + credentials=true combo.
func TestCORSMiddleware_WildcardWithCredentialsPanics(t *testing.T) {
	assert.Panics(t, func() {
		CORSMiddleware([]string{"*"})
	}, "CORSMiddleware(*) with default credentials=true must panic")

	assert.Panics(t, func() {
		cfg := DefaultCORSConfig()
		cfg.AllowedOrigins = []string{"*"}
		cfg.AllowCredentials = true
		CORSMiddlewareWithConfig(cfg, nil)
	}, "CORSMiddlewareWithConfig(*, credentials=true) must panic")
}

// TestLoadCORSConfigFromEnv_PanicsOnWildcardCredentials verifies the env-based
// loader also rejects the dangerous combo.
func TestLoadCORSConfigFromEnv_PanicsOnWildcardCredentials(t *testing.T) {
	assert.Panics(t, func() {
		_, _, _ = LoadCORSConfigFromEnv("*", "production")
	})
}

func TestLoadCORSConfigFromEnv_DevDefault(t *testing.T) {
	cfg, wc, err := LoadCORSConfigFromEnv("", "development")
	require.NoError(t, err)
	assert.Equal(t, DevCORSOrigins(), cfg.AllowedOrigins)
	assert.Empty(t, wc)
}

func TestLoadCORSConfigFromEnv_ProdDefault(t *testing.T) {
	cfg, wc, err := LoadCORSConfigFromEnv("", "production")
	require.NoError(t, err)
	assert.Equal(t, ProdCORSOrigins(), cfg.AllowedOrigins)
	require.Len(t, wc, 1, "prod default must include tenant subdomain wildcard")
	assert.True(t, wc[0].MatchString("https://acme.upcore.io"))
	assert.False(t, wc[0].MatchString("https://foo.bar.upcore.io"))
}

func TestLoadCORSConfigFromEnv_RejectsInvalidPatterns(t *testing.T) {
	// Two wildcards in one pattern is forbidden.
	_, _, err := LoadCORSConfigFromEnv("https://*.*.upcore.io", "production")
	require.Error(t, err)

	// Wildcard must be the leftmost label.
	_, _, err = LoadCORSConfigFromEnv("https://tenant.*.upcore.io", "production")
	require.Error(t, err)

	// Bare wildcard host is forbidden.
	_, _, err = LoadCORSConfigFromEnv("https://*", "production")
	require.Error(t, err)
}

func TestCORSMiddleware_NoOrigin(t *testing.T) {
	handler := CORSMiddleware([]string{"https://app.upcore.io"})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}
