package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

func newOrgSvc(t *testing.T) (*service.OrgService, *testsupport.FakeDepartmentRepo, *event.InMemoryPublisher) {
	t.Helper()
	depts := testsupport.NewFakeDepartmentRepo()
	pub := event.NewInMemoryPublisher()
	svc := service.NewOrgService(service.NoopTxRunner{}, depts, pub, 7, zerolog.Nop())
	return svc, depts, pub
}

func seed(t *testing.T, svc *service.OrgService, tid uuid.UUID, code, name string, parent *uuid.UUID) *domain.Department {
	t.Helper()
	d, err := svc.Create(context.Background(), tid, service.CreateDepartmentInput{
		Code: code, NameTR: name, ParentID: parent,
	})
	if err != nil {
		t.Fatalf("seed %s: %v", code, err)
	}
	return d
}

func TestCreateRootDepartment(t *testing.T) {
	svc, _, pub := newOrgSvc(t)
	tid := uuid.New()
	d := seed(t, svc, tid, "root", "Organization", nil)
	if d.Path != "root" {
		t.Fatalf("path=%s", d.Path)
	}
	if d.Depth != 0 {
		t.Fatalf("depth=%d", d.Depth)
	}
	if d.ParentID != nil {
		t.Fatal("root should have no parent")
	}
	if pub.Count(event.TopicDepartmentCreated) != 1 {
		t.Fatal("missing created event")
	}
}

func TestCreateChildDepartment(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Teknoloji", &root.ID)
	if tech.Path != "root.tech" {
		t.Fatalf("path=%s", tech.Path)
	}
	if tech.Depth != 1 {
		t.Fatalf("depth=%d", tech.Depth)
	}
	backend := seed(t, svc, tid, "backend", "Backend", &tech.ID)
	if backend.Path != "root.tech.backend" {
		t.Fatalf("path=%s", backend.Path)
	}
}

func TestCreateDuplicateCodeRejected(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	_ = seed(t, svc, tid, "tech", "Teknoloji", nil)
	_, err := svc.Create(context.Background(), tid, service.CreateDepartmentInput{Code: "tech", NameTR: "Dup"})
	if !errors.Is(err, domain.ErrDuplicateCode) {
		t.Fatalf("expected ErrDuplicateCode, got %v", err)
	}
}

func TestMaxDepthEnforced(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	// MaxDepth = 7; create chain of 7 deep (depth 0..6) then the 8th should fail.
	codes := []string{"l0", "l1", "l2", "l3", "l4", "l5", "l6"}
	var parent *uuid.UUID
	for _, c := range codes {
		d := seed(t, svc, tid, c, "L", parent)
		parent = &d.ID
	}
	_, err := svc.Create(context.Background(), tid, service.CreateDepartmentInput{Code: "toodeep", NameTR: "X", ParentID: parent})
	if !errors.Is(err, domain.ErrMaxDepthExceeded) {
		t.Fatalf("expected max depth, got %v", err)
	}
}

func TestGetTree(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Tech", &root.ID)
	_ = seed(t, svc, tid, "backend", "Backend", &tech.ID)
	_ = seed(t, svc, tid, "frontend", "Frontend", &tech.ID)
	_ = seed(t, svc, tid, "hr", "HR", &root.ID)

	tree, err := svc.GetTree(context.Background(), tid)
	if err != nil {
		t.Fatalf("tree: %v", err)
	}
	if len(tree) != 1 {
		t.Fatalf("expected 1 root, got %d", len(tree))
	}
	if len(tree[0].Children) != 2 {
		t.Fatalf("expected 2 children under root, got %d", len(tree[0].Children))
	}
}

func TestMoveSubtree(t *testing.T) {
	svc, _, pub := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Tech", &root.ID)
	backend := seed(t, svc, tid, "backend", "BE", &tech.ID)
	_ = seed(t, svc, tid, "teama", "TeamA", &backend.ID)
	eng := seed(t, svc, tid, "eng", "Engineering", &root.ID)

	if err := svc.Move(context.Background(), tid, tech.ID, &eng.ID); err != nil {
		t.Fatalf("move: %v", err)
	}
	// Fetch subtree descendants and verify paths moved.
	descendants, err := svc.GetSubtree(context.Background(), tid, tech.ID)
	if err != nil {
		t.Fatalf("subtree: %v", err)
	}
	for _, d := range descendants {
		if d.Path[:8] != "root.eng" {
			t.Fatalf("path not moved: %s", d.Path)
		}
	}
	if pub.Count(event.TopicDepartmentMoved) != 1 {
		t.Fatal("missing moved event")
	}
}

func TestMoveCycleDetected(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Tech", &root.ID)
	backend := seed(t, svc, tid, "backend", "BE", &tech.ID)
	// Moving tech under backend would create a cycle.
	err := svc.Move(context.Background(), tid, tech.ID, &backend.ID)
	if !errors.Is(err, domain.ErrCycleDetected) {
		t.Fatalf("expected cycle, got %v", err)
	}
	// Moving into itself.
	err = svc.Move(context.Background(), tid, tech.ID, &tech.ID)
	if !errors.Is(err, domain.ErrCycleDetected) {
		t.Fatalf("expected self cycle, got %v", err)
	}
}

func TestArchiveBlockedIfHasChildren(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	_ = seed(t, svc, tid, "tech", "Tech", &root.ID)
	err := svc.Archive(context.Background(), tid, root.ID)
	if !errors.Is(err, domain.ErrDepartmentHasChildren) {
		t.Fatalf("expected has-children, got %v", err)
	}
}

func TestArchiveLeafSucceeds(t *testing.T) {
	svc, _, pub := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Tech", &root.ID)
	if err := svc.Archive(context.Background(), tid, tech.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
	if pub.Count(event.TopicDepartmentDeleted) != 1 {
		t.Fatal("missing deleted event")
	}
}

func TestListAndGetAncestors(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	tech := seed(t, svc, tid, "tech", "Tech", &root.ID)
	backend := seed(t, svc, tid, "backend", "BE", &tech.ID)

	items, err := svc.List(context.Background(), tid, false)
	if err != nil || len(items) != 3 {
		t.Fatalf("list: %d %v", len(items), err)
	}
	anc, err := svc.GetAncestors(context.Background(), tid, backend.ID)
	if err != nil {
		t.Fatalf("ancestors: %v", err)
	}
	if len(anc) != 2 {
		t.Fatalf("expected 2 ancestors, got %d", len(anc))
	}
}

func TestUpdateDepartment(t *testing.T) {
	svc, _, _ := newOrgSvc(t)
	tid := uuid.New()
	root := seed(t, svc, tid, "root", "Organization", nil)
	newName := "Updated"
	updated, err := svc.Update(context.Background(), tid, root.ID, service.UpdateDepartmentInput{NameTR: &newName})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.NameTR != "Updated" {
		t.Fatalf("name=%s", updated.NameTR)
	}
}
