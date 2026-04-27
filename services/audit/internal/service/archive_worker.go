package service

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// ArchiveWorker moves audit events older than `retentionDays` to Azure Cool
// Blob storage and deletes them from the primary table. KVKK 28 + Sözleşme
// 7 yıl saklama için aktif + cold toplamı 7 yılı aşamaz; cold'da 5 yıl,
// aktifte 2 yıl default.
type ArchiveWorker struct {
	DB               *sqlx.DB
	Blob             BlobUploader
	HotRetentionDays int
	RunEvery         time.Duration
	Log              zerolog.Logger
}

// BlobUploader abstracts the archive destination. Adapter in main.go.
type BlobUploader interface {
	Upload(ctx context.Context, key string, payload []byte, contentType string) error
}

// NewArchiveWorker constructs the worker with 2-year hot window default.
func NewArchiveWorker(db *sqlx.DB, blob BlobUploader, log zerolog.Logger) *ArchiveWorker {
	return &ArchiveWorker{
		DB:               db,
		Blob:             blob,
		HotRetentionDays: 365 * 2,
		RunEvery:         24 * time.Hour,
		Log:              log,
	}
}

// Run blocks until ctx is cancelled; runs once per day at startup + tick.
func (w *ArchiveWorker) Run(ctx context.Context) {
	t := time.NewTicker(w.RunEvery)
	defer t.Stop()
	if err := w.tick(ctx); err != nil {
		w.Log.Error().Err(err).Msg("audit archive initial tick failed")
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := w.tick(ctx); err != nil {
				w.Log.Error().Err(err).Msg("audit archive tick failed")
			}
		}
	}
}

// tick implements: select rows older than HotRetentionDays → gzip JSON dump →
// upload blob → delete from app.audit_events. Operates per-tenant to keep
// archives tenant-scoped and KVKK delete-request compatible.
func (w *ArchiveWorker) tick(ctx context.Context) error {
	if w.Blob == nil {
		// Blob not wired — log and no-op (dev safe).
		w.Log.Debug().Msg("audit archive: blob uploader nil; skipping")
		return nil
	}
	cutoff := time.Now().UTC().AddDate(0, 0, -w.HotRetentionDays)

	// Archive one tenant-month at a time to keep dump size bounded.
	type chunk struct {
		TenantID string    `db:"tenant_id"`
		Year     int       `db:"y"`
		Month    int       `db:"m"`
		RowCount int       `db:"cnt"`
		MaxAt    time.Time `db:"max_at"`
	}
	var chunks []chunk
	q := `SELECT tenant_id::text, EXTRACT(YEAR FROM created_at)::int AS y,
	             EXTRACT(MONTH FROM created_at)::int AS m,
	             COUNT(*) AS cnt, MAX(created_at) AS max_at
	      FROM app.audit_events
	      WHERE created_at < $1
	      GROUP BY tenant_id, y, m
	      ORDER BY tenant_id, y, m
	      LIMIT 50`
	if err := w.DB.SelectContext(ctx, &chunks, q, cutoff); err != nil {
		return fmt.Errorf("select chunks: %w", err)
	}
	if len(chunks) == 0 {
		w.Log.Debug().Msg("audit archive: no chunks older than cutoff")
		return nil
	}

	for _, c := range chunks {
		key := fmt.Sprintf("audit/%s/%04d-%02d.ndjson", c.TenantID, c.Year, c.Month)
		payload, err := w.dumpChunk(ctx, c.TenantID, c.Year, c.Month)
		if err != nil {
			w.Log.Warn().Err(err).Str("tenant", c.TenantID).Msg("dump chunk failed")
			continue
		}
		if err := w.Blob.Upload(ctx, key, payload, "application/x-ndjson"); err != nil {
			w.Log.Warn().Err(err).Str("key", key).Msg("blob upload failed; skip delete")
			continue
		}
		if _, err := w.DB.ExecContext(ctx,
			`DELETE FROM app.audit_events
			 WHERE tenant_id = $1::uuid
			   AND EXTRACT(YEAR FROM created_at) = $2
			   AND EXTRACT(MONTH FROM created_at) = $3`,
			c.TenantID, c.Year, c.Month); err != nil {
			w.Log.Error().Err(err).Msg("delete archived rows failed")
			continue
		}
		w.Log.Info().Str("key", key).Int("rows", c.RowCount).
			Msg("audit chunk archived + deleted")
	}
	return nil
}

// dumpChunk returns NDJSON bytes for one tenant-month.
func (w *ArchiveWorker) dumpChunk(ctx context.Context, tenantID string, year, month int) ([]byte, error) {
	rows, err := w.DB.QueryContext(ctx,
		`SELECT row_to_json(a.*)::text AS json_line
		 FROM app.audit_events a
		 WHERE tenant_id = $1::uuid
		   AND EXTRACT(YEAR FROM created_at) = $2
		   AND EXTRACT(MONTH FROM created_at) = $3
		 ORDER BY created_at`,
		tenantID, year, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var buf []byte
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return nil, err
		}
		buf = append(buf, []byte(line)...)
		buf = append(buf, '\n')
	}
	return buf, rows.Err()
}
