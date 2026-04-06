package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

func newPosSvc(t *testing.T) (*service.PositionService, *event.InMemoryPublisher) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	return service.NewPositionService(testsupport.NewFakePositionRepo(), pub, zerolog.Nop()), pub
}

func validCreatePosition() service.CreatePositionInput {
	lvl := "senior"
	return service.CreatePositionInput{
		Code:     "be-eng",
		TitleTR:  "Backend Mühendisi",
		JobLevel: &lvl,
		Demands:  domain.JDRDemands{Workload: 7, Emotional: 4, Cognitive: 8, TimePressure: 6, RoleConflict: 3, RoleAmbiguity: 3},
		Resources: domain.JDRResources{Autonomy: 8, Feedback: 7, SocialSupport: 7, Growth: 8, SkillVariety: 8, TaskSignificance: 7},
	}
}

func TestPositionCreate(t *testing.T) {
	svc, pub := newPosSvc(t)
	tid := uuid.New()
	p, err := svc.Create(context.Background(), tid, validCreatePosition())
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if p.Code != "be-eng" {
		t.Fatalf("code=%s", p.Code)
	}
	if p.SalaryCurrency != "TRY" {
		t.Fatalf("default currency should be TRY, got %s", p.SalaryCurrency)
	}
	if pub.Count(event.TopicPositionCreated) != 1 {
		t.Fatal("missing created event")
	}
}

func TestPositionCreateInvalidJDR(t *testing.T) {
	svc, _ := newPosSvc(t)
	tid := uuid.New()
	in := validCreatePosition()
	in.Demands.Workload = 99
	_, err := svc.Create(context.Background(), tid, in)
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestPositionCreateDuplicateCode(t *testing.T) {
	svc, _ := newPosSvc(t)
	tid := uuid.New()
	if _, err := svc.Create(context.Background(), tid, validCreatePosition()); err != nil {
		t.Fatalf("first: %v", err)
	}
	_, err := svc.Create(context.Background(), tid, validCreatePosition())
	if !errors.Is(err, domain.ErrDuplicateCode) {
		t.Fatalf("expected duplicate, got %v", err)
	}
}

func TestPositionUpdateJDR(t *testing.T) {
	svc, pub := newPosSvc(t)
	tid := uuid.New()
	p, _ := svc.Create(context.Background(), tid, validCreatePosition())
	newDemands := domain.JDRDemands{Workload: 5, Emotional: 5, Cognitive: 5, TimePressure: 5, RoleConflict: 5, RoleAmbiguity: 5}
	newRes := domain.JDRResources{Autonomy: 9, Feedback: 9, SocialSupport: 9, Growth: 9, SkillVariety: 9, TaskSignificance: 9}
	updated, err := svc.UpdateJDR(context.Background(), tid, p.ID, newDemands, newRes)
	if err != nil {
		t.Fatalf("update jdr: %v", err)
	}
	if updated.JDRDemands.Workload != 5 {
		t.Fatalf("demands not updated")
	}
	if pub.Count(event.TopicPositionJDRChanged) != 1 {
		t.Fatal("missing jdr event")
	}
}

func TestPositionList(t *testing.T) {
	svc, _ := newPosSvc(t)
	tid := uuid.New()
	for i := 0; i < 5; i++ {
		in := validCreatePosition()
		in.Code = "pos-" + string(rune('a'+i))
		if _, err := svc.Create(context.Background(), tid, in); err != nil {
			t.Fatalf("create %d: %v", i, err)
		}
	}
	items, total, err := svc.List(context.Background(), tid, repository.PositionFilter{Limit: 3})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 5 {
		t.Fatalf("total=%d want 5", total)
	}
	if len(items) != 3 {
		t.Fatalf("page items=%d want 3", len(items))
	}
}

func TestPositionArchive(t *testing.T) {
	svc, pub := newPosSvc(t)
	tid := uuid.New()
	p, _ := svc.Create(context.Background(), tid, validCreatePosition())
	if err := svc.Archive(context.Background(), tid, p.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
	if pub.Count(event.TopicPositionDeleted) != 1 {
		t.Fatal("missing deleted event")
	}
	if _, err := svc.Get(context.Background(), tid, p.ID); !errors.Is(err, domain.ErrPositionNotFound) {
		t.Fatalf("expected not found after archive, got %v", err)
	}
}
