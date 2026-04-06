package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

func newReorgSvc(t *testing.T) (*service.ReorgService, *event.InMemoryPublisher) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	return service.NewReorgService(testsupport.NewFakeReportingRepo(), pub, zerolog.Nop()), pub
}

func TestSetManagerBasic(t *testing.T) {
	svc, pub := newReorgSvc(t)
	tid := uuid.New()
	emp := uuid.New()
	mgr := uuid.New()
	line, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{
		EmployeeID: emp, ManagerID: mgr, Type: "solid",
	})
	if err != nil {
		t.Fatalf("set manager: %v", err)
	}
	if line.Type != domain.LineSolid {
		t.Fatalf("type=%s", line.Type)
	}
	if pub.Count(event.TopicReportingChanged) != 1 {
		t.Fatal("missing event")
	}
}

func TestSetManagerSelf(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	id := uuid.New()
	_, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{
		EmployeeID: id, ManagerID: id, Type: "solid",
	})
	if !errors.Is(err, domain.ErrSelfManager) {
		t.Fatalf("expected self-manager, got %v", err)
	}
}

func TestSetManagerCycle(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	a := uuid.New()
	b := uuid.New()
	c := uuid.New()
	// a -> b -> c (solid chain)
	if _, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: a, ManagerID: b, Type: "solid"}); err != nil {
		t.Fatalf("a->b: %v", err)
	}
	if _, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: b, ManagerID: c, Type: "solid"}); err != nil {
		t.Fatalf("b->c: %v", err)
	}
	// Making c -> a would cycle.
	_, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: c, ManagerID: a, Type: "solid"})
	if !errors.Is(err, domain.ErrManagerCycle) {
		t.Fatalf("expected cycle, got %v", err)
	}
}

func TestSetManagerReplacesExisting(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	emp := uuid.New()
	mgr1 := uuid.New()
	mgr2 := uuid.New()
	line1, _ := svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: emp, ManagerID: mgr1, Type: "solid"})
	time.Sleep(time.Millisecond)
	_, err := svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: emp, ManagerID: mgr2, Type: "solid"})
	if err != nil {
		t.Fatalf("replace: %v", err)
	}
	current, err := svc.GetCurrentManager(context.Background(), tid, emp)
	if err != nil {
		t.Fatalf("get current: %v", err)
	}
	if current.ManagerID != mgr2 {
		t.Fatalf("expected mgr2, got %s", current.ManagerID)
	}
	if current.ID == line1.ID {
		t.Fatal("first line should have been ended")
	}
}

func TestGetDirectReports(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	mgr := uuid.New()
	e1 := uuid.New()
	e2 := uuid.New()
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: e1, ManagerID: mgr, Type: "solid"})
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: e2, ManagerID: mgr, Type: "dotted"})
	solid, _ := svc.GetDirectReports(context.Background(), tid, mgr, false)
	if len(solid) != 1 {
		t.Fatalf("solid only=%d want 1", len(solid))
	}
	all, _ := svc.GetDirectReports(context.Background(), tid, mgr, true)
	if len(all) != 2 {
		t.Fatalf("all=%d want 2", len(all))
	}
}

func TestGetTeamTree(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	ceo := uuid.New()
	vp := uuid.New()
	dir := uuid.New()
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: vp, ManagerID: ceo, Type: "solid"})
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: dir, ManagerID: vp, Type: "solid"})
	tree, err := svc.GetTeamTree(context.Background(), tid, ceo)
	if err != nil {
		t.Fatalf("team tree: %v", err)
	}
	if len(tree.Children) != 1 {
		t.Fatalf("expected 1 child of ceo, got %d", len(tree.Children))
	}
	if len(tree.Children[0].Children) != 1 {
		t.Fatalf("expected 1 grandchild")
	}
}

func TestGetMatrix(t *testing.T) {
	svc, _ := newReorgSvc(t)
	tid := uuid.New()
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: uuid.New(), ManagerID: uuid.New(), Type: "solid"})
	_, _ = svc.SetManager(context.Background(), tid, service.SetManagerInput{EmployeeID: uuid.New(), ManagerID: uuid.New(), Type: "dotted"})
	matrix, err := svc.GetMatrix(context.Background(), tid)
	if err != nil {
		t.Fatalf("matrix: %v", err)
	}
	if len(matrix) != 1 {
		t.Fatalf("expected 1 dotted, got %d", len(matrix))
	}
}
