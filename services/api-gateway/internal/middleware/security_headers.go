package middleware

import "net/http"

// SecurityHeadersMiddleware enforces defense-in-depth HTTP headers on every
// response. Azure Front Door önünde duplike edilmesi önemli değil, idempotent.
//
// - Strict-Transport-Security: 2 yıl HSTS + preload
// - X-Content-Type-Options: MIME sniff koruması
// - X-Frame-Options: clickjacking koruması (gateway = API, UI değil → DENY)
// - Referrer-Policy: cross-origin referer sızdırmama
// - Permissions-Policy: tarayıcı özellikleri kapalı
// - Cross-Origin-Opener-Policy: Spectre isolation
// - X-DNS-Prefetch-Control: performans
//
// Not: CSP burada set edilmiyor — frontend tarafında (Next.js) çok daha
// granüler tanımlanıyor. Gateway yalnızca API cevapları döner.
func SecurityHeadersMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "no-referrer")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
			h.Set("Cross-Origin-Opener-Policy", "same-origin")
			h.Set("X-DNS-Prefetch-Control", "on")
			// API responses asla cache'lenmemeli (JWT token içerebilir).
			h.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
			h.Set("Pragma", "no-cache")
			next.ServeHTTP(w, r)
		})
	}
}
