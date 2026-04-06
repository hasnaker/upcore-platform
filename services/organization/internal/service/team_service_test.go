package service_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

func newTeamSvc(t *testing.T) (*service.TeamService, *event.InMemoryPublisher) {
	t.Helper()
	pub := event.NewInMemoryPublisher()
	return service.NewTeamService(testsupport.NewFakeTeamRepo(), pub, zerolog.Nop()), pub
}

func TestTeamCreate(t *testing.T) {
	svc, pub := newTeamSvc(t)
	tid := uuid.New()
	team, err := svc.Create(context.Background(), tid, service.CreateTeamInput{Name: "Squad Alpha"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if team.Name != "Squad Alpha" {
		t.Fatalf("name=%s", team.Name)
	}
	if pub.Count(event.TopicTeamCreated) != 1 {
		t.Fatal("missing event")
	}
}

func TestTeamAddRemoveMember(t *testing.T) {
	svc, pub := newTeamSvc(t)
	tid := uuid.New()
	team, _ := svc.Create(context.Background(), tid, service.CreateTeamInput{Name: "Squad"})
	emp := uuid.New()
	if _, err := svc.AddMember(context.Background(), tid, team.ID, service.AddMemberInput{EmployeeID: emp, Role: "lead"}); err != nil {
		t.Fatalf("add: %v", err)
	}
	members, err := svc.ListMembers(context.Background(), tid, team.ID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(members) != 1 {
		t.Fatalf("members=%d", len(members))
	}
	if err := svc.RemoveMember(context.Background(), tid, team.ID, emp); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if pub.Count(event.TopicTeamMemberAdded) != 1 || pub.Count(event.TopicTeamMemberRemoved) != 1 {
		t.Fatal("expected both events")
	}
}

func TestTeamArchive(t *testing.T) {
	svc, _ := newTeamSvc(t)
	tid := uuid.New()
	team, _ := svc.Create(context.Background(), tid, service.CreateTeamInput{Name: "X"})
	if err := svc.Archive(context.Background(), tid, team.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
}
