package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/domain"
)

// OfferListFilter narrows the offer list query.
type OfferListFilter struct {
	TenantID      uuid.UUID
	Status        string
	RequisitionID *uuid.UUID
	CandidateID   *uuid.UUID
	Limit         int
	Offset        int
}

// OfferRepository abstracts persistence for offer letters.
type OfferRepository interface {
	Create(ctx context.Context, o *domain.OfferLetter) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OfferLetter, error)
	Update(ctx context.Context, o *domain.OfferLetter) error
	List(ctx context.Context, f OfferListFilter) ([]*domain.OfferLetter, int, error)
	ExpireDue(ctx context.Context, tenantID uuid.UUID, now time.Time) (int, error)
}

type offerRepo struct {
	db *sqlx.DB
}

// NewOfferRepository constructs an OfferRepository.
func NewOfferRepository(d *sqlx.DB) OfferRepository {
	return &offerRepo{db: d}
}

const offerCols = `id, tenant_id, candidate_id, requisition_id, employee_id,
	ad_soyad, email, position_title, department_id, position_id,
	salary_brut, salary_currency, bonus_annual, stock_options, benefits,
	start_date, expires_at, status,
	sent_at, viewed_at, decided_at, decline_reason, sent_by,
	template_id, pdf_url, payload,
	created_at, updated_at`

const qInsertOffer = `
INSERT INTO app.offer_letters (
	id, tenant_id, candidate_id, requisition_id, employee_id,
	ad_soyad, email, position_title, department_id, position_id,
	salary_brut, salary_currency, bonus_annual, stock_options, benefits,
	start_date, expires_at, status,
	sent_at, viewed_at, decided_at, decline_reason, sent_by,
	template_id, pdf_url, payload,
	created_at, updated_at
) VALUES (
	:id, :tenant_id, :candidate_id, :requisition_id, :employee_id,
	:ad_soyad, :email, :position_title, :department_id, :position_id,
	:salary_brut, :salary_currency, :bonus_annual, :stock_options, :benefits,
	:start_date, :expires_at, :status,
	:sent_at, :viewed_at, :decided_at, :decline_reason, :sent_by,
	:template_id, :pdf_url, :payload,
	:created_at, :updated_at
)`

const qUpdateOffer = `
UPDATE app.offer_letters SET
	candidate_id   = :candidate_id,
	requisition_id = :requisition_id,
	employee_id    = :employee_id,
	ad_soyad       = :ad_soyad,
	email          = :email,
	position_title = :position_title,
	department_id  = :department_id,
	position_id    = :position_id,
	salary_brut    = :salary_brut,
	salary_currency = :salary_currency,
	bonus_annual   = :bonus_annual,
	stock_options  = :stock_options,
	benefits       = :benefits,
	start_date     = :start_date,
	expires_at     = :expires_at,
	status         = :status,
	sent_at        = :sent_at,
	viewed_at      = :viewed_at,
	decided_at     = :decided_at,
	decline_reason = :decline_reason,
	sent_by        = :sent_by,
	template_id    = :template_id,
	pdf_url        = :pdf_url,
	payload        = :payload,
	updated_at     = :updated_at
WHERE id = :id AND tenant_id = :tenant_id`

// Create inserts an offer letter. The caller is responsible for setting tenant RLS.
func (r *offerRepo) Create(ctx context.Context, o *domain.OfferLetter) error {
	o.ApplyDefaults()
	now := time.Now().UTC()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	o.UpdatedAt = now

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := db.SetRLSTenant(ctx, tx, o.TenantID); err != nil {
		return err
	}
	if _, err := tx.NamedExecContext(ctx, qInsertOffer, o); err != nil {
		return fmt.Errorf("insert offer: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// GetByID returns a single offer scoped by tenant.
func (r *offerRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OfferLetter, error) {
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return nil, err
	}

	var o domain.OfferLetter
	q := `SELECT ` + offerCols + ` FROM app.offer_letters WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &o, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOfferNotFound
		}
		return nil, fmt.Errorf("select offer: %w", err)
	}
	return &o, nil
}

// Update persists changes to an offer.
func (r *offerRepo) Update(ctx context.Context, o *domain.OfferLetter) error {
	o.UpdatedAt = time.Now().UTC()
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, o.TenantID); err != nil {
		return err
	}
	res, err := tx.NamedExecContext(ctx, qUpdateOffer, o)
	if err != nil {
		return fmt.Errorf("update offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOfferNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// List returns a filtered page of offers plus the total count.
func (r *offerRepo) List(ctx context.Context, f OfferListFilter) ([]*domain.OfferLetter, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	tx, err := r.db.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, f.TenantID); err != nil {
		return nil, 0, err
	}

	conds := []string{"tenant_id = $1"}
	args := []any{f.TenantID}
	i := 2
	if s := strings.TrimSpace(f.Status); s != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", i))
		args = append(args, s)
		i++
	}
	if f.RequisitionID != nil {
		conds = append(conds, fmt.Sprintf("requisition_id = $%d", i))
		args = append(args, *f.RequisitionID)
		i++
	}
	if f.CandidateID != nil {
		conds = append(conds, fmt.Sprintf("candidate_id = $%d", i))
		args = append(args, *f.CandidateID)
		i++
	}
	where := strings.Join(conds, " AND ")

	var total int
	if err := tx.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.offer_letters WHERE "+where, args...); err != nil {
		return nil, 0, fmt.Errorf("count offers: %w", err)
	}

	q := fmt.Sprintf(
		"SELECT %s FROM app.offer_letters WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		offerCols, where, i, i+1,
	)
	args = append(args, f.Limit, f.Offset)

	out := []*domain.OfferLetter{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list offers: %w", err)
	}
	return out, total, nil
}

// ExpireDue marks all sent/viewed offers whose expires_at has passed as expired.
// Returns the number of rows updated.
func (r *offerRepo) ExpireDue(ctx context.Context, tenantID uuid.UUID, now time.Time) (int, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		return 0, err
	}
	res, err := tx.ExecContext(ctx,
		`UPDATE app.offer_letters
		 SET status = 'expired', decided_at = $2, updated_at = $2
		 WHERE tenant_id = $1 AND status IN ('sent','viewed') AND expires_at < $2`,
		tenantID, now,
	)
	if err != nil {
		return 0, fmt.Errorf("expire offers: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit: %w", err)
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}
