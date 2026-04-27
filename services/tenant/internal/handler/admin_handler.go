package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// AdminHandler covers migrations 045+046+047 admin endpoints:
//   - /webhooks         (webhook_subscriptions CRUD)
//   - /api-keys         (api_keys CRUD — bcrypt hash + scope)
//   - /admin/feature-flags   (feature_flags tenant override)
//   - /admin/export-jobs     (tenant_export_jobs trigger + status)
//   - /admin/impersonation   (admin_impersonation_sessions start/end)
type AdminHandler struct {
	DB *sqlx.DB
}

// NewAdminHandler constructs.
func NewAdminHandler(db *sqlx.DB) *AdminHandler { return &AdminHandler{DB: db} }

// Register wires all admin endpoints on a subrouter.
func (h *AdminHandler) Register(r chi.Router) {
	r.Route("/webhooks", func(r chi.Router) {
		r.Get("/", h.ListWebhooks)
		r.Post("/", h.CreateWebhook)
		r.Delete("/{id}", h.DeleteWebhook)
	})
	r.Route("/api-keys", func(r chi.Router) {
		r.Get("/", h.ListAPIKeys)
		r.Post("/", h.CreateAPIKey)
		r.Delete("/{id}", h.RevokeAPIKey)
	})
	r.Route("/admin", func(r chi.Router) {
		r.Get("/feature-flags", h.ListFeatureFlags)
		r.Put("/feature-flags", h.UpsertFeatureFlag)
		r.Post("/export-jobs", h.CreateExportJob)
		r.Get("/export-jobs", h.ListExportJobs)
		r.Post("/impersonation", h.StartImpersonation)
		r.Post("/impersonation/{id}/end", h.EndImpersonation)
	})
}

func adminTenantID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(r.Header.Get("X-Tenant-ID")))
	return id
}

func adminUserID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(r.Header.Get("X-User-ID")))
	return id
}

func adminWriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// --- Webhook subscriptions ---

type webhookView struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	Name         string     `db:"name" json:"name"`
	TargetURL    string     `db:"target_url" json:"target_url"`
	EventTypes   pq.StringArray `db:"event_types" json:"event_types"`
	Active       bool       `db:"active" json:"active"`
	FailureCount int        `db:"failure_count" json:"failure_count"`
	LastSuccessAt *time.Time `db:"last_success_at" json:"last_success_at,omitempty"`
	LastFailureAt *time.Time `db:"last_failure_at" json:"last_failure_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
}

// ListWebhooks GET /webhooks
func (h *AdminHandler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	out := []webhookView{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT id, name, target_url, event_types, active, failure_count,
		        last_success_at, last_failure_at, created_at
		 FROM app.webhook_subscriptions WHERE tenant_id=$1 ORDER BY created_at DESC`, tid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"items": out})
}

// CreateWebhook POST /webhooks — body: {name, target_url, event_types[], secret?}
func (h *AdminHandler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	uid := adminUserID(r)
	var body struct {
		Name       string   `json:"name"`
		TargetURL  string   `json:"target_url"`
		EventTypes []string `json:"event_types"`
		Secret     string   `json:"secret"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if body.Secret == "" {
		body.Secret = uuid.New().String()
	}
	var id uuid.UUID
	if err := h.DB.GetContext(r.Context(), &id,
		`INSERT INTO app.webhook_subscriptions
		 (tenant_id, name, target_url, event_types, secret, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		tid, body.Name, body.TargetURL, pq.Array(body.EventTypes), body.Secret, uid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 201, map[string]any{"id": id, "secret": body.Secret})
}

// DeleteWebhook DELETE /webhooks/{id} — soft deactivate.
func (h *AdminHandler) DeleteWebhook(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.webhook_subscriptions SET active=FALSE, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`, tid, id); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"ok": true})
}

// --- API keys (delegates to gateway-level keys table) ---

type apiKeyView struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	Label           string         `db:"label" json:"label"`
	KeyPrefix       string         `db:"key_prefix" json:"key_prefix"`
	Scopes          pq.StringArray `db:"scopes" json:"scopes"`
	RateLimitPerMin int            `db:"rate_limit_per_minute" json:"rate_limit_per_minute"`
	LastUsedAt      *time.Time     `db:"last_used_at" json:"last_used_at,omitempty"`
	RevokedAt       *time.Time     `db:"revoked_at" json:"revoked_at,omitempty"`
	ExpiresAt       *time.Time     `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt       time.Time      `db:"created_at" json:"created_at"`
}

// ListAPIKeys GET /api-keys
func (h *AdminHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	out := []apiKeyView{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT id, label, key_prefix, scopes, rate_limit_per_minute,
		        last_used_at, revoked_at, expires_at, created_at
		 FROM app.api_keys WHERE tenant_id=$1 ORDER BY created_at DESC`, tid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"items": out})
}

// CreateAPIKey POST /api-keys — delegates to gateway apikeys package would
// require cross-service import; here we generate via placeholder (dev ok).
// Production: route through gateway admin API.
func (h *AdminHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	adminWriteJSON(w, 501, map[string]string{
		"error": "not_implemented_here",
		"message": "Use gateway /api/v1/api-keys for key generation (bcrypt stays gateway-side)",
	})
}

// RevokeAPIKey DELETE /api-keys/{id}
func (h *AdminHandler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.api_keys SET revoked_at=NOW() WHERE tenant_id=$1 AND id=$2 AND revoked_at IS NULL`,
		tid, id); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"ok": true})
}

// --- Feature flags ---

type featureFlagView struct {
	FlagKey     string `db:"flag_key" json:"flag_key"`
	Enabled     bool   `db:"enabled" json:"enabled"`
	RolloutPct  *int   `db:"rollout_pct" json:"rollout_pct,omitempty"`
	Description *string `db:"description" json:"description,omitempty"`
}

// ListFeatureFlags GET /admin/feature-flags — tenant override + global defaults.
func (h *AdminHandler) ListFeatureFlags(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	out := []featureFlagView{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT DISTINCT ON (flag_key) flag_key, enabled, rollout_pct, description
		 FROM app.feature_flags
		 WHERE tenant_id=$1 OR tenant_id IS NULL
		 ORDER BY flag_key, tenant_id NULLS LAST`, tid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"items": out})
}

// UpsertFeatureFlag PUT /admin/feature-flags — body: {flag_key, enabled, rollout_pct?}
func (h *AdminHandler) UpsertFeatureFlag(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	uid := adminUserID(r)
	var body struct {
		FlagKey    string `json:"flag_key"`
		Enabled    bool   `json:"enabled"`
		RolloutPct *int   `json:"rollout_pct"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO app.feature_flags (tenant_id, flag_key, enabled, rollout_pct, updated_by)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (tenant_id, flag_key)
		 DO UPDATE SET enabled=EXCLUDED.enabled, rollout_pct=EXCLUDED.rollout_pct,
		               updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
		tid, body.FlagKey, body.Enabled, body.RolloutPct, uid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"ok": true})
}

// --- Export jobs ---

type exportJobView struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	Scope           string     `db:"scope" json:"scope"`
	Status          string     `db:"status" json:"status"`
	OutputBlobURL   *string    `db:"output_blob_url" json:"output_blob_url,omitempty"`
	OutputSizeBytes *int64     `db:"output_size_bytes" json:"output_size_bytes,omitempty"`
	ExpiresAt       *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	CompletedAt     *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
}

// CreateExportJob POST /admin/export-jobs — queues a tenant export.
func (h *AdminHandler) CreateExportJob(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	uid := adminUserID(r)
	var body struct {
		Scope           string     `json:"scope"`
		KVKKSubjectID   *uuid.UUID `json:"kvkk_subject_id"`
		Format          string     `json:"format"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil && err.Error() != "EOF" {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if body.Scope == "" {
		body.Scope = "full"
	}
	if body.Format == "" {
		body.Format = "zip"
	}
	var id uuid.UUID
	if err := h.DB.GetContext(r.Context(), &id,
		`INSERT INTO app.tenant_export_jobs
		 (tenant_id, requested_by, scope, kvkk_subject_id, format, status)
		 VALUES ($1, $2, $3, $4, $5, 'queued')
		 RETURNING id`,
		tid, uid, body.Scope, body.KVKKSubjectID, body.Format); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 202, map[string]any{"id": id, "status": "queued"})
}

// ListExportJobs GET /admin/export-jobs
func (h *AdminHandler) ListExportJobs(w http.ResponseWriter, r *http.Request) {
	tid := adminTenantID(r)
	out := []exportJobView{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT id, scope, status, output_blob_url, output_size_bytes,
		        expires_at, completed_at, created_at
		 FROM app.tenant_export_jobs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`,
		tid); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"items": out})
}

// --- Admin impersonation ---

// StartImpersonation POST /admin/impersonation
// Body: {target_tenant_id, target_user_id, reason}
// Security: requires upcore-internal admin role (assumed verified upstream).
func (h *AdminHandler) StartImpersonation(w http.ResponseWriter, r *http.Request) {
	adminID := adminUserID(r)
	if adminID == uuid.Nil {
		adminWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		TargetTenantID uuid.UUID `json:"target_tenant_id"`
		TargetUserID   uuid.UUID `json:"target_user_id"`
		Reason         string    `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if strings.TrimSpace(body.Reason) == "" {
		adminWriteJSON(w, 400, map[string]string{"error": "reason_required"})
		return
	}
	ipAddr := r.Header.Get("X-Forwarded-For")
	if ipAddr == "" {
		ipAddr = r.RemoteAddr
	}
	var id uuid.UUID
	if err := h.DB.GetContext(r.Context(), &id,
		`INSERT INTO app.admin_impersonation_sessions
		 (admin_user_id, target_tenant_id, target_user_id, reason, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5::inet, $6)
		 RETURNING id`,
		adminID, body.TargetTenantID, body.TargetUserID, body.Reason, ipAddr, r.UserAgent()); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 201, map[string]any{"session_id": id})
}

// EndImpersonation POST /admin/impersonation/{id}/end
func (h *AdminHandler) EndImpersonation(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		adminWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.admin_impersonation_sessions SET ended_at=NOW()
		 WHERE id=$1 AND ended_at IS NULL`, id); err != nil {
		adminWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	adminWriteJSON(w, 200, map[string]any{"ok": true})
}
