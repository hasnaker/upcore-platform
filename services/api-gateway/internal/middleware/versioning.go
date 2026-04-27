package middleware

import (
	"context"
	"net/http"
	"strings"
)

// CtxAPIVersion holds the resolved API version in request context.
type ctxAPIVersionKey struct{}

// APIVersions — supported versions. Older versions still served but
// response includes a "Deprecation" header per RFC 8594.
var APIVersions = struct {
	Current    string
	Supported  []string
	Deprecated []string
}{
	Current:    "2026-04",
	Supported:  []string{"2026-04", "2026-01", "2025-10"},
	Deprecated: []string{"2025-10"},
}

// APIVersioningMiddleware resolves the requested version from the
// Accept-Version header and adds Deprecation/Sunset headers when applicable.
func APIVersioningMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requested := strings.TrimSpace(r.Header.Get("Accept-Version"))
			if requested == "" {
				requested = APIVersions.Current
			}
			if !isSupported(requested) {
				http.Error(w,
					"Requested API version not supported. Supported: "+
						strings.Join(APIVersions.Supported, ", "),
					http.StatusNotAcceptable)
				return
			}
			w.Header().Set("X-API-Version", requested)
			w.Header().Set("X-API-Version-Current", APIVersions.Current)
			if isDeprecated(requested) {
				w.Header().Set("Deprecation", "true")
				w.Header().Set("Sunset", "Wed, 01 Jan 2027 00:00:00 GMT")
				w.Header().Set("Link",
					"<https://docs.upcore.app/api/changelog>; rel=\"deprecation\"")
			}
			ctx := context.WithValue(r.Context(), ctxAPIVersionKey{}, requested)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// APIVersionFromContext returns the resolved API version.
func APIVersionFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(ctxAPIVersionKey{}).(string); ok {
		return v
	}
	return APIVersions.Current
}

func isSupported(v string) bool {
	for _, s := range APIVersions.Supported {
		if s == v {
			return true
		}
	}
	return false
}

func isDeprecated(v string) bool {
	for _, s := range APIVersions.Deprecated {
		if s == v {
			return true
		}
	}
	return false
}
