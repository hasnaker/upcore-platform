package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
)

// HeadcountService produces headcount snapshots and trend reports.
type HeadcountService struct {
	headcount repository.HeadcountRepository
	depts     repository.DepartmentRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewHeadcountService creates a HeadcountService.
func NewHeadcountService(
	headcount repository.HeadcountRepository,
	depts repository.DepartmentRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *HeadcountService {
	return &HeadcountService{headcount: headcount, depts: depts, publisher: publisher, log: log}
}

// DepartmentCount is a single input to a snapshot.
type DepartmentCount struct {
	DepartmentID    uuid.UUID `json:"department_id"`
	TotalCount      int       `json:"total_count"`
	ActiveCount     int       `json:"active_count"`
	TerminatedCount int       `json:"terminated_count"`
}

// CaptureSnapshot upserts per-department snapshots for the given date.
func (s *HeadcountService) CaptureSnapshot(
	ctx context.Context,
	tenantID uuid.UUID,
	snapshotDate time.Time,
	counts []DepartmentCount,
) error {
	date := truncateDate(snapshotDate)
	now := time.Now().UTC()
	for _, c := range counts {
		snap := &domain.HeadcountSnapshot{
			TenantID:        tenantID,
			DepartmentID:    c.DepartmentID,
			SnapshotDate:    date,
			TotalCount:      c.TotalCount,
			ActiveCount:     c.ActiveCount,
			TerminatedCount: c.TerminatedCount,
			CreatedAt:       now,
		}
		if err := s.headcount.UpsertSnapshot(ctx, nil, snap); err != nil {
			return err
		}
	}
	_ = s.publisher.Publish(ctx, event.TopicHeadcountSnapshotted, map[string]any{
		"tenant_id":     tenantID,
		"snapshot_date": date,
		"departments":   len(counts),
	})
	return nil
}

// GetCurrent returns the latest headcount report.
func (s *HeadcountService) GetCurrent(ctx context.Context, tenantID uuid.UUID) (*domain.HeadcountReport, error) {
	snaps, err := s.headcount.GetLatestByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	depts, err := s.depts.List(ctx, tenantID, true)
	if err != nil {
		return nil, err
	}
	deptByID := map[uuid.UUID]*domain.Department{}
	for _, d := range depts {
		deptByID[d.ID] = d
	}
	report := &domain.HeadcountReport{TenantID: tenantID, ByDepartment: []domain.HeadcountDepartment{}}
	for _, s := range snaps {
		report.Total += s.TotalCount
		report.Active += s.ActiveCount
		report.Terminated += s.TerminatedCount
		if report.SnapshotDate.IsZero() {
			report.SnapshotDate = s.SnapshotDate
		}
		name := ""
		path := ""
		if d, ok := deptByID[s.DepartmentID]; ok {
			name = d.NameTR
			path = d.Path
		}
		report.ByDepartment = append(report.ByDepartment, domain.HeadcountDepartment{
			DepartmentID:   s.DepartmentID,
			DepartmentName: name,
			Path:           path,
			Total:          s.TotalCount,
			Active:         s.ActiveCount,
			Terminated:     s.TerminatedCount,
		})
	}
	return report, nil
}

// GetByDepartment returns the latest snapshot for a single department.
func (s *HeadcountService) GetByDepartment(ctx context.Context, tenantID, departmentID uuid.UUID) (*domain.HeadcountReport, error) {
	snaps, err := s.headcount.GetLatestByTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	report := &domain.HeadcountReport{TenantID: tenantID, ByDepartment: []domain.HeadcountDepartment{}}
	for _, s := range snaps {
		if s.DepartmentID != departmentID {
			continue
		}
		report.Total = s.TotalCount
		report.Active = s.ActiveCount
		report.Terminated = s.TerminatedCount
		report.SnapshotDate = s.SnapshotDate
		report.ByDepartment = append(report.ByDepartment, domain.HeadcountDepartment{
			DepartmentID: s.DepartmentID,
			Total:        s.TotalCount,
			Active:       s.ActiveCount,
			Terminated:   s.TerminatedCount,
		})
	}
	return report, nil
}

// GetTrend returns a time series of snapshots over the specified months.
func (s *HeadcountService) GetTrend(ctx context.Context, tenantID uuid.UUID, departmentID *uuid.UUID, months int) (*domain.TrendReport, error) {
	snaps, err := s.headcount.GetTrend(ctx, tenantID, departmentID, months)
	if err != nil {
		return nil, err
	}
	// Aggregate per date.
	byDate := map[time.Time]domain.TrendPoint{}
	for _, s := range snaps {
		p := byDate[s.SnapshotDate]
		p.Date = s.SnapshotDate
		p.TotalCount += s.TotalCount
		p.ActiveCount += s.ActiveCount
		p.TerminatedCount += s.TerminatedCount
		byDate[s.SnapshotDate] = p
	}
	points := make([]domain.TrendPoint, 0, len(byDate))
	for _, p := range byDate {
		points = append(points, p)
	}
	// Sort ascending by date.
	for i := 1; i < len(points); i++ {
		for j := i; j > 0 && points[j-1].Date.After(points[j].Date); j-- {
			points[j-1], points[j] = points[j], points[j-1]
		}
	}
	return &domain.TrendReport{
		TenantID:     tenantID,
		DepartmentID: departmentID,
		Months:       months,
		Points:       points,
	}, nil
}

func truncateDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}
