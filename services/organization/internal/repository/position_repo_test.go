package repository_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/repository"
	"github.com/upcore/organization/internal/testsupport"
)

func TestFakePositionRepoCRUD(t *testing.T) {
	repo := testsupport.NewFakePositionRepo()
	ctx := context.Background()
	tid := uuid.New()
	p := &domain.Position{
		TenantID: tid, Code: "be-eng", TitleTR: "BE", Active: true, SalaryCurrency: "TRY",
	}
	if err := repo.Create(ctx, nil, p); err != nil {
		t.Fatalf("create: %v", err)
	}
	dup := &domain.Position{TenantID: tid, Code: "be-eng", TitleTR: "X", Active: true}
	if err := repo.Create(ctx, nil, dup); err != domain.ErrDuplicateCode {
		t.Fatalf("expected duplicate, got %v", err)
	}
	got, err := repo.GetByCode(ctx, tid, "be-eng")
	if err != nil {
		t.Fatalf("get by code: %v", err)
	}
	if got.TitleTR != "BE" {
		t.Fatalf("title=%s", got.TitleTR)
	}
	items, total, err := repo.List(ctx, tid, repository.PositionFilter{Limit: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("total=%d items=%d", total, len(items))
	}
	if err := repo.Archive(ctx, tid, p.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
	if _, err := repo.GetByID(ctx, tid, p.ID); err != domain.ErrPositionNotFound {
		t.Fatalf("expected not found, got %v", err)
	}
}

func TestFakePositionRepoUpdateJDR(t *testing.T) {
	repo := testsupport.NewFakePositionRepo()
	ctx := context.Background()
	tid := uuid.New()
	p := &domain.Position{TenantID: tid, Code: "x", TitleTR: "X", Active: true}
	_ = repo.Create(ctx, nil, p)
	d := domain.JDRDemands{Workload: 8}
	r := domain.JDRResources{Autonomy: 9}
	if err := repo.UpdateJDR(ctx, nil, tid, p.ID, d, r); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ := repo.GetByID(ctx, tid, p.ID)
	if got.JDRDemands.Workload != 8 || got.JDRResources.Autonomy != 9 {
		t.Fatalf("jdr not updated")
	}
}
