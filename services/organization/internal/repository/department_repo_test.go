package repository_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/testsupport"
)

func TestFakeDepartmentRepoLifecycle(t *testing.T) {
	repo := testsupport.NewFakeDepartmentRepo()
	ctx := context.Background()
	tid := uuid.New()
	root := &domain.Department{
		TenantID: tid, Code: "root", NameTR: "Org", Path: "root", Depth: 0, Active: true,
	}
	if err := repo.Create(ctx, nil, root); err != nil {
		t.Fatalf("create: %v", err)
	}
	if root.ID == uuid.Nil {
		t.Fatal("ID should be assigned")
	}
	dup := &domain.Department{TenantID: tid, Code: "root", NameTR: "Dup", Path: "dup", Active: true}
	if err := repo.Create(ctx, nil, dup); err != domain.ErrDuplicateCode {
		t.Fatalf("expected duplicate, got %v", err)
	}
	got, err := repo.GetByID(ctx, tid, root.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.NameTR != "Org" {
		t.Fatalf("name=%s", got.NameTR)
	}
	if err := repo.Archive(ctx, root.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
	if _, err := repo.GetByID(ctx, tid, root.ID); err != domain.ErrDepartmentNotFound {
		t.Fatalf("expected not found after archive, got %v", err)
	}
}

func TestFakeDepartmentSubtreeAndMove(t *testing.T) {
	repo := testsupport.NewFakeDepartmentRepo()
	ctx := context.Background()
	tid := uuid.New()
	nodes := []struct {
		code, path string
	}{
		{"root", "root"},
		{"tech", "root.tech"},
		{"backend", "root.tech.backend"},
		{"team_a", "root.tech.backend.team_a"},
		{"hr", "root.hr"},
	}
	for _, n := range nodes {
		if err := repo.Create(ctx, nil, &domain.Department{
			TenantID: tid, Code: n.code, NameTR: n.code, Path: n.path,
			Depth: domain.PathDepth(n.path), Active: true,
		}); err != nil {
			t.Fatalf("seed %s: %v", n.code, err)
		}
	}
	subtree, err := repo.GetSubtree(ctx, nil, tid, "root.tech")
	if err != nil {
		t.Fatalf("subtree: %v", err)
	}
	if len(subtree) != 3 {
		t.Fatalf("subtree size=%d want 3", len(subtree))
	}
	if err := repo.MovePaths(ctx, nil, tid, "root.tech", "root.eng"); err != nil {
		t.Fatalf("move: %v", err)
	}
	moved, _ := repo.GetSubtree(ctx, nil, tid, "root.eng")
	if len(moved) != 3 {
		t.Fatalf("after move size=%d want 3", len(moved))
	}
	for _, d := range moved {
		if len(d.Path) < 8 || d.Path[:8] != "root.eng" {
			t.Fatalf("unexpected path: %s", d.Path)
		}
	}
}

func TestCountActiveChildren(t *testing.T) {
	repo := testsupport.NewFakeDepartmentRepo()
	ctx := context.Background()
	tid := uuid.New()
	root := &domain.Department{TenantID: tid, Code: "root", NameTR: "R", Path: "root", Active: true}
	_ = repo.Create(ctx, nil, root)
	for i := 0; i < 3; i++ {
		code := "c" + string(rune('0'+i))
		pid := root.ID
		_ = repo.Create(ctx, nil, &domain.Department{
			TenantID: tid, ParentID: &pid, Code: code, NameTR: code,
			Path: "root." + code, Active: true,
		})
	}
	n, err := repo.CountActiveChildren(ctx, tid, root.ID)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if n != 3 {
		t.Fatalf("count=%d want 3", n)
	}
}
