package repository_test

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/repository"
)

// TestRealTenantRepo_ListAdmin_SQLShape verifies the actual sqlx repository
// emits count + list queries with the expected argument order and binds
// results into domain.TenantAdminRow. Run against a mocked *sql.DB so we
// exercise the real SQL builder without needing Postgres.
func TestRealTenantRepo_ListAdmin_SQLShape(t *testing.T) {
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer mdb.Close()
	db := sqlx.NewDb(mdb, "postgres")
	repo := repository.NewTenantRepository(db)

	// Filters: status=active AND plan=growth AND search=acme, page=2 size=10 → offset 10.
	// Expected args order: status, plan_id, search, limit, offset.
	filter := repository.TenantListFilter{
		Status:   "active",
		PlanID:   "growth",
		Search:   "ACME",
		Page:     2,
		PageSize: 10,
	}

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM tenants t`)).
		WithArgs("active", "growth", "%acme%").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(17))

	now := time.Now().UTC()
	tid := uuid.New()
	plan := "growth"
	subSt := "active"
	seats := 42
	rows := sqlmock.NewRows([]string{
		"id", "name", "slug", "country", "locale", "status",
		"trial_ends_at", "created_at", "updated_at",
		"plan_id", "sub_status", "seats", "employee_count",
	}).AddRow(tid, "Acme", "acme", "TR", "tr-TR", "active",
		nil, now, now,
		plan, subSt, seats, int64(123))

	mock.ExpectQuery(regexp.QuoteMeta(`FROM tenants t`)).
		WithArgs("active", "growth", "%acme%", 10, 10).
		WillReturnRows(rows)

	out, total, err := repo.ListAdmin(context.Background(), filter)
	if err != nil {
		t.Fatalf("list admin: %v", err)
	}
	if total != 17 {
		t.Fatalf("total=%d want 17", total)
	}
	if len(out) != 1 {
		t.Fatalf("rows=%d", len(out))
	}
	row := out[0]
	if row.ID != tid {
		t.Fatalf("id mismatch")
	}
	if row.PlanID == nil || *row.PlanID != "growth" {
		t.Fatalf("plan_id not bound")
	}
	if row.SubStatus == nil || *row.SubStatus != "active" {
		t.Fatalf("sub_status not bound")
	}
	if row.Seats == nil || *row.Seats != 42 {
		t.Fatalf("seats not bound")
	}
	if row.EmployeeCount != 123 {
		t.Fatalf("employee_count=%d want 123", row.EmployeeCount)
	}
	if row.Status != domain.TenantStatusActive {
		t.Fatalf("status=%s", row.Status)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("expectations: %v", err)
	}
}

func TestRealTenantRepo_ListAdmin_InvalidStatus(t *testing.T) {
	mdb, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer mdb.Close()
	db := sqlx.NewDb(mdb, "postgres")
	repo := repository.NewTenantRepository(db)

	_, _, err = repo.ListAdmin(context.Background(), repository.TenantListFilter{Status: "banana"})
	if err == nil {
		t.Fatalf("expected validation error")
	}
}
