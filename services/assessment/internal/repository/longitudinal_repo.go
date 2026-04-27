package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// AssessmentSnapshot mirrors app.assessment_snapshots (migration 040).
type AssessmentSnapshot struct {
	ID            uuid.UUID `db:"id" json:"id"`
	TenantID      uuid.UUID `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID `db:"employee_id" json:"employee_id"`
	Instrument    string    `db:"instrument" json:"instrument"`
	SnapshotDate  time.Time `db:"snapshot_date" json:"snapshot_date"`
	OverallScore  *float64  `db:"overall_score" json:"overall_score,omitempty"`
	Percentile    *int      `db:"percentile" json:"percentile,omitempty"`
	TScore        *float64  `db:"t_score" json:"t_score,omitempty"`
	RiskBand      *string   `db:"risk_band" json:"risk_band,omitempty"`
	SubScores     []byte    `db:"sub_scores" json:"sub_scores"`
	AssessmentID  *uuid.UUID `db:"assessment_id" json:"assessment_id,omitempty"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// BulkInvitation mirrors app.assessment_bulk_invitations.
type BulkInvitation struct {
	ID              uuid.UUID `db:"id" json:"id"`
	TenantID        uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Instrument      string    `db:"instrument" json:"instrument"`
	AudienceFilter  []byte    `db:"audience_filter" json:"audience_filter"`
	InvitedCount    int       `db:"invited_count" json:"invited_count"`
	CompletedCount  int       `db:"completed_count" json:"completed_count"`
	ExpiresAt       *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	CreatedBy       uuid.UUID `db:"created_by" json:"created_by"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}

// LongitudinalRepository — snapshots + bulk invitations CRUD.
type LongitudinalRepository interface {
	AddSnapshot(ctx context.Context, s *AssessmentSnapshot) error
	ListSnapshots(ctx context.Context, tenantID, employeeID uuid.UUID, instrument string) ([]*AssessmentSnapshot, error)
	TrendSeries(ctx context.Context, tenantID uuid.UUID, instrument string, from, to time.Time) ([]SnapshotTrendPoint, error)
	CreateBulkInvitation(ctx context.Context, b *BulkInvitation) error
	IncrementCompletion(ctx context.Context, tenantID, id uuid.UUID) error
}

// SnapshotTrendPoint is one aggregated month of scores (tenant-wide trend).
type SnapshotTrendPoint struct {
	YearMonth       string  `db:"year_month" json:"year_month"`
	AvgScore        float64 `db:"avg_score" json:"avg_score"`
	MedianScore     float64 `db:"median_score" json:"median_score"`
	HighRiskPct     float64 `db:"high_risk_pct" json:"high_risk_pct"`
	SampleCount     int     `db:"sample_count" json:"sample_count"`
}

type longitudinalRepo struct{ db *sqlx.DB }

// NewLongitudinalRepository constructs.
func NewLongitudinalRepository(d *sqlx.DB) LongitudinalRepository { return &longitudinalRepo{db: d} }

func (r *longitudinalRepo) AddSnapshot(ctx context.Context, s *AssessmentSnapshot) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO app.assessment_snapshots
		 (tenant_id, employee_id, instrument, snapshot_date,
		  overall_score, percentile, t_score, risk_band, sub_scores, assessment_id)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		 ON CONFLICT (tenant_id, employee_id, instrument, snapshot_date)
		 DO UPDATE SET overall_score=EXCLUDED.overall_score,
		               percentile=EXCLUDED.percentile,
		               t_score=EXCLUDED.t_score,
		               risk_band=EXCLUDED.risk_band,
		               sub_scores=EXCLUDED.sub_scores`,
		s.TenantID, s.EmployeeID, s.Instrument, s.SnapshotDate,
		s.OverallScore, s.Percentile, s.TScore, s.RiskBand, s.SubScores, s.AssessmentID)
	if err != nil {
		return fmt.Errorf("upsert snapshot: %w", err)
	}
	return nil
}

func (r *longitudinalRepo) ListSnapshots(ctx context.Context, tenantID, employeeID uuid.UUID, instrument string) ([]*AssessmentSnapshot, error) {
	q := `SELECT id, tenant_id, employee_id, instrument, snapshot_date,
	             overall_score, percentile, t_score, risk_band, sub_scores, assessment_id, created_at
	      FROM app.assessment_snapshots
	      WHERE tenant_id=$1 AND employee_id=$2`
	args := []any{tenantID, employeeID}
	if instrument != "" {
		q += ` AND instrument=$3`
		args = append(args, instrument)
	}
	q += ` ORDER BY snapshot_date DESC`
	out := []*AssessmentSnapshot{}
	if err := r.db.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *longitudinalRepo) TrendSeries(ctx context.Context, tenantID uuid.UUID, instrument string, from, to time.Time) ([]SnapshotTrendPoint, error) {
	out := []SnapshotTrendPoint{}
	q := `SELECT to_char(date_trunc('month', snapshot_date), 'YYYY-MM') AS year_month,
	             ROUND(AVG(overall_score)::numeric, 2)::float8 AS avg_score,
	             ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY overall_score))::numeric, 2)::float8 AS median_score,
	             ROUND(100.0 * SUM(CASE WHEN risk_band IN ('high','critical') THEN 1 ELSE 0 END)::numeric
	                  / NULLIF(COUNT(*),0), 2)::float8 AS high_risk_pct,
	             COUNT(*) AS sample_count
	      FROM app.assessment_snapshots
	      WHERE tenant_id=$1 AND instrument=$2
	        AND snapshot_date >= $3 AND snapshot_date <= $4
	      GROUP BY 1 ORDER BY 1`
	if err := r.db.SelectContext(ctx, &out, q, tenantID, instrument, from, to); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *longitudinalRepo) CreateBulkInvitation(ctx context.Context, b *BulkInvitation) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO app.assessment_bulk_invitations
		 (tenant_id, instrument, audience_filter, invited_count, expires_at, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		b.TenantID, b.Instrument, b.AudienceFilter, b.InvitedCount, b.ExpiresAt, b.CreatedBy)
	return err
}

func (r *longitudinalRepo) IncrementCompletion(ctx context.Context, tenantID, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE app.assessment_bulk_invitations
		 SET completed_count = completed_count + 1
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
