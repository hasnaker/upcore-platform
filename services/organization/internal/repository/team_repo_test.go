package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/testsupport"
)

func TestFakeTeamRepoLifecycle(t *testing.T) {
	repo := testsupport.NewFakeTeamRepo()
	ctx := context.Background()
	tid := uuid.New()
	team := &domain.Team{TenantID: tid, Name: "Alpha", Active: true}
	if err := repo.Create(ctx, nil, team); err != nil {
		t.Fatalf("create: %v", err)
	}
	if team.ID == uuid.Nil {
		t.Fatal("id unset")
	}
	got, err := repo.GetByID(ctx, tid, team.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Alpha" {
		t.Fatalf("name=%s", got.Name)
	}
	// Members
	emp := uuid.New()
	if err := repo.AddMember(ctx, nil, &domain.TeamMember{
		TeamID: team.ID, EmployeeID: emp, TenantID: tid, Role: domain.TeamRoleMember, JoinedAt: time.Now(),
	}); err != nil {
		t.Fatalf("add member: %v", err)
	}
	members, err := repo.ListMembers(ctx, tid, team.ID)
	if err != nil || len(members) != 1 {
		t.Fatalf("members: %d %v", len(members), err)
	}
	if err := repo.RemoveMember(ctx, tid, team.ID, emp); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if err := repo.Archive(ctx, tid, team.ID); err != nil {
		t.Fatalf("archive: %v", err)
	}
	if _, err := repo.GetByID(ctx, tid, team.ID); err != domain.ErrTeamNotFound {
		t.Fatalf("expected not found, got %v", err)
	}
}
