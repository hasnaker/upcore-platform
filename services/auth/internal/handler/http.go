package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/upcore/auth/internal/config"
	appmw "github.com/upcore/auth/internal/middleware"
	"github.com/upcore/auth/internal/rbac"
	"github.com/upcore/auth/internal/service"
)

// Deps is the bundle of dependencies handlers need.
type Deps struct {
	Cfg            *config.Config
	AuthService    *service.AuthService
	SessionService *service.SessionService
	Policy         *rbac.Policy
	JWTValidator   appmw.JWTValidator
	WebhookHandler *WebhookHandler
}

// Router builds the chi router with all routes.
func Router(d *Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(appmw.RequestLogger)
	r.Use(appmw.Recover)
	r.Use(chimw.Timeout(d.Cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   d.Cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public endpoints
	r.Get("/health", handleHealth)
	r.Get("/ready", handleReady)
	r.Post("/webhooks/clerk", d.WebhookHandler.Handle)

	// Protected API (v1)
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Use(appmw.RequireJWT(d.JWTValidator))
		r.Use(appmw.RequireTenant)

		r.Get("/me", MakeGetMe(d.AuthService))
		r.Get("/check", MakeCheckPermission(d.Policy))
		r.Post("/check", MakeCheckPermission(d.Policy))

		// Sessions
		r.Get("/sessions/current", MakeCurrentSession(d.SessionService))
		r.Get("/sessions", MakeListSessions(d.SessionService))
		r.Delete("/sessions", MakeRevokeAllSessions(d.SessionService))
		r.Delete("/sessions/{id}", MakeRevokeSession(d.SessionService))

		// Users
		r.Get("/users/me", MakeGetMe(d.AuthService))

		// SSO bağlantı testi (onboarding Step6 + ayarlar/sso) — discovery
		// doğrulaması + userinfo probe. Tenant izolasyonu gerektirmez.
		r.Post("/sso/test", MakeSSOTest())
	})

	return r
}

// SetupRouter is a convenience for cmd/main.go.
func SetupRouter(d *Deps) http.Handler { return Router(d) }

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"timestamp": time.Now().UTC(),
	})
}

func handleReady(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ready"})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}
