package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// MLObjectionRepository persists KVKK Madde 22 objections against ML predictions.
type MLObjectionRepository interface {
	Create(ctx context.Context, o *domain.MLObjection) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.MLObjection, error)
	Update(ctx context.Context, o *domain.MLObjection) error
	List(ctx context.Context, filter domain.MLObjectionFilter) ([]*domain.MLObjection, int, error)
	ListOverdue(ctx context.Context, tenantID uuid.UUID) ([]*domain.MLObjection, error)

	// UpholdAndRetract atomically transitions the objection to completed with
	// outcome=upheld, stamps prediction_retracted_at=now(), and updates the
	// corresponding ml_predictions_audit row (retracted_at, retracted_by,
	// retraction_reason, retraction_objection_id). Returns the updated
	// objection on success.
	UpholdAndRetract(ctx context.Context, input UpholdInput) (*domain.MLObjection, error)

	// DismissWithDPO transitions the objection to completed with
	// outcome=dismissed after verifying that a DPO signature is supplied.
	// The DB trigger validate_ml_objection_dpo also enforces this at the
	// storage layer.
	DismissWithDPO(ctx context.Context, input DismissInput) (*domain.MLObjection, error)
}

// UpholdInput carries arguments for UpholdAndRetract.
type UpholdInput struct {
	TenantID           uuid.UUID
	ObjectionID        uuid.UUID
	ReviewerUserID     uuid.UUID
	ResolutionNote     string
	ReviewerIP         string
	ReviewerUserAgent  string
}

// DismissInput carries arguments for DismissWithDPO.
type DismissInput struct {
	TenantID          uuid.UUID
	ObjectionID       uuid.UUID
	ReviewerUserID    uuid.UUID
	DPOUserID         uuid.UUID
	RejectionReason   string
	ReviewerIP        string
	ReviewerUserAgent string
}

type mlObjectionRepo struct {
	db *sqlx.DB
}

// NewMLObjectionRepository constructs a sqlx-backed MLObjectionRepository.
func NewMLObjectionRepository(db *sqlx.DB) MLObjectionRepository {
	return &mlObjectionRepo{db: db}
}

const mlObjectionColumns = `
	id, tenant_id, user_id, prediction_id, reason, contact_email,
	status, rejection_reason, resolution_note, reviewer_user_id,
	objected_at, reviewed_at, completed_at, created_at,
	resolution_outcome, dpo_user_id, dpo_signed_at,
	prediction_retracted_at, reviewer_ip::text AS reviewer_ip, reviewer_ua
`

func (r *mlObjectionRepo) Create(ctx context.Context, o *domain.MLObjection) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	now := time.Now().UTC()
	if o.ObjectedAt.IsZero() {
		o.ObjectedAt = now
	}
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	if o.Status == "" {
		o.Status = domain.MLObjectionStatusReceived
	}
	const q = `
		INSERT INTO app.ml_objections (
			id, tenant_id, user_id, prediction_id, reason, contact_email,
			status, objected_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
	`
	_, err := r.db.ExecContext(ctx, q,
		o.ID, o.TenantID, o.UserID, o.PredictionID, o.Reason, o.ContactEmail,
		o.Status, o.ObjectedAt, o.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert ml_objection: %w", err)
	}
	return nil
}

func (r *mlObjectionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.MLObjection, error) {
	q := `SELECT ` + mlObjectionColumns + ` FROM app.ml_objections WHERE id = $1 AND tenant_id = $2`
	var o domain.MLObjection
	if err := r.db.GetContext(ctx, &o, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get ml_objection: %w", err)
	}
	return &o, nil
}

func (r *mlObjectionRepo) Update(ctx context.Context, o *domain.MLObjection) error {
	const q = `
		UPDATE app.ml_objections
		   SET status = $1, rejection_reason = $2, resolution_note = $3,
		       reviewer_user_id = $4, reviewed_at = $5, completed_at = $6,
		       updated_at = now()
		 WHERE id = $7 AND tenant_id = $8
	`
	res, err := r.db.ExecContext(ctx, q,
		o.Status, o.RejectionReason, o.ResolutionNote,
		o.ReviewerUserID, o.ReviewedAt, o.CompletedAt,
		o.ID, o.TenantID,
	)
	if err != nil {
		return fmt.Errorf("update ml_objection: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *mlObjectionRepo) List(ctx context.Context, filter domain.MLObjectionFilter) ([]*domain.MLObjection, int, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit <= 0 || limit > 200 {
		limit = 20
	}
	args := []any{filter.TenantID}
	where := "tenant_id = $1"
	if filter.Status != "" {
		args = append(args, filter.Status)
		where += fmt.Sprintf(" AND status = $%d", len(args))
	}
	if filter.UserID != uuid.Nil {
		args = append(args, filter.UserID)
		where += fmt.Sprintf(" AND user_id = $%d", len(args))
	}
	if filter.Overdue {
		where += " AND status NOT IN ('completed','rejected') AND objected_at < now() - interval '30 days'"
	}

	countQuery := "SELECT COUNT(*) FROM app.ml_objections WHERE " + where
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, fmt.Errorf("count ml_objections: %w", err)
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, limit, (page-1)*limit)
	listQuery := "SELECT " + mlObjectionColumns +
		" FROM app.ml_objections WHERE " + where +
		fmt.Sprintf(" ORDER BY objected_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	var items []*domain.MLObjection
	if err := r.db.SelectContext(ctx, &items, listQuery, listArgs...); err != nil {
		return nil, 0, fmt.Errorf("list ml_objections: %w", err)
	}
	return items, total, nil
}

func (r *mlObjectionRepo) ListOverdue(ctx context.Context, tenantID uuid.UUID) ([]*domain.MLObjection, error) {
	const q = `
		SELECT ` + mlObjectionColumns + `
		  FROM app.ml_objections
		 WHERE tenant_id = $1
		   AND status NOT IN ('completed','rejected')
		   AND objected_at < now() - interval '30 days'
		 ORDER BY objected_at ASC
	`
	var items []*domain.MLObjection
	if err := r.db.SelectContext(ctx, &items, q, tenantID); err != nil {
		return nil, fmt.Errorf("list overdue ml_objections: %w", err)
	}
	return items, nil
}

// UpholdAndRetract executes the full "itiraz haklı" path transactionally:
//
//  1. Move the objection to completed + resolution_outcome=upheld,
//     prediction_retracted_at=now().
//  2. Update the ml_predictions_audit row: retracted_at, retracted_by,
//     retraction_reason (= "user objection upheld"),
//     retraction_objection_id (= objection id), review_outcome='overturned'.
//
// Downstream services (intervention, notification) consume
// ml.prediction.retracted.v1 and reverse their recommendations.
func (r *mlObjectionRepo) UpholdAndRetract(ctx context.Context, input UpholdInput) (*domain.MLObjection, error) {
	if input.TenantID == uuid.Nil || input.ObjectionID == uuid.Nil || input.ReviewerUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: tenant, objection and reviewer ids required", domain.ErrInvalidInput)
	}
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin uphold tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// Lock the current row to prevent concurrent resolve.
	var current domain.MLObjection
	selForUpdate := `SELECT ` + mlObjectionColumns + ` FROM app.ml_objections
	                 WHERE id=$1 AND tenant_id=$2 FOR UPDATE`
	if err := tx.GetContext(ctx, &current, selForUpdate, input.ObjectionID, input.TenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("lock ml_objection: %w", err)
	}
	if current.Status == domain.MLObjectionStatusCompleted || current.Status == domain.MLObjectionStatusRejected {
		return nil, fmt.Errorf("%w: objection already finalised", domain.ErrInvalidTransition)
	}

	// 1) Update the objection.
	const updObj = `
		UPDATE app.ml_objections
		   SET status = 'completed',
		       resolution_outcome = 'upheld',
		       resolution_note = $1,
		       reviewer_user_id = $2,
		       reviewed_at = COALESCE(reviewed_at, now()),
		       completed_at = now(),
		       prediction_retracted_at = now(),
		       reviewer_ip = NULLIF($3,'')::inet,
		       reviewer_ua = NULLIF($4,''),
		       updated_at = now()
		 WHERE id = $5 AND tenant_id = $6
		 RETURNING ` + mlObjectionColumns
	var updated domain.MLObjection
	if err := tx.GetContext(ctx, &updated, updObj,
		input.ResolutionNote, input.ReviewerUserID,
		input.ReviewerIP, input.ReviewerUserAgent,
		input.ObjectionID, input.TenantID,
	); err != nil {
		return nil, fmt.Errorf("uphold objection: %w", err)
	}

	// 2) Retract the prediction (linked by prediction_id).
	const retractPred = `
		UPDATE app.ml_predictions_audit
		   SET retracted_at = now(),
		       retracted_by = $1,
		       retraction_reason = $2,
		       retraction_objection_id = $3,
		       review_outcome = 'overturned',
		       reviewed_at = now(),
		       reviewer_user_id = $1,
		       updated_at = now()
		 WHERE id = $4 AND tenant_id = $5
		   AND retracted_at IS NULL
	`
	res, err := tx.ExecContext(ctx, retractPred,
		input.ReviewerUserID,
		"user objection upheld (KVKK m.22)",
		input.ObjectionID,
		current.PredictionID, input.TenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("retract prediction: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// Prediction row missing or already retracted — still proceed but log via error
		// so the service layer can detect.
		return nil, fmt.Errorf("%w: prediction not found or already retracted", domain.ErrNotFound)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit uphold tx: %w", err)
	}
	return &updated, nil
}

// DismissWithDPO records a rejection with DPO sign-off.
func (r *mlObjectionRepo) DismissWithDPO(ctx context.Context, input DismissInput) (*domain.MLObjection, error) {
	if input.TenantID == uuid.Nil || input.ObjectionID == uuid.Nil ||
		input.ReviewerUserID == uuid.Nil || input.DPOUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: tenant, objection, reviewer and DPO ids required", domain.ErrInvalidInput)
	}
	if input.RejectionReason == "" {
		return nil, fmt.Errorf("%w: rejection_reason required", domain.ErrInvalidInput)
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin dismiss tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	var current domain.MLObjection
	selForUpdate := `SELECT ` + mlObjectionColumns + ` FROM app.ml_objections
	                 WHERE id=$1 AND tenant_id=$2 FOR UPDATE`
	if err := tx.GetContext(ctx, &current, selForUpdate, input.ObjectionID, input.TenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("lock ml_objection: %w", err)
	}
	if current.Status == domain.MLObjectionStatusCompleted || current.Status == domain.MLObjectionStatusRejected {
		return nil, fmt.Errorf("%w: objection already finalised", domain.ErrInvalidTransition)
	}

	const updObj = `
		UPDATE app.ml_objections
		   SET status = 'rejected',
		       resolution_outcome = 'dismissed',
		       rejection_reason = $1,
		       reviewer_user_id = $2,
		       dpo_user_id = $3,
		       dpo_signed_at = now(),
		       reviewed_at = COALESCE(reviewed_at, now()),
		       completed_at = now(),
		       reviewer_ip = NULLIF($4,'')::inet,
		       reviewer_ua = NULLIF($5,''),
		       updated_at = now()
		 WHERE id = $6 AND tenant_id = $7
		 RETURNING ` + mlObjectionColumns
	var updated domain.MLObjection
	if err := tx.GetContext(ctx, &updated, updObj,
		input.RejectionReason, input.ReviewerUserID, input.DPOUserID,
		input.ReviewerIP, input.ReviewerUserAgent,
		input.ObjectionID, input.TenantID,
	); err != nil {
		return nil, fmt.Errorf("dismiss objection: %w", err)
	}

	// Also mark the prediction as reviewed + upheld (the prediction stays in
	// place; the review outcome is "upheld"=model was right).
	const markReviewed = `
		UPDATE app.ml_predictions_audit
		   SET reviewed_at = now(),
		       reviewer_user_id = $1,
		       review_outcome = 'upheld',
		       updated_at = now()
		 WHERE id = $2 AND tenant_id = $3
	`
	if _, err := tx.ExecContext(ctx, markReviewed,
		input.ReviewerUserID, current.PredictionID, input.TenantID); err != nil {
		return nil, fmt.Errorf("mark prediction reviewed: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit dismiss tx: %w", err)
	}
	return &updated, nil
}
