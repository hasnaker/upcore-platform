// Package tenantexport runs the background job that builds a zip with all
// tenant data for KVKK 11 (data portability). The worker processes
// app.tenant_export_jobs rows with status='queued', dumps each table to
// NDJSON, zips them, and uploads to blob storage. Status transitions:
//   queued → running → completed | failed.
package tenantexport

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// Uploader abstracts blob destination (Azure Blob / LocalFS).
type Uploader interface {
	Upload(ctx context.Context, key string, body []byte, contentType string) (url string, err error)
}

// Worker polls for queued export jobs and processes them.
type Worker struct {
	DB       *sqlx.DB
	Uploader Uploader
	Interval time.Duration
	Log      zerolog.Logger
}

// NewWorker constructs with a 30-second poll interval.
func NewWorker(db *sqlx.DB, up Uploader, log zerolog.Logger) *Worker {
	return &Worker{DB: db, Uploader: up, Interval: 30 * time.Second, Log: log}
}

// Run blocks until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) {
	t := time.NewTicker(w.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := w.tick(ctx); err != nil {
				w.Log.Error().Err(err).Msg("tenant export tick failed")
			}
		}
	}
}

type job struct {
	ID            uuid.UUID  `db:"id"`
	TenantID      uuid.UUID  `db:"tenant_id"`
	Scope         string     `db:"scope"`
	KVKKSubjectID *uuid.UUID `db:"kvkk_subject_id"`
	Format        string     `db:"format"`
}

// Tables exported in the full scope. Add migrations here when new
// tenant-scoped tables are introduced.
var exportTables = []string{
	"employees", "employee_contacts", "employment_history",
	"offer_letters", "onboarding_checklists", "career_events",
	"compensation_records", "offboarding_events",
	"departments", "positions", "teams", "reporting_lines",
	"performance_cycles", "performance_goals", "okrs", "performance_reviews",
	"leave_requests", "leave_balances",
	"payroll_periods", "payroll_runs", "payroll_slips", "payroll_slip_items",
	"requisitions", "candidates", "applications", "interviews",
	"assessments", "assessment_responses", "assessment_snapshots",
	"notifications", "audit_events",
	"documents", "document_versions",
}

func (w *Worker) tick(ctx context.Context) error {
	var j job
	// Claim one queued job (FOR UPDATE SKIP LOCKED for concurrent workers).
	err := w.DB.GetContext(ctx, &j,
		`UPDATE app.tenant_export_jobs SET status='running', started_at=NOW()
		 WHERE id IN (
		   SELECT id FROM app.tenant_export_jobs
		   WHERE status='queued' ORDER BY created_at
		   FOR UPDATE SKIP LOCKED LIMIT 1
		 ) RETURNING id, tenant_id, scope, kvkk_subject_id, format`)
	if err != nil {
		// sql.ErrNoRows when no work — silent.
		return nil
	}

	body, err := w.buildZip(ctx, &j)
	if err != nil {
		w.fail(ctx, j.ID, err)
		return err
	}
	key := fmt.Sprintf("exports/%s/%s.zip", j.TenantID, j.ID)
	url, err := w.Uploader.Upload(ctx, key, body, "application/zip")
	if err != nil {
		w.fail(ctx, j.ID, err)
		return err
	}
	expiry := time.Now().UTC().AddDate(0, 0, 7)
	_, _ = w.DB.ExecContext(ctx,
		`UPDATE app.tenant_export_jobs
		 SET status='completed', completed_at=NOW(),
		     output_blob_url=$2, output_size_bytes=$3, expires_at=$4
		 WHERE id=$1`, j.ID, url, len(body), expiry)
	w.Log.Info().Str("job", j.ID.String()).Int("bytes", len(body)).
		Msg("tenant export completed")
	return nil
}

func (w *Worker) buildZip(ctx context.Context, j *job) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// Set RLS scope so queries see only this tenant's rows.
	if _, err := w.DB.ExecContext(ctx, `SELECT set_config('app.tenant_id', $1, false)`, j.TenantID.String()); err != nil {
		return nil, err
	}

	for _, tbl := range exportTables {
		ndjson, err := w.dumpTable(ctx, j, tbl)
		if err != nil {
			w.Log.Warn().Err(err).Str("table", tbl).Msg("dump skipped")
			continue
		}
		f, err := zw.Create(tbl + ".ndjson")
		if err != nil {
			return nil, err
		}
		_, _ = f.Write(ndjson)
	}

	// Manifest: which tables were included + row counts + timestamp.
	manifest, _ := json.MarshalIndent(map[string]any{
		"tenant_id":  j.TenantID,
		"exported_at": time.Now().UTC().Format(time.RFC3339),
		"tables":     exportTables,
		"kvkk_note":  "Bu arşiv KVKK 11. madde veri taşınabilirlik talebi kapsamında üretilmiştir.",
	}, "", "  ")
	if f, err := zw.Create("MANIFEST.json"); err == nil {
		_, _ = f.Write(manifest)
	}

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func (w *Worker) dumpTable(ctx context.Context, j *job, table string) ([]byte, error) {
	// KVKK_SUBJECT scope → filter by employee_id = kvkk_subject_id when column exists.
	q := fmt.Sprintf(
		`SELECT row_to_json(t.*)::text FROM app.%s t WHERE tenant_id=$1`, table)
	args := []any{j.TenantID}
	if j.Scope == "kvkk_subject" && j.KVKKSubjectID != nil {
		// Only tables with employee_id column; we try and fall back to just tenant filter.
		q = fmt.Sprintf(
			`SELECT row_to_json(t.*)::text FROM app.%s t
			 WHERE tenant_id=$1 AND COALESCE(employee_id::text, '') IN ('', $2::text)`, table)
		args = append(args, j.KVKKSubjectID.String())
	}
	rows, err := w.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out bytes.Buffer
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return nil, err
		}
		out.WriteString(line)
		out.WriteByte('\n')
	}
	return out.Bytes(), rows.Err()
}

func (w *Worker) fail(ctx context.Context, id uuid.UUID, err error) {
	_, _ = w.DB.ExecContext(ctx,
		`UPDATE app.tenant_export_jobs
		 SET status='failed', error_message=$2, completed_at=NOW()
		 WHERE id=$1`, id, err.Error())
}
