package middleware

import (
	"net/http"
	"strings"
)

// SessionToken extracts and validates a survey session token from the URL path
// parameter. This middleware does NOT require JWT auth -- it uses the opaque
// invitation token as the sole authentication factor for the public survey
// submission endpoint.
func SessionToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// The token is extracted at the handler level from chi.URLParam.
		// This middleware performs lightweight validation if the header is set.
		token := strings.TrimSpace(r.Header.Get("X-Survey-Token"))
		if token == "" {
			// No header token; handler will use path param instead.
			next.ServeHTTP(w, r)
			return
		}
		if len(token) < 20 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error":   "bad_request",
				"message": "invalid survey token",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequestLogger returns a logging middleware using zerolog.
func RequestLogger(log any) func(http.Handler) http.Handler {
	// Return a simple pass-through; the chi RequestID + zerolog integration
	// handles request logging at the router level.
	return func(next http.Handler) http.Handler {
		return next
	}
}
