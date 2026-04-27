// Package slack contains the OAuth installation repository, HTTP handlers
// and event-driven glue used by the Slack adapter. The outbound channel
// driver lives in internal/channels/slack.
package slack

import (
	"context"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	channelslack "github.com/upcore/notification/internal/channels/slack"
	"github.com/upcore/notification/internal/domain"
)

// Installation mirrors channels/slack.Installation plus fields only needed
// by admin UI (installed_at, installed_by, scope).
type Installation struct {
	ID                    uuid.UUID
	TenantID              uuid.UUID
	TeamID                string
	TeamName              string
	EnterpriseID          string
	AppID                 string
	BotUserID             string
	AuthedUserID          string
	Scope                 string
	IncomingWebhookURL    string
	IncomingWebhookChan   string
	IncomingWebhookChanID string
	DefaultChannelID      string
	BotToken              string
	KeyVaultRef           string
	AllowDMInterventions  bool
	InstalledBy           uuid.UUID
	InstalledAt           time.Time
	RevokedAt             *time.Time
}

// Repository persists Slack installations and OAuth state tokens.
type Repository struct {
	db        *sqlx.DB
	encryptKK []byte // pgcrypto key — bytes passed as bytea to pgp_sym_encrypt
}

// NewRepository constructs a slack installation repository. The encryptKey
// MUST be a strong random string (>= 32 bytes). When empty, the repository
// will refuse writes (read-only mode). Accepts hex, base64 or a raw string.
func NewRepository(db *sqlx.DB, encryptKey string) (*Repository, error) {
	r := &Repository{db: db}
	if encryptKey == "" {
		return r, nil
	}
	// Accept hex-encoded keys for convenience.
	if b, err := hex.DecodeString(encryptKey); err == nil && len(b) >= 32 {
		r.encryptKK = b
		return r, nil
	}
	if len(encryptKey) < 32 {
		return nil, fmt.Errorf("slack encryption key must be at least 32 bytes")
	}
	r.encryptKK = []byte(encryptKey)
	return r, nil
}

// keyString returns the pgcrypto key as a string acceptable by
// pgp_sym_encrypt(text, text). Using the raw binary KEK as UTF-8 can panic
// on invalid code points; we use hex-encoded form which pgcrypto treats as
// an opaque passphrase.
func (r *Repository) keyString() string {
	if len(r.encryptKK) == 0 {
		return ""
	}
	return hex.EncodeToString(r.encryptKK)
}

// ErrNoEncryptionKey indicates the repository cannot perform writes.
var ErrNoEncryptionKey = errors.New("slack repo: encryption key not configured")

// SaveInstallation upserts an installation row. Bot token + webhook URL are
// encrypted with pgp_sym_encrypt before persisting.
func (r *Repository) SaveInstallation(ctx context.Context, inst *Installation) error {
	if r.keyString() == "" {
		return ErrNoEncryptionKey
	}
	const q = `
INSERT INTO slack_installations (
    tenant_id, team_id, team_name, enterprise_id, app_id, bot_user_id, authed_user_id, scope,
    incoming_webhook_url, incoming_webhook_channel, incoming_webhook_channel_id, default_channel_id,
    bot_token_encrypted, key_vault_ref, allow_dm_interventions, installed_by, installed_at, revoked_at
) VALUES (
    $1, $2, $3, NULLIF($4, ''), $5, $6, $7, $8,
    CASE WHEN $9 = '' THEN NULL ELSE pgp_sym_encrypt($9::text, $15) END,
    NULLIF($10, ''), NULLIF($11, ''), NULLIF($12, ''),
    pgp_sym_encrypt($13::text, $15), NULLIF($14, ''), $16, $17, NOW(), NULL
)
ON CONFLICT (tenant_id, team_id) DO UPDATE SET
    team_name = EXCLUDED.team_name,
    enterprise_id = EXCLUDED.enterprise_id,
    app_id = EXCLUDED.app_id,
    bot_user_id = EXCLUDED.bot_user_id,
    authed_user_id = EXCLUDED.authed_user_id,
    scope = EXCLUDED.scope,
    incoming_webhook_url = EXCLUDED.incoming_webhook_url,
    incoming_webhook_channel = EXCLUDED.incoming_webhook_channel,
    incoming_webhook_channel_id = EXCLUDED.incoming_webhook_channel_id,
    default_channel_id = EXCLUDED.default_channel_id,
    bot_token_encrypted = EXCLUDED.bot_token_encrypted,
    key_vault_ref = EXCLUDED.key_vault_ref,
    installed_by = EXCLUDED.installed_by,
    installed_at = EXCLUDED.installed_at,
    revoked_at = NULL,
    updated_at = NOW()
`
	_, err := r.db.ExecContext(ctx, q,
		inst.TenantID, inst.TeamID, inst.TeamName, inst.EnterpriseID,
		inst.AppID, inst.BotUserID, inst.AuthedUserID, inst.Scope,
		inst.IncomingWebhookURL, inst.IncomingWebhookChan, inst.IncomingWebhookChanID, inst.DefaultChannelID,
		inst.BotToken, inst.KeyVaultRef, r.keyString(), inst.AllowDMInterventions, inst.InstalledBy,
	)
	if err != nil {
		return fmt.Errorf("save slack install: %w", err)
	}
	return nil
}

// GetActiveForTenant returns the active install for a tenant, or nil when
// none exists. Returns domain.ErrNotFound if the row is missing, and a
// decrypted bot token.
func (r *Repository) GetActiveForTenant(ctx context.Context, tenantID uuid.UUID) (*channelslack.Installation, error) {
	if r.keyString() == "" {
		return nil, ErrNoEncryptionKey
	}
	const q = `
SELECT id, tenant_id, team_id, team_name,
       COALESCE(default_channel_id, '')                AS default_channel_id,
       COALESCE(incoming_webhook_channel, '')          AS incoming_webhook_channel,
       COALESCE(incoming_webhook_channel_id, '')       AS incoming_webhook_channel_id,
       COALESCE(pgp_sym_decrypt(incoming_webhook_url, $2)::text, '') AS incoming_webhook_url,
       pgp_sym_decrypt(bot_token_encrypted, $2)::text  AS bot_token,
       allow_dm_interventions
  FROM slack_installations
 WHERE tenant_id = $1 AND revoked_at IS NULL
 ORDER BY installed_at DESC
 LIMIT 1`

	var row struct {
		ID                  uuid.UUID `db:"id"`
		TenantID            uuid.UUID `db:"tenant_id"`
		TeamID              string    `db:"team_id"`
		TeamName            string    `db:"team_name"`
		DefaultChanID       string    `db:"default_channel_id"`
		WebhookChan         string    `db:"incoming_webhook_channel"`
		WebhookChanID       string    `db:"incoming_webhook_channel_id"`
		WebhookURL          string    `db:"incoming_webhook_url"`
		BotToken            string    `db:"bot_token"`
		AllowDMInterventions bool     `db:"allow_dm_interventions"`
	}
	if err := r.db.GetContext(ctx, &row, q, tenantID, r.keyString()); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetch slack install: %w", err)
	}
	return &channelslack.Installation{
		ID:                    row.ID,
		TenantID:              row.TenantID,
		TeamID:                row.TeamID,
		TeamName:              row.TeamName,
		BotToken:              row.BotToken,
		IncomingWebhookURL:    row.WebhookURL,
		IncomingWebhookChan:   row.WebhookChan,
		IncomingWebhookChanID: row.WebhookChanID,
		DefaultChannelID:      row.DefaultChanID,
		AllowDMInterventions:  row.AllowDMInterventions,
	}, nil
}

// GetForAdmin returns the full installation record (sans bot token) for the
// admin UI status endpoint.
func (r *Repository) GetForAdmin(ctx context.Context, tenantID uuid.UUID) (*Installation, error) {
	const q = `
SELECT id, tenant_id, team_id, team_name,
       COALESCE(enterprise_id, '')              AS enterprise_id,
       app_id, bot_user_id, authed_user_id, scope,
       COALESCE(incoming_webhook_channel, '')   AS incoming_webhook_channel,
       COALESCE(incoming_webhook_channel_id,'') AS incoming_webhook_channel_id,
       COALESCE(default_channel_id, '')         AS default_channel_id,
       COALESCE(key_vault_ref, '')              AS key_vault_ref,
       allow_dm_interventions, installed_by, installed_at, revoked_at
  FROM slack_installations
 WHERE tenant_id = $1 AND revoked_at IS NULL
 ORDER BY installed_at DESC
 LIMIT 1`
	var row struct {
		ID                    uuid.UUID  `db:"id"`
		TenantID              uuid.UUID  `db:"tenant_id"`
		TeamID                string     `db:"team_id"`
		TeamName              string     `db:"team_name"`
		EnterpriseID          string     `db:"enterprise_id"`
		AppID                 string     `db:"app_id"`
		BotUserID             string     `db:"bot_user_id"`
		AuthedUserID          string     `db:"authed_user_id"`
		Scope                 string     `db:"scope"`
		WebhookChan           string     `db:"incoming_webhook_channel"`
		WebhookChanID         string     `db:"incoming_webhook_channel_id"`
		DefaultChanID         string     `db:"default_channel_id"`
		KeyVaultRef           string     `db:"key_vault_ref"`
		AllowDMInterventions  bool       `db:"allow_dm_interventions"`
		InstalledBy           uuid.UUID  `db:"installed_by"`
		InstalledAt           time.Time  `db:"installed_at"`
		RevokedAt             *time.Time `db:"revoked_at"`
	}
	if err := r.db.GetContext(ctx, &row, q, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("fetch slack install (admin): %w", err)
	}
	return &Installation{
		ID:                    row.ID,
		TenantID:              row.TenantID,
		TeamID:                row.TeamID,
		TeamName:              row.TeamName,
		EnterpriseID:          row.EnterpriseID,
		AppID:                 row.AppID,
		BotUserID:             row.BotUserID,
		AuthedUserID:          row.AuthedUserID,
		Scope:                 row.Scope,
		IncomingWebhookChan:   row.WebhookChan,
		IncomingWebhookChanID: row.WebhookChanID,
		DefaultChannelID:      row.DefaultChanID,
		KeyVaultRef:           row.KeyVaultRef,
		AllowDMInterventions:  row.AllowDMInterventions,
		InstalledBy:           row.InstalledBy,
		InstalledAt:           row.InstalledAt,
		RevokedAt:             row.RevokedAt,
	}, nil
}

// RevokeInstallation marks the install as revoked. The row is preserved for
// audit purposes; bot token ciphertext remains so it can be inspected only
// with the KEK.
func (r *Repository) RevokeInstallation(ctx context.Context, tenantID uuid.UUID) error {
	const q = `
UPDATE slack_installations
   SET revoked_at = NOW(), updated_at = NOW()
 WHERE tenant_id = $1 AND revoked_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, tenantID)
	if err != nil {
		return fmt.Errorf("revoke slack install: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// SetAllowDMInterventions toggles the KVKK opt-in flag.
func (r *Repository) SetAllowDMInterventions(ctx context.Context, tenantID uuid.UUID, allow bool) error {
	const q = `
UPDATE slack_installations
   SET allow_dm_interventions = $2, updated_at = NOW()
 WHERE tenant_id = $1 AND revoked_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, tenantID, allow)
	if err != nil {
		return fmt.Errorf("toggle allow_dm_interventions: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// PutOAuthState stores a short-lived state value for OAuth CSRF protection.
func (r *Repository) PutOAuthState(ctx context.Context, state string, tenantID, userID uuid.UUID, redirectTo string, ttl time.Duration) error {
	const q = `
INSERT INTO slack_oauth_states (state, tenant_id, user_id, redirect_to, expires_at)
VALUES ($1, $2, $3, NULLIF($4, ''), NOW() + $5::interval)
ON CONFLICT (state) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at`
	_, err := r.db.ExecContext(ctx, q, state, tenantID, userID, redirectTo, fmt.Sprintf("%d seconds", int(ttl.Seconds())))
	if err != nil {
		return fmt.Errorf("put oauth state: %w", err)
	}
	return nil
}

// ConsumeOAuthState loads and deletes the state row, returning not-found
// errors when the state is missing, expired or already consumed.
func (r *Repository) ConsumeOAuthState(ctx context.Context, state string) (tenantID, userID uuid.UUID, redirectTo string, err error) {
	const q = `
DELETE FROM slack_oauth_states
 WHERE state = $1
RETURNING tenant_id, user_id, COALESCE(redirect_to, '')::text, expires_at`
	var (
		tid       uuid.UUID
		uid       uuid.UUID
		redirect  string
		expiresAt time.Time
	)
	row := r.db.QueryRowxContext(ctx, q, state)
	if err := row.Scan(&tid, &uid, &redirect, &expiresAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, uuid.Nil, "", domain.ErrNotFound
		}
		return uuid.Nil, uuid.Nil, "", fmt.Errorf("consume oauth state: %w", err)
	}
	if time.Now().UTC().After(expiresAt) {
		return uuid.Nil, uuid.Nil, "", domain.ErrNotFound
	}
	return tid, uid, redirect, nil
}

// ResolveSlackUserID maps an internal user to a Slack user ID (per team).
func (r *Repository) ResolveSlackUserID(ctx context.Context, tenantID, userID uuid.UUID, _ string) (string, error) {
	const q = `
SELECT slack_user_id
  FROM slack_user_map
 WHERE tenant_id = $1 AND user_id = $2
 ORDER BY updated_at DESC
 LIMIT 1`
	var slackUID string
	if err := r.db.GetContext(ctx, &slackUID, q, tenantID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return slackUID, nil
}

// UpsertSlackUserMap stores an internal-user → slack-user mapping.
func (r *Repository) UpsertSlackUserMap(ctx context.Context, tenantID, userID uuid.UUID, teamID, slackUserID, email string) error {
	if strings.TrimSpace(slackUserID) == "" || strings.TrimSpace(teamID) == "" {
		return nil
	}
	const q = `
INSERT INTO slack_user_map (tenant_id, user_id, team_id, slack_user_id, email)
VALUES ($1, $2, $3, $4, NULLIF($5, ''))
ON CONFLICT (tenant_id, user_id, team_id) DO UPDATE SET
    slack_user_id = EXCLUDED.slack_user_id,
    email = EXCLUDED.email,
    updated_at = NOW()`
	_, err := r.db.ExecContext(ctx, q, tenantID, userID, teamID, slackUserID, email)
	return err
}

// PurgeExpiredOAuthStates deletes expired CSRF state rows.
func (r *Repository) PurgeExpiredOAuthStates(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM slack_oauth_states WHERE expires_at < NOW()`)
	return err
}
