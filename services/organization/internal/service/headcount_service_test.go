package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

func TestHeadcountCaptureAndRead(t *testing.T) {
	pub := event.NewInMemoryPublisher()
	depts := testsupport.NewFakeDepartmentRepo()
	hc := testsupport.NewFakeHeadcountRepo()
	svc := service.NewHeadcountService(hc, depts, pub, zerolog.Nop())
	tid := uuid.New()
	d1 := uuid.New()
	d2 := uuid.New()

	now := time.Now().UTC()
	counts := []service.DepartmentCount{
		{DepartmentID: d1, TotalCount: 10, ActiveCount: 9, TerminatedCount: 1},
		{DepartmentID: d2, TotalCount: 5, ActiveCount: 5, TerminatedCount: 0},
	}
	if err := svc.CaptureSnapshot(context.Background(), tid, now, counts); err != nil {
		t.Fatalf("capture: %v", err)
	}
	if pub.Count(event.TopicHeadcountSnapshotted) != 1 {
		t.Fatal("missing event")
	}
	report, err := svc.GetCurrent(context.Background(), tid)
	if err != nil {
		t.Fatalf("current: %v", err)
	}
	if report.Total != 15 {
		t.Fatalf("total=%d want 15", report.Total)
	}
	if report.Active != 14 {
		t.Fatalf("active=%d want 14", report.Active)
	}
	if len(report.ByDepartment) != 2 {
		t.Fatalf("by dept=%d", len(report.ByDepartment))
	}
}

func TestHeadcountTrend(t *testing.T) {
	pub := event.NewInMemoryPublisher()
	depts := testsupport.NewFakeDepartmentRepo()
	hc := testsupport.NewFakeHeadcountRepo()
	svc := service.NewHeadcountService(hc, depts, pub, zerolog.Nop())
	tid := uuid.New()
	d := uuid.New()
	for i := 0; i < 3; i++ {
		day := time.Now().UTC().AddDate(0, 0, -i*30)
		_ = svc.CaptureSnapshot(context.Background(), tid, day, []service.DepartmentCount{
			{DepartmentID: d, TotalCount: 10 + i, ActiveCount: 10 + i},
		})
	}
	report, err := svc.GetTrend(context.Background(), tid, &d, 6)
	if err != nil {
		t.Fatalf("trend: %v", err)
	}
	if len(report.Points) < 3 {
		t.Fatalf("points=%d want >=3", len(report.Points))
	}
}
