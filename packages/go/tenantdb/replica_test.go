package tenantdb

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Bu testler ReplicaPool'un constructor + routing davranışını doğrular.
// Gerçek pgxpool.Pool'a ihtiyaç duyulan testler (BeginTenantTxRead) integration
// test (services/*/integration_test.go) altında çalıştırılmak üzere yazılır;
// burada sadece nil-safe routing kontrolü yapıyoruz.

func TestNewReplicaPool_RequiresPrimaryDSN(t *testing.T) {
	t.Parallel()
	_, err := NewReplicaPool(context.Background(), "", "")
	if err == nil {
		t.Fatal("expected error for empty primary DSN, got nil")
	}
}

func TestReplicaPool_GetForReadFallback_NoReplica(t *testing.T) {
	t.Parallel()

	// In-memory pool — connection açılmaz, sadece pointer routing test edilir.
	primary := &pgxpool.Pool{}
	rp := NewReplicaPoolFromPools(primary, nil)

	got := rp.GetForRead(context.Background())
	if got != primary {
		t.Errorf("GetForRead with nil replica should return primary; got %p, want %p", got, primary)
	}
}

func TestReplicaPool_GetForWrite_AlwaysPrimary(t *testing.T) {
	t.Parallel()

	primary := &pgxpool.Pool{}
	replica := &pgxpool.Pool{}
	rp := NewReplicaPoolFromPools(primary, replica)

	got := rp.GetForWrite(context.Background())
	if got != primary {
		t.Errorf("GetForWrite must always route to primary; got %p, want %p", got, primary)
	}
}

func TestReplicaPool_PrimaryAndReplicaAccessors(t *testing.T) {
	t.Parallel()

	primary := &pgxpool.Pool{}
	replica := &pgxpool.Pool{}
	rp := NewReplicaPoolFromPools(primary, replica)

	if rp.Primary() != primary {
		t.Error("Primary() returned unexpected pool")
	}
	if rp.Replica() != replica {
		t.Error("Replica() returned unexpected pool")
	}

	rp2 := NewReplicaPoolFromPools(primary, nil)
	if rp2.Replica() != nil {
		t.Error("Replica() should be nil when not configured")
	}
}
