// Package repository persists performance aggregates.
//
// Bu paket performance servisi için CRUD katmanı. Aggregate başına ayrı
// dosya tutuyoruz (`okr_repo.go`, `goal_repo.go`, `review_repo.go`,
// `cycle_repo.go`, `competency_repo.go`, `ninebox_repo.go`) — bu dosya
// sadece tüm aggregate'lerin paylaştığı tx helper'ını içerir.
//
// Yeni aggregate eklerken:
//
//  1. `<aggregate>_repo.go` dosyası oluştur.
//  2. Interface + struct + ctor + CRUD metodları yaz.
//  3. cmd/main.go içinde wiring'i ekle.
package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/performance/internal/db"
)

// beginTenantTx tenant-scoped sqlx tx açar; SET LOCAL app.tenant_id verir.
//
// readOnly true ise pgx read-only mode'a alınır; yanlışlıkla yazma denemesi
// PostgreSQL tarafından reddedilir (read replica routing'e hazırlık).
//
// Tüm repo metodları başlangıçta bu helper'ı çağırır; tx scope'u çıkış
// pathlerinde rollback() / commit() ile yönetilir. RLS Policy uyumu için
// SET LOCAL şart — db.SetRLSTenant başarısız olursa tx rollback edilir.
func beginTenantTx(ctx context.Context, d *sqlx.DB, tenantID uuid.UUID, readOnly bool) (*sqlx.Tx, error) {
	var opts *sql.TxOptions
	if readOnly {
		opts = &sql.TxOptions{ReadOnly: true}
	}
	tx, err := d.BeginTxx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		_ = tx.Rollback()
		return nil, err
	}
	return tx, nil
}
