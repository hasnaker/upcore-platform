package middleware

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

// CORSConfig holds CORS configuration.
type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	AllowCredentials bool
	MaxAge           int
}

// DefaultCORSConfig returns sensible CORS defaults.
// IMPORTANT: AllowedOrigins defaults to an EMPTY list. Callers MUST provide
// an explicit whitelist via CORS_ALLOWED_ORIGINS env (see LoadCORSConfigFromEnv).
// Wildcard "*" combined with AllowCredentials=true is a CSRF/account-takeover
// vector (browsers reject it, server-side callers do not) and is rejected at
// startup by LoadCORSConfigFromEnv.
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		AllowedOrigins: []string{},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Accept",
			"Authorization",
			"Content-Type",
			"X-Correlation-Id",
			"X-Tenant-Id",
			"X-Request-ID",
		},
		ExposedHeaders: []string{
			"X-Correlation-Id",
			"X-Request-ID",
			"X-RateLimit-Limit",
			"X-RateLimit-Remaining",
			"X-RateLimit-Reset",
		},
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	}
}

// DevCORSOrigins returns the canonical local-development origin whitelist.
// Used when CORS_ALLOWED_ORIGINS is unset AND APP_ENV=dev|development|local.
func DevCORSOrigins() []string {
	return []string{
		"http://localhost:3000",
		"http://localhost:3001",
		"http://localhost:3002",
	}
}

// ProdCORSOrigins returns the canonical production origin whitelist for upcore.io.
// Tenant subdomains are matched via the wildcard pattern returned by
// ProdCORSWildcardPatterns (e.g. https://acme.upcore.io).
func ProdCORSOrigins() []string {
	return []string{
		"https://upcore.io",
		"https://www.upcore.io",
		"https://app.upcore.io",
		"https://admin.upcore.io",
		"https://status.upcore.io",
		"https://docs.upcore.io",
	}
}

// ProdCORSWildcardPatterns returns the tenant-subdomain wildcard patterns that
// should be accepted in production. Each entry uses "*" as the single-label
// wildcard (https://*.upcore.io). LoadCORSConfigFromEnv converts these into
// strict regexes that reject multi-label matches (no *.evil.upcore.io.attacker).
func ProdCORSWildcardPatterns() []string {
	return []string{"https://*.upcore.io"}
}

// LoadCORSConfigFromEnv builds a CORSConfig from environment.
//
// Inputs:
//   - originsCSV: value of CORS_ALLOWED_ORIGINS env (comma-separated).
//     Entries may be exact origins (https://app.upcore.io) or single-label
//     wildcards (https://*.upcore.io). A literal "*" is rejected.
//   - appEnv: value of APP_ENV (dev|development|local|staging|production).
//     Used to pick sane defaults when originsCSV is empty.
//
// Guarantees:
//   - Returns a non-empty AllowedOrigins or a non-nil patterns slice.
//   - Panics if AllowCredentials=true is requested together with a literal "*"
//     origin. This is a startup misconfiguration guard — the combination
//     allows arbitrary cross-site credentialed requests.
//   - Normalises origins to lowercase and strips trailing slashes.
//
// The returned WildcardPatterns are compiled regexes produced from patterns
// like "https://*.upcore.io" → "^https://[A-Za-z0-9][A-Za-z0-9-]{0,62}\.upcore\.io$".
// The leading label must be a valid DNS label and cannot contain dots, so
// nested-subdomain bypasses are rejected.
func LoadCORSConfigFromEnv(originsCSV, appEnv string) (CORSConfig, []*regexp.Regexp, error) {
	cfg := DefaultCORSConfig()

	raw := strings.TrimSpace(originsCSV)
	var exactOrigins []string
	var wildcardPatterns []string

	if raw == "" {
		// Fall back to environment defaults.
		env := strings.ToLower(strings.TrimSpace(appEnv))
		switch env {
		case "", "dev", "development", "local", "test":
			exactOrigins = DevCORSOrigins()
		case "staging", "stage", "preview":
			exactOrigins = ProdCORSOrigins()
			wildcardPatterns = ProdCORSWildcardPatterns()
		case "prod", "production":
			exactOrigins = ProdCORSOrigins()
			wildcardPatterns = ProdCORSWildcardPatterns()
		default:
			exactOrigins = ProdCORSOrigins()
			wildcardPatterns = ProdCORSWildcardPatterns()
		}
	} else {
		for _, part := range strings.Split(raw, ",") {
			o := strings.ToLower(strings.TrimRight(strings.TrimSpace(part), "/"))
			if o == "" {
				continue
			}
			if o == "*" {
				if cfg.AllowCredentials {
					// Misconfiguration guard: wildcard + credentials = CSRF wide open.
					panic("cors: AllowedOrigins='*' combined with AllowCredentials=true is forbidden " +
						"(CSRF / account takeover). Set CORS_ALLOWED_ORIGINS to an explicit whitelist.")
				}
				// Wildcard without credentials is allowed but strongly discouraged.
				exactOrigins = []string{"*"}
				break
			}
			if strings.Contains(o, "*") {
				wildcardPatterns = append(wildcardPatterns, o)
				continue
			}
			exactOrigins = append(exactOrigins, o)
		}
	}

	cfg.AllowedOrigins = exactOrigins

	// Compile wildcard patterns into strict regexes.
	compiled := make([]*regexp.Regexp, 0, len(wildcardPatterns))
	for _, pat := range wildcardPatterns {
		re, err := compileOriginPattern(pat)
		if err != nil {
			return cfg, nil, fmt.Errorf("invalid cors wildcard pattern %q: %w", pat, err)
		}
		compiled = append(compiled, re)
	}

	if len(cfg.AllowedOrigins) == 0 && len(compiled) == 0 {
		return cfg, nil, fmt.Errorf("cors: no allowed origins configured (set CORS_ALLOWED_ORIGINS)")
	}

	return cfg, compiled, nil
}

// compileOriginPattern converts "https://*.upcore.io" into a strict regex that
// matches exactly one DNS label in place of the *. "*" is a single-label
// wildcard; "**" or bare "*" are rejected.
func compileOriginPattern(pattern string) (*regexp.Regexp, error) {
	// Must be scheme://host form, all lowercase at this point.
	if !strings.HasPrefix(pattern, "http://") && !strings.HasPrefix(pattern, "https://") {
		return nil, fmt.Errorf("origin must start with http:// or https://")
	}
	if strings.Count(pattern, "*") != 1 {
		return nil, fmt.Errorf("exactly one * allowed per pattern")
	}
	// Scheme portion must be literal.
	schemeEnd := strings.Index(pattern, "://") + 3
	scheme := pattern[:schemeEnd]
	host := pattern[schemeEnd:]
	if host == "*" {
		return nil, fmt.Errorf("bare wildcard host is forbidden")
	}
	// Only allow wildcard as the *leftmost* label (e.g. "*.upcore.io").
	if !strings.HasPrefix(host, "*.") {
		return nil, fmt.Errorf("wildcard must be the leftmost label (e.g. https://*.upcore.io)")
	}
	rest := host[2:] // drop "*."
	if strings.Contains(rest, "*") {
		return nil, fmt.Errorf("only one wildcard per pattern")
	}
	// Build regex. The leftmost label must be a valid DNS label: 1-63 chars,
	// start alnum, contain alnum/hyphen. It cannot contain a dot — so
	// foo.bar.upcore.io does NOT match *.upcore.io.
	labelRE := `[A-Za-z0-9](?:[A-Za-z0-9-]{0,62})`
	pattern = "^" + regexp.QuoteMeta(scheme) + labelRE + `\.` + regexp.QuoteMeta(rest) + "$"
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}
	return re, nil
}

// CORSMiddleware handles Cross-Origin Resource Sharing preflight and headers.
// Backwards-compatible entry point: accepts an explicit exact-origin list (no
// wildcard patterns). For production deployments, prefer CORSMiddlewareWithConfig
// which accepts compiled wildcard patterns for tenant subdomains.
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	cfg := DefaultCORSConfig()
	if len(allowedOrigins) > 0 {
		// Startup guard: reject "*" + credentials even via legacy callers.
		for _, o := range allowedOrigins {
			if strings.TrimSpace(o) == "*" && cfg.AllowCredentials {
				panic("cors: AllowedOrigins='*' combined with AllowCredentials=true is forbidden " +
					"(CSRF / account takeover). Set CORS_ALLOWED_ORIGINS to an explicit whitelist.")
			}
		}
		cfg.AllowedOrigins = allowedOrigins
	}
	return CORSMiddlewareWithConfig(cfg, nil)
}

// CORSMiddlewareWithConfig returns a CORS middleware that enforces the given
// config plus a set of pre-compiled tenant-subdomain wildcard patterns.
func CORSMiddlewareWithConfig(cfg CORSConfig, wildcardPatterns []*regexp.Regexp) func(http.Handler) http.Handler {
	originSet := make(map[string]bool, len(cfg.AllowedOrigins))
	allowAll := false
	for _, o := range cfg.AllowedOrigins {
		if o == "*" {
			allowAll = true
			continue
		}
		originSet[strings.ToLower(strings.TrimRight(strings.TrimSpace(o), "/"))] = true
	}
	// Double-check: wildcard + credentials must never ship.
	if allowAll && cfg.AllowCredentials {
		panic("cors: AllowedOrigins='*' combined with AllowCredentials=true is forbidden " +
			"(CSRF / account takeover). Set CORS_ALLOWED_ORIGINS to an explicit whitelist.")
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			normalised := strings.ToLower(strings.TrimRight(origin, "/"))

			allowed := false
			if origin != "" {
				if allowAll {
					allowed = true
				} else if originSet[normalised] {
					allowed = true
				} else {
					for _, re := range wildcardPatterns {
						if re.MatchString(normalised) {
							allowed = true
							break
						}
					}
				}
			}

			if allowed {
				if allowAll && !cfg.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				} else {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
				if cfg.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
				w.Header().Set("Access-Control-Expose-Headers", strings.Join(cfg.ExposedHeaders, ", "))
			}

			// Preflight
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				w.Header().Set("Access-Control-Allow-Methods", strings.Join(cfg.AllowedMethods, ", "))
				w.Header().Set("Access-Control-Allow-Headers", strings.Join(cfg.AllowedHeaders, ", "))
				w.Header().Set("Access-Control-Max-Age", "86400")
				w.Header().Set("Vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			w.Header().Add("Vary", "Origin")
			next.ServeHTTP(w, r)
		})
	}
}
