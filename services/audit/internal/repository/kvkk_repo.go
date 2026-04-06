package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// KVKKRepository abstracts persistence for KVKK access logs.
type KVKKRepository interface {
	Log(ctx context.Context, l *domain.KVKKAccessLog) error
	ListBySubject(ctx context.Context, tenantID, subjectID uuid.UUID) ([]*domain.KVKKAccessLog, error)
	ListByAccessor(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.KVKKAccessLog, error)
	QueryByLegalBasis(ctx context.Context, tenantID uuid.UUID, basis string, from, to time.Time) ([]*domain.KVKKAccessLog, error)
	GetDistinctCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error)
	GetDistinctPurposes(ctx context.Context, tenantID uuid.UUID) ([]string, error)
	GetDistinctLegalBases(ctx context.Context, tenantID uuid.UUID) ([]string, error)
	CountByLegalBasis(ctx context.Context, tenantID uuid.UUID) (map[string]int, error)
	CountByCategory(ctx context.Context, tenantID uuid.UUID) (map[string]int, error)
	CountTotal(ctx context.Context, tenantID uuid.UUID) (int, error)
}

type kvkkRepo struct {
	db *sqlx.DB
}

// NewKVKKRepository constructs a KVKKRepository backed by sqlx.
func NewKVKKRepository(db *sqlx.DB) KVKKRepository {
	return &kvkkRepo{db: db}
}

// Log inserts a KVKK access log entry.
func (r *kvkkRepo) Log(ctx context.Context, l *domain.KVKKAccessLog) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	if l.AccessedAt.IsZero() {
		l.AccessedAt = time.Now().UTC()
	}

	const q = `
		INSERT INTO kvkk_access_log (
			id, tenant_id, data_subject_id, data_subject_email, accessor_user_id,
			accessor_role, purpose, legal_basis, data_categories, accessed_at,
			ip_address, consent_ref
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)`
	_, err := r.db.ExecContext(ctx, q,
		l.ID, l.TenantID, l.DataSubjectID, l.DataSubjectEmail, l.AccessorUserID,
		l.AccessorRole, l.Purpose, l.LegalBasis, l.DataCategories, l.AccessedAt,
		l.IPAddress, l.ConsentRef,
	)
	if err != nil {
		return fmt.Errorf("insert kvkk access log: %w", err)
	}
	return nil
}

// ListBySubject returns all access logs for a given data subject.
func (r *kvkkRepo) ListBySubject(ctx context.Context, tenantID, subjectID uuid.UUID) ([]*domain.KVKKAccessLog, error) {
	const q = `
		SELECT * FROM kvkk_access_log
		WHERE tenant_id = $1 AND data_subject_id = $2
		ORDER BY accessed_at DESC
		LIMIT 500`
	var logs []*domain.KVKKAccessLog
	if err := r.db.SelectContext(ctx, &logs, q, tenantID, subjectID); err != nil {
		return nil, fmt.Errorf("list kvkk by subject: %w", err)
	}
	return logs, nil
}

// ListByAccessor returns all access logs for a given accessor user.
func (r *kvkkRepo) ListByAccessor(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.KVKKAccessLog, error) {
	const q = `
		SELECT * FROM kvkk_access_log
		WHERE tenant_id = $1 AND accessor_user_id = $2
		ORDER BY accessed_at DESC
		LIMIT 500`
	var logs []*domain.KVKKAccessLog
	if err := r.db.SelectContext(ctx, &logs, q, tenantID, userID); err != nil {
		return nil, fmt.Errorf("list kvkk by accessor: %w", err)
	}
	return logs, nil
}

// QueryByLegalBasis returns access logs filtered by legal basis within a time range.
func (r *kvkkRepo) QueryByLegalBasis(ctx context.Context, tenantID uuid.UUID, basis string, from, to time.Time) ([]*domain.KVKKAccessLog, error) {
	const q = `
		SELECT * FROM kvkk_access_log
		WHERE tenant_id = $1 AND legal_basis = $2 AND accessed_at >= $3 AND accessed_at <= $4
		ORDER BY accessed_at DESC
		LIMIT 500`
	var logs []*domain.KVKKAccessLog
	if err := r.db.SelectContext(ctx, &logs, q, tenantID, basis, from, to); err != nil {
		return nil, fmt.Errorf("query kvkk by legal basis: %w", err)
	}
	return logs, nil
}

// GetDistinctCategories returns unique data categories across all access logs for a tenant.
func (r *kvkkRepo) GetDistinctCategories(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
	const q = `
		SELECT DISTINCT unnest(data_categories) AS cat
		FROM kvkk_access_log WHERE tenant_id = $1
		ORDER BY cat`
	var cats []string
	if err := r.db.SelectContext(ctx, &cats, q, tenantID); err != nil {
		return nil, fmt.Errorf("distinct categories: %w", err)
	}
	return cats, nil
}

// GetDistinctPurposes returns unique purposes.
func (r *kvkkRepo) GetDistinctPurposes(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
	const q = `SELECT DISTINCT purpose FROM kvkk_access_log WHERE tenant_id = $1 ORDER BY purpose`
	var vals []string
	if err := r.db.SelectContext(ctx, &vals, q, tenantID); err != nil {
		return nil, fmt.Errorf("distinct purposes: %w", err)
	}
	return vals, nil
}

// GetDistinctLegalBases returns unique legal bases.
func (r *kvkkRepo) GetDistinctLegalBases(ctx context.Context, tenantID uuid.UUID) ([]string, error) {
	const q = `SELECT DISTINCT legal_basis FROM kvkk_access_log WHERE tenant_id = $1 ORDER BY legal_basis`
	var vals []string
	if err := r.db.SelectContext(ctx, &vals, q, tenantID); err != nil {
		return nil, fmt.Errorf("distinct legal bases: %w", err)
	}
	return vals, nil
}

// CountByLegalBasis returns a map of legal_basis -> count.
func (r *kvkkRepo) CountByLegalBasis(ctx context.Context, tenantID uuid.UUID) (map[string]int, error) {
	const q = `SELECT legal_basis AS key, COUNT(*) AS count FROM kvkk_access_log WHERE tenant_id = $1 GROUP BY legal_basis`
	return r.countMap(ctx, q, tenantID)
}

// CountByCategory returns a map of data_category -> count.
func (r *kvkkRepo) CountByCategory(ctx context.Context, tenantID uuid.UUID) (map[string]int, error) {
	const q = `SELECT unnest(data_categories) AS key, COUNT(*) AS count FROM kvkk_access_log WHERE tenant_id = $1 GROUP BY key`
	return r.countMap(ctx, q, tenantID)
}

// CountTotal returns total access log entries for a tenant.
func (r *kvkkRepo) CountTotal(ctx context.Context, tenantID uuid.UUID) (int, error) {
	const q = `SELECT COUNT(*) FROM kvkk_access_log WHERE tenant_id = $1`
	var n int
	if err := r.db.GetContext(ctx, &n, q, tenantID); err != nil {
		return 0, fmt.Errorf("count total: %w", err)
	}
	return n, nil
}

func (r *kvkkRepo) countMap(ctx context.Context, q string, tenantID uuid.UUID) (map[string]int, error) {
	type row struct {
		Key   string `db:"key"`
		Count int    `db:"count"`
	}
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, tenantID); err != nil {
		return nil, err
	}
	m := make(map[string]int, len(rows))
	for _, r := range rows {
		m[r.Key] = r.Count
	}
	return m, nil
}
