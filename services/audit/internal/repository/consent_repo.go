package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// ConsentRepository persists KVKK çalışan rıza kayıtları.
type ConsentRepository interface {
	// ListByUser returns all current consents for a user (one row per type/version).
	ListByUser(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.DataConsent, error)

	// GetLatest returns the latest consent row for (tenant, user, type) across
	// all versions; NotFound if the user never touched it.
	GetLatest(ctx context.Context, tenantID, userID uuid.UUID, consentType domain.ConsentType) (*domain.DataConsent, error)

	// Upsert writes a granted/declined/revoked decision for (tenant, user, type, version).
	// Existing row for the same (tenant, user, type, version) is UPDATEd, which
	// fires the DB trigger that appends to consent_history.
	Upsert(ctx context.Context, c *domain.DataConsent) error

	// ListHistory returns audit trail rows for a user + consent type, newest first.
	ListHistory(ctx context.Context, tenantID, userID uuid.UUID, consentType domain.ConsentType) ([]*domain.ConsentHistoryEntry, error)
}

type consentRepo struct {
	db *sqlx.DB
}

// NewConsentRepository constructs a ConsentRepository backed by sqlx.
func NewConsentRepository(db *sqlx.DB) ConsentRepository {
	return &consentRepo{db: db}
}

// ListByUser — retains only the latest version per consent_type (ordered DESC).
func (r *consentRepo) ListByUser(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.DataConsent, error) {
	const q = `
        SELECT DISTINCT ON (consent_type)
               id, tenant_id, user_id, consent_type, version, status,
               accepted_at, host(ip_addr) AS ip_addr, user_agent, metadata,
               created_at, updated_at
          FROM app.data_consents
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY consent_type, version DESC`
	rows := []*domain.DataConsent{}
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, userID); err != nil {
		return nil, fmt.Errorf("list consents by user: %w", err)
	}
	return rows, nil
}

// GetLatest — highest version for (tenant, user, type).
func (r *consentRepo) GetLatest(ctx context.Context, tenantID, userID uuid.UUID, consentType domain.ConsentType) (*domain.DataConsent, error) {
	const q = `
        SELECT id, tenant_id, user_id, consent_type, version, status,
               accepted_at, host(ip_addr) AS ip_addr, user_agent, metadata,
               created_at, updated_at
          FROM app.data_consents
         WHERE tenant_id = $1 AND user_id = $2 AND consent_type = $3
         ORDER BY version DESC
         LIMIT 1`
	out := &domain.DataConsent{}
	err := r.db.GetContext(ctx, out, q, tenantID, userID, consentType)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get consent latest: %w", err)
	}
	return out, nil
}

// Upsert — single round-trip; fires the history trigger.
func (r *consentRepo) Upsert(ctx context.Context, c *domain.DataConsent) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Metadata == nil {
		c.Metadata = domain.JSONMap{}
	}

	const q = `
        INSERT INTO app.data_consents (
            id, tenant_id, user_id, consent_type, version, status,
            accepted_at, ip_addr, user_agent, metadata
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::inet, $9, $10
        )
        ON CONFLICT (tenant_id, user_id, consent_type, version) DO UPDATE
           SET status      = EXCLUDED.status,
               accepted_at = COALESCE(EXCLUDED.accepted_at, app.data_consents.accepted_at),
               ip_addr     = EXCLUDED.ip_addr,
               user_agent  = EXCLUDED.user_agent,
               metadata    = EXCLUDED.metadata,
               updated_at  = now()
        RETURNING id, created_at, updated_at`

	ip := ""
	if c.IPAddr != nil {
		ip = *c.IPAddr
	}
	ua := ""
	if c.UserAgent != nil {
		ua = *c.UserAgent
	}
	metaBytes, err := c.Metadata.Value()
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}

	row := r.db.QueryRowxContext(ctx, q,
		c.ID, c.TenantID, c.UserID, c.ConsentType, c.Version, c.Status,
		c.AcceptedAt, ip, ua, metaBytes,
	)
	var (
		outID     uuid.UUID
		createdAt sql.NullTime
		updatedAt sql.NullTime
	)
	if err := row.Scan(&outID, &createdAt, &updatedAt); err != nil {
		return fmt.Errorf("upsert consent: %w", err)
	}
	c.ID = outID
	if createdAt.Valid {
		c.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		c.UpdatedAt = updatedAt.Time
	}
	return nil
}

// ListHistory — user-specific audit trail ordered newest-first.
func (r *consentRepo) ListHistory(ctx context.Context, tenantID, userID uuid.UUID, consentType domain.ConsentType) ([]*domain.ConsentHistoryEntry, error) {
	const q = `
        SELECT id, tenant_id, consent_id, user_id, consent_type, version,
               previous_status, new_status, change_reason,
               host(ip_addr) AS ip_addr, user_agent, metadata, changed_at
          FROM app.consent_history
         WHERE tenant_id = $1 AND user_id = $2 AND consent_type = $3
         ORDER BY changed_at DESC
         LIMIT 500`
	rows := []*domain.ConsentHistoryEntry{}
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, userID, consentType); err != nil {
		return nil, fmt.Errorf("list consent history: %w", err)
	}
	return rows, nil
}
