// Package middleware provides HTTP middleware for the billing service.
//
// billing historically used a lightweight tenantHeaderPassthrough in
// cmd/main.go; this file adds the standardised TenantDBBinder contract so
// the service participates in the P0 RLS chain alongside the other 16 Go
// services.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// TenantDBBinder — packages/go/tenantdb bridge. billing reads the tenant
// from the gateway-signed X-Tenant-ID header (never from a session cookie)
// so we parse it inline.
func TenantDBBinder(
	bind func(ctx context.Context, tenantID, userID uuid.UUID) context.Context,
) func(http.Handler) http.Handler {
	if bind == nil {
		panic("middleware: TenantDBBinder requires a non-nil bind function")
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tidStr := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
			if tidStr == "" {
				next.ServeHTTP(w, r)
				return
			}
			tid, err := uuid.Parse(tidStr)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			uid, _ := uuid.Parse(strings.TrimSpace(r.Header.Get("X-User-ID")))
			ctx := bind(r.Context(), tid, uid)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
