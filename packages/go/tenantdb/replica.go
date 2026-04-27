// Package tenantdb — read replica routing.
//
// Bu dosya tenantdb paketine read replica desteği ekler. Read-heavy
// servislerde (analytics dashboard, raporlar, listing endpoint'leri)
// primary üzerindeki yükü azaltır.
//
// Tasarım kararları:
//
//  1. Replica opsiyoneldir. DATABASE_URL_REPLICA env var'ı boşsa Pool tek
//     primary üzerinde çalışır ve GetForRead da primary'i döner. Bu sayede
//     eski servisler (ya da local dev) kod değişikliği olmadan migrate olur.
//
//  2. Yazma her zaman primary'e gider. BeginTenantTx primary'i kullanır;
//     bu daha üst seviye davranışı (`tenantdb.go`) bozmaz.
//
//  3. Read-only sorgular GetForRead ile alınır. Replica nil ise primary
//     fallback. Replica varsa replication lag tahmini caller'ın
//     sorumluluğundadır — staleness kabul edilemez (örn. "kullanıcı
//     yeni eklediği kaydı listede görmeli") yerlerde GetForWrite
//     kullanılmalıdır.
//
//  4. Health-check: replica connection'ı down olursa GetForRead sessizce
//     primary'e fallback eder. Bu sayede replica failover sırasında
//     servis düşmez (best-effort routing).
//
// Kullanım örneği (analytics handler):
//
//	pool, err := tenantdb.NewReplicaPool(ctx,
//	    os.Getenv("DATABASE_URL"),
//	    os.Getenv("DATABASE_URL_REPLICA"))
//	if err != nil { return err }
//	readPool := pool.GetForRead(ctx)
//	rows, err := readPool.Query(ctx, "SELECT ... FROM ... WHERE tenant_id=$1", tenantID)

package tenantdb

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ReplicaPool primary + opsiyonel replica pgxpool sarmalayıcısıdır.
//
// Concurrent-safe: pgxpool.Pool kendi içinde concurrent-safe; ReplicaPool
// sadece routing yapar, ek state taşımaz.
type ReplicaPool struct {
	primary *pgxpool.Pool
	replica *pgxpool.Pool // nil if not configured
}

// NewReplicaPool primary ve (opsiyonel) replica DSN'lerinden ReplicaPool oluşturur.
//
// replicaDSN boşsa replica devre dışı kalır ve tüm okumalar primary'e gider.
// Bu, env config'in gradual rollout için kritik özelliği — staging'de
// replica olmasa da kod aynen çalışır.
func NewReplicaPool(ctx context.Context, primaryDSN, replicaDSN string) (*ReplicaPool, error) {
	if primaryDSN == "" {
		return nil, errors.New("tenantdb: primary DSN required")
	}
	primary, err := pgxpool.New(ctx, primaryDSN)
	if err != nil {
		return nil, fmt.Errorf("tenantdb: primary pool: %w", err)
	}

	rp := &ReplicaPool{primary: primary}

	if replicaDSN != "" {
		replica, rerr := pgxpool.New(ctx, replicaDSN)
		if rerr != nil {
			// Replica connection failure primary'i bloklamaz; fakat config
			// bug'ını silently swallow etmek istemiyoruz — pool'u kapat,
			// ham hatayı dön.
			primary.Close()
			return nil, fmt.Errorf("tenantdb: replica pool: %w", rerr)
		}
		rp.replica = replica
	}

	return rp, nil
}

// NewReplicaPoolFromPools test injection için saf-Go constructor.
// Primary zorunlu, replica nil olabilir.
func NewReplicaPoolFromPools(primary, replica *pgxpool.Pool) *ReplicaPool {
	return &ReplicaPool{primary: primary, replica: replica}
}

// Primary direct erişim — migration script'leri ve operational tooling için.
// Handler kodu GetForRead/GetForWrite'ı tercih etmeli.
func (rp *ReplicaPool) Primary() *pgxpool.Pool { return rp.primary }

// Replica erişim — replica yapılandırılmamışsa nil döner.
// Direkt kullanmaktan kaçının; GetForRead daha güvenli (auto-fallback).
func (rp *ReplicaPool) Replica() *pgxpool.Pool { return rp.replica }

// GetForRead read-only sorgular için pool döner.
//
// Önce replica'yı dener; yapılandırılmamış veya health-check başarısızsa
// primary'e düşer. ctx ile health-ping yapılır (50ms'den hızlı dönmesi
// gerekir; pgxpool internal timeout default 30s).
//
// İsteyen caller GetForRead ile dönen pool üzerinden Query/QueryRow çağırır.
// SET LOCAL app.tenant_id GEREKLİ — read-only sorgular için yine RLS
// devrede; tenant context'ini elle session-level set etmeli ya da
// her sorguya `WHERE tenant_id = $1` eklemelidir.
func (rp *ReplicaPool) GetForRead(ctx context.Context) *pgxpool.Pool {
	if rp.replica == nil {
		return rp.primary
	}
	// Lightweight health probe — replica conn alabilir miyiz?
	// pgxpool.Acquire fail ederse replica down kabul edilir.
	conn, err := rp.replica.Acquire(ctx)
	if err != nil {
		return rp.primary
	}
	conn.Release()
	return rp.replica
}

// GetForWrite her zaman primary'i döner.
//
// Bu API'nin varlığı niyet açıklığı için: caller kodunda
// "GetForRead vs GetForWrite" görünür olur. Yanlış kullanım (yazmayı
// replica'ya yapma) compile-time/runtime'da silently bozulmaz; her zaman
// primary'e gider.
func (rp *ReplicaPool) GetForWrite(_ context.Context) *pgxpool.Pool {
	return rp.primary
}

// Close hem primary hem replica'yı kapatır. Servis shutdown'da çağrılır.
func (rp *ReplicaPool) Close() {
	if rp.replica != nil {
		rp.replica.Close()
	}
	rp.primary.Close()
}

// BeginTenantTxRead read-only tenant tx'i replica üzerinde açar.
//
// Replica yapılandırılmamışsa primary'e düşer (otomatik). Tx içinde
// SET LOCAL app.tenant_id verilir, RLS aktif. Read-only flag tx'e işlenir
// (`pgx.TxOptions.AccessMode: pgx.ReadOnly`) — yanlışlıkla yazma denemesi
// PostgreSQL tarafından reddedilir.
//
// Kullanım — analytics aggregate query:
//
//	tx, err := tdb.BeginTenantTxRead(ctx, replicaPool, tenantID, userID)
//	if err != nil { return err }
//	defer tx.Rollback(ctx)
//	// SELECT ... aggregate
//	return tx.Commit(ctx)
func (t *TenantDB) BeginTenantTxRead(
	ctx context.Context,
	rp *ReplicaPool,
	tenantID, userID uuid.UUID,
) (pgx.Tx, error) {
	if tenantID == uuid.Nil {
		return nil, ErrTenantRequired
	}
	pool := rp.GetForRead(ctx)
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, fmt.Errorf("tenantdb: begin read tx: %w", err)
	}
	if _, err := tx.Exec(ctx,
		"SELECT set_config('app.tenant_id', $1, true)", tenantID.String()); err != nil {
		_ = tx.Rollback(ctx)
		return nil, fmt.Errorf("tenantdb: set app.tenant_id (read): %w", err)
	}
	if userID != uuid.Nil {
		if _, err := tx.Exec(ctx,
			"SELECT set_config('app.user_id', $1, true)", userID.String()); err != nil {
			_ = tx.Rollback(ctx)
			return nil, fmt.Errorf("tenantdb: set app.user_id (read): %w", err)
		}
	}
	return tx, nil
}
