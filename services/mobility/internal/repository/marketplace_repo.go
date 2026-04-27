package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// --- Internal Opportunity ---

// InternalOpportunity mirrors app.internal_opportunities (migration 043).
type InternalOpportunity struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	TenantID        uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	RequisitionID   *uuid.UUID     `db:"requisition_id" json:"requisition_id,omitempty"`
	Title           string         `db:"title" json:"title"`
	Description     *string        `db:"description" json:"description,omitempty"`
	DepartmentID    *uuid.UUID     `db:"department_id" json:"department_id,omitempty"`
	PositionID      *uuid.UUID     `db:"position_id" json:"position_id,omitempty"`
	Location        *string        `db:"location" json:"location,omitempty"`
	IsRemote        bool           `db:"is_remote" json:"is_remote"`
	OpportunityType string         `db:"opportunity_type" json:"opportunity_type"`
	RequiredSkills  pq.StringArray `db:"required_skills" json:"required_skills"`
	PreferredSkills pq.StringArray `db:"preferred_skills" json:"preferred_skills"`
	PostedBy        uuid.UUID      `db:"posted_by" json:"posted_by"`
	PostedAt        time.Time      `db:"posted_at" json:"posted_at"`
	ClosesAt        *time.Time     `db:"closes_at" json:"closes_at,omitempty"`
	Status          string         `db:"status" json:"status"`
	CreatedAt       time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time      `db:"updated_at" json:"updated_at"`
}

// InternalApplication mirrors app.internal_applications.
type InternalApplication struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	OpportunityID  uuid.UUID  `db:"opportunity_id" json:"opportunity_id"`
	EmployeeID     uuid.UUID  `db:"employee_id" json:"employee_id"`
	CoverNote      *string    `db:"cover_note" json:"cover_note,omitempty"`
	MatchScore     *float64   `db:"match_score" json:"match_score,omitempty"`
	Status         string     `db:"status" json:"status"`
	Confidential   bool       `db:"confidential" json:"confidential"`
	AppliedAt      time.Time  `db:"applied_at" json:"applied_at"`
	DecidedAt      *time.Time `db:"decided_at" json:"decided_at,omitempty"`
	DecisionNotes  *string    `db:"decision_notes" json:"decision_notes,omitempty"`
}

// TalentEmbedding mirrors app.talent_embeddings.
type TalentEmbedding struct {
	TenantID         uuid.UUID      `db:"tenant_id"`
	EmployeeID       uuid.UUID      `db:"employee_id"`
	EmbeddingVersion string         `db:"embedding_version"`
	Vector           []byte         `db:"vector"`
	IndexedSkills    pq.StringArray `db:"indexed_skills"`
	UpdatedAt        time.Time      `db:"updated_at"`
}

// KeysetPage carries (CursorCreatedAt, CursorID, Limit) for keyset queries.
// Zero time/uuid means "no cursor" — caller gets the first page. Limit 0 means
// "use implementation default".
type KeysetPage struct {
	CursorCreatedAt *time.Time
	CursorID        *uuid.UUID
	Limit           int
}

// MarketplaceRepository — opportunities + applications + embeddings.
type MarketplaceRepository interface {
	CreateOpportunity(ctx context.Context, o *InternalOpportunity) error
	UpdateOpportunityStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error
	ListOpen(ctx context.Context, tenantID uuid.UUID, oppType string) ([]*InternalOpportunity, error)
	// ListOpenPaged is the keyset-paginated companion to ListOpen.
	// Orders by (posted_at DESC, id DESC). Callers should prefer this for the
	// public opportunities endpoint.
	ListOpenPaged(ctx context.Context, tenantID uuid.UUID, oppType string, p KeysetPage) ([]*InternalOpportunity, error)
	GetOpportunity(ctx context.Context, tenantID, id uuid.UUID) (*InternalOpportunity, error)

	Apply(ctx context.Context, a *InternalApplication) (bool, error)
	GetApplication(ctx context.Context, tenantID, id uuid.UUID) (*InternalApplication, error)
	FindApplicationByEmployee(ctx context.Context, tenantID, oppID, employeeID uuid.UUID) (*InternalApplication, error)
	ListApplicationsForOpp(ctx context.Context, tenantID, oppID uuid.UUID) ([]*InternalApplication, error)
	ListApplicationsForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*InternalApplication, error)
	// ListApplicationsForEmployeePaged — keyset-paginated (applied_at DESC, id DESC).
	ListApplicationsForEmployeePaged(ctx context.Context, tenantID, employeeID uuid.UUID, p KeysetPage) ([]*InternalApplication, error)
	UpdateApplicationStatus(ctx context.Context, tenantID, id uuid.UUID, status string, decisionNotes *string) error
	WithdrawApplication(ctx context.Context, tenantID, id, employeeID uuid.UUID) (bool, error)

	GetEmployeeSkills(ctx context.Context, tenantID, employeeID uuid.UUID) ([]string, error)

	UpsertEmbedding(ctx context.Context, e *TalentEmbedding) error
	GetEmbedding(ctx context.Context, tenantID, employeeID uuid.UUID) (*TalentEmbedding, error)

	InsertAuditEvent(ctx context.Context, tenantID uuid.UUID, userID *uuid.UUID, actorRole, action, resourceType string, resourceID uuid.UUID, payload []byte) error
}

type marketRepo struct{ db *sqlx.DB }

// NewMarketplaceRepository constructs.
func NewMarketplaceRepository(d *sqlx.DB) MarketplaceRepository { return &marketRepo{db: d} }

const oppCols = `id, tenant_id, requisition_id, title, description, department_id, position_id,
	location, is_remote, opportunity_type, required_skills, preferred_skills,
	posted_by, posted_at, closes_at, status, created_at, updated_at`

func (r *marketRepo) CreateOpportunity(ctx context.Context, o *InternalOpportunity) error {
	_, err := r.db.NamedExecContext(ctx,
		`INSERT INTO app.internal_opportunities
		 (id, tenant_id, requisition_id, title, description, department_id, position_id,
		  location, is_remote, opportunity_type, required_skills, preferred_skills,
		  posted_by, closes_at, status)
		 VALUES (:id, :tenant_id, :requisition_id, :title, :description, :department_id, :position_id,
		         :location, :is_remote, :opportunity_type, :required_skills, :preferred_skills,
		         :posted_by, :closes_at, :status)`, o)
	return err
}

func (r *marketRepo) UpdateOpportunityStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE app.internal_opportunities SET status=$3, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id, status)
	return err
}

func (r *marketRepo) ListOpen(ctx context.Context, tenantID uuid.UUID, oppType string) ([]*InternalOpportunity, error) {
	out := []*InternalOpportunity{}
	if oppType != "" {
		err := r.db.SelectContext(ctx, &out,
			`SELECT `+oppCols+` FROM app.internal_opportunities
			 WHERE tenant_id=$1 AND status='open' AND opportunity_type=$2
			   AND (closes_at IS NULL OR closes_at > NOW())
			 ORDER BY posted_at DESC`, tenantID, oppType)
		return out, err
	}
	err := r.db.SelectContext(ctx, &out,
		`SELECT `+oppCols+` FROM app.internal_opportunities
		 WHERE tenant_id=$1 AND status='open'
		   AND (closes_at IS NULL OR closes_at > NOW())
		 ORDER BY posted_at DESC`, tenantID)
	return out, err
}

// ListOpenPaged is the keyset variant. Ordering: (posted_at DESC, id DESC).
// When p.CursorCreatedAt/CursorID is nil, returns the first page.
func (r *marketRepo) ListOpenPaged(
	ctx context.Context, tenantID uuid.UUID, oppType string, p KeysetPage,
) ([]*InternalOpportunity, error) {
	limit := p.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	out := []*InternalOpportunity{}
	// Build args + query dynamically based on whether oppType + cursor are set.
	args := []any{tenantID}
	idx := 2
	conds := "tenant_id=$1 AND status='open' AND (closes_at IS NULL OR closes_at > NOW())"
	if oppType != "" {
		conds += fmt.Sprintf(" AND opportunity_type=$%d", idx)
		args = append(args, oppType)
		idx++
	}
	if p.CursorCreatedAt != nil && p.CursorID != nil {
		conds += fmt.Sprintf(" AND (posted_at, id) < ($%d, $%d)", idx, idx+1)
		args = append(args, *p.CursorCreatedAt, *p.CursorID)
		idx += 2
	}
	q := fmt.Sprintf(
		"SELECT %s FROM app.internal_opportunities WHERE %s ORDER BY posted_at DESC, id DESC LIMIT $%d",
		oppCols, conds, idx,
	)
	args = append(args, limit)
	err := r.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (r *marketRepo) GetOpportunity(ctx context.Context, tenantID, id uuid.UUID) (*InternalOpportunity, error) {
	var o InternalOpportunity
	err := r.db.GetContext(ctx, &o,
		`SELECT `+oppCols+` FROM app.internal_opportunities
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// Apply inserts a new application. Returns inserted=false when a prior application
// already exists (tenant+opportunity+employee unique constraint).
func (r *marketRepo) Apply(ctx context.Context, a *InternalApplication) (bool, error) {
	res, err := r.db.NamedExecContext(ctx,
		`INSERT INTO app.internal_applications
		 (id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential)
		 VALUES (:id, :tenant_id, :opportunity_id, :employee_id, :cover_note, :match_score, :status, :confidential)
		 ON CONFLICT (tenant_id, opportunity_id, employee_id) DO NOTHING`, a)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows == 1, nil
}

func (r *marketRepo) GetApplication(ctx context.Context, tenantID, id uuid.UUID) (*InternalApplication, error) {
	var a InternalApplication
	err := r.db.GetContext(ctx, &a,
		`SELECT id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential,
		        applied_at, decided_at, decision_notes
		 FROM app.internal_applications WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *marketRepo) FindApplicationByEmployee(ctx context.Context, tenantID, oppID, employeeID uuid.UUID) (*InternalApplication, error) {
	var a InternalApplication
	err := r.db.GetContext(ctx, &a,
		`SELECT id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential,
		        applied_at, decided_at, decision_notes
		 FROM app.internal_applications
		 WHERE tenant_id=$1 AND opportunity_id=$2 AND employee_id=$3`, tenantID, oppID, employeeID)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *marketRepo) ListApplicationsForOpp(ctx context.Context, tenantID, oppID uuid.UUID) ([]*InternalApplication, error) {
	out := []*InternalApplication{}
	err := r.db.SelectContext(ctx, &out,
		`SELECT id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential,
		        applied_at, decided_at, decision_notes
		 FROM app.internal_applications
		 WHERE tenant_id=$1 AND opportunity_id=$2
		 ORDER BY match_score DESC NULLS LAST, applied_at`, tenantID, oppID)
	return out, err
}

func (r *marketRepo) ListApplicationsForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*InternalApplication, error) {
	out := []*InternalApplication{}
	err := r.db.SelectContext(ctx, &out,
		`SELECT id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential,
		        applied_at, decided_at, decision_notes
		 FROM app.internal_applications
		 WHERE tenant_id=$1 AND employee_id=$2 ORDER BY applied_at DESC`, tenantID, employeeID)
	return out, err
}

// ListApplicationsForEmployeePaged — keyset (applied_at DESC, id DESC).
func (r *marketRepo) ListApplicationsForEmployeePaged(
	ctx context.Context, tenantID, employeeID uuid.UUID, p KeysetPage,
) ([]*InternalApplication, error) {
	limit := p.Limit
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	out := []*InternalApplication{}
	args := []any{tenantID, employeeID}
	idx := 3
	conds := "tenant_id=$1 AND employee_id=$2"
	if p.CursorCreatedAt != nil && p.CursorID != nil {
		conds += fmt.Sprintf(" AND (applied_at, id) < ($%d, $%d)", idx, idx+1)
		args = append(args, *p.CursorCreatedAt, *p.CursorID)
		idx += 2
	}
	q := fmt.Sprintf(
		`SELECT id, tenant_id, opportunity_id, employee_id, cover_note, match_score, status, confidential,
		        applied_at, decided_at, decision_notes
		 FROM app.internal_applications
		 WHERE %s ORDER BY applied_at DESC, id DESC LIMIT $%d`,
		conds, idx,
	)
	args = append(args, limit)
	err := r.db.SelectContext(ctx, &out, q, args...)
	return out, err
}

func (r *marketRepo) UpdateApplicationStatus(ctx context.Context, tenantID, id uuid.UUID, status string, decisionNotes *string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE app.internal_applications
		 SET status=$3, decided_at=NOW(), decision_notes=$4
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id, status, decisionNotes)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// WithdrawApplication flips a submitted application to "withdrawn" only when the
// requesting employee owns it and the status is still "applied".
func (r *marketRepo) WithdrawApplication(ctx context.Context, tenantID, id, employeeID uuid.UUID) (bool, error) {
	res, err := r.db.ExecContext(ctx,
		`UPDATE app.internal_applications
		 SET status='withdrawn', decided_at=NOW()
		 WHERE tenant_id=$1 AND id=$2 AND employee_id=$3 AND status='applied'`,
		tenantID, id, employeeID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n == 1, nil
}

// GetEmployeeSkills merges talent_embeddings.indexed_skills with the freshest
// survey/profile data. Falls back to empty slice when the employee has no
// embedding snapshot yet (new hire).
func (r *marketRepo) GetEmployeeSkills(ctx context.Context, tenantID, employeeID uuid.UUID) ([]string, error) {
	var skills pq.StringArray
	err := r.db.GetContext(ctx, &skills,
		`SELECT COALESCE(indexed_skills, '{}')
		 FROM app.talent_embeddings
		 WHERE tenant_id=$1 AND employee_id=$2`, tenantID, employeeID)
	if errors.Is(err, sql.ErrNoRows) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	return []string(skills), nil
}

// InsertAuditEvent appends an append-only audit row. Swallows non-fatal errors
// in caller by returning them; caller may log + continue (mobility mutation
// itself must not be reversed by a failed audit insert).
func (r *marketRepo) InsertAuditEvent(
	ctx context.Context,
	tenantID uuid.UUID,
	userID *uuid.UUID,
	actorRole, action, resourceType string,
	resourceID uuid.UUID,
	payload []byte,
) error {
	if len(payload) == 0 {
		payload = []byte(`{}`)
	}
	var uid any
	if userID != nil {
		uid = *userID
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO audit.events
		  (tenant_id, user_id, actor_role, action, resource_type, resource_id, status, payload)
		 VALUES ($1, $2, $3, $4, $5, $6, 'success', $7::jsonb)`,
		tenantID, uid, actorRole, action, resourceType, resourceID, payload)
	return err
}

func (r *marketRepo) UpsertEmbedding(ctx context.Context, e *TalentEmbedding) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO app.talent_embeddings
		 (tenant_id, employee_id, embedding_version, vector, indexed_skills)
		 VALUES ($1,$2,$3,$4,$5)
		 ON CONFLICT (tenant_id, employee_id)
		 DO UPDATE SET embedding_version=EXCLUDED.embedding_version,
		               vector=EXCLUDED.vector,
		               indexed_skills=EXCLUDED.indexed_skills,
		               updated_at=NOW()`,
		e.TenantID, e.EmployeeID, e.EmbeddingVersion, e.Vector, e.IndexedSkills)
	if err != nil {
		return fmt.Errorf("upsert embedding: %w", err)
	}
	return nil
}

func (r *marketRepo) GetEmbedding(ctx context.Context, tenantID, employeeID uuid.UUID) (*TalentEmbedding, error) {
	var e TalentEmbedding
	err := r.db.GetContext(ctx, &e,
		`SELECT tenant_id, employee_id, embedding_version, vector, indexed_skills, updated_at
		 FROM app.talent_embeddings WHERE tenant_id=$1 AND employee_id=$2`, tenantID, employeeID)
	if err != nil {
		return nil, err
	}
	return &e, nil
}
