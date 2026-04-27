// Package apikeys provides CRUD + generation for tenant-owned public API keys.
// Key format: upc_live_<14 hex>. Full key shown once at creation; only hash
// stored in DB (bcrypt). Lookup via key_prefix (first 16 chars).
package apikeys

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// Service wraps DB CRUD.
type Service struct {
	DB *sqlx.DB
}

// New constructs a Service.
func New(db *sqlx.DB) *Service { return &Service{DB: db} }

// APIKey is the public view of an app.api_keys row (sans key_hash).
type APIKey struct {
	ID                uuid.UUID      `db:"id" json:"id"`
	TenantID          uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	Label             string         `db:"label" json:"label"`
	KeyPrefix         string         `db:"key_prefix" json:"key_prefix"`
	Scopes            pq.StringArray `db:"scopes" json:"scopes"`
	RateLimitPerMin   int            `db:"rate_limit_per_minute" json:"rate_limit_per_minute"`
	LastUsedAt        *time.Time     `db:"last_used_at" json:"last_used_at,omitempty"`
	RevokedAt         *time.Time     `db:"revoked_at" json:"revoked_at,omitempty"`
	ExpiresAt         *time.Time     `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt         time.Time      `db:"created_at" json:"created_at"`
}

// Create generates a new key and persists the bcrypt hash. Returns the
// DB row + the full key (shown only this one time).
func (s *Service) Create(ctx context.Context, tenantID uuid.UUID, label string, scopes []string, rateLimit int, expiresAt *time.Time, createdBy uuid.UUID) (*APIKey, string, error) {
	buf := make([]byte, 14)
	if _, err := rand.Read(buf); err != nil {
		return nil, "", err
	}
	full := "upc_live_" + hex.EncodeToString(buf)
	prefix := full[:16] // "upc_live_" (9) + first 7 hex
	hash, err := bcrypt.GenerateFromPassword([]byte(full), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}
	if rateLimit <= 0 {
		rateLimit = 60
	}
	var k APIKey
	err = s.DB.GetContext(ctx, &k,
		`INSERT INTO app.api_keys (tenant_id, label, key_prefix, key_hash, scopes, rate_limit_per_minute, expires_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id, tenant_id, label, key_prefix, scopes, rate_limit_per_minute, last_used_at, revoked_at, expires_at, created_at`,
		tenantID, label, prefix, hash, pq.Array(scopes), rateLimit, expiresAt, createdBy)
	if err != nil {
		return nil, "", fmt.Errorf("insert key: %w", err)
	}
	return &k, full, nil
}

// List returns the tenant's non-revoked keys (hash hidden).
func (s *Service) List(ctx context.Context, tenantID uuid.UUID) ([]*APIKey, error) {
	out := []*APIKey{}
	if err := s.DB.SelectContext(ctx, &out,
		`SELECT id, tenant_id, label, key_prefix, scopes, rate_limit_per_minute,
		        last_used_at, revoked_at, expires_at, created_at
		 FROM app.api_keys
		 WHERE tenant_id=$1
		 ORDER BY created_at DESC`, tenantID); err != nil {
		return nil, err
	}
	return out, nil
}

// Revoke marks the key as revoked (cannot be un-revoked).
func (s *Service) Revoke(ctx context.Context, tenantID, id uuid.UUID) error {
	_, err := s.DB.ExecContext(ctx,
		`UPDATE app.api_keys SET revoked_at=NOW() WHERE tenant_id=$1 AND id=$2 AND revoked_at IS NULL`,
		tenantID, id)
	return err
}

// Handler exposes HTTP CRUD.
type Handler struct{ Svc *Service }

// NewHandler constructs.
func NewHandler(svc *Service) *Handler { return &Handler{Svc: svc} }

// Register wires routes onto a chi subrouter.
func (h *Handler) Register(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Delete("/{id}", h.Revoke)
}

func tenantID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(r.Header.Get("X-Tenant-ID"))
	return id
}
func userID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(r.Header.Get("X-User-ID"))
	return id
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// List GET /api-keys
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	out, err := h.Svc.List(r.Context(), tid)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"items": out})
}

// Create POST /api-keys — body: {label, scopes[], rate_limit?, expires_at?}
// Response includes full "key" — tek seferlik gösterim.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		Label     string     `json:"label"`
		Scopes    []string   `json:"scopes"`
		RateLimit int        `json:"rate_limit_per_minute"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if body.Label == "" {
		writeJSON(w, 400, map[string]string{"error": "label_required"})
		return
	}
	key, full, err := h.Svc.Create(r.Context(), tid, body.Label, body.Scopes, body.RateLimit, body.ExpiresAt, userID(r))
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, map[string]any{
		"key":     full,
		"warning": "Bu tam anahtar yalnızca bir kez gösterilir. Güvenli bir yerde saklayın.",
		"item":    key,
	})
}

// Revoke DELETE /api-keys/{id}
func (h *Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if err := h.Svc.Revoke(r.Context(), tid, id); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}
