package service

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/leave/internal/calculator"
	"github.com/upcore/leave/internal/domain"
	"github.com/upcore/leave/internal/repository"
)

// CalendarService exposes calendar-related read operations (holidays + ICS export).
type CalendarService struct {
	requests repository.LeaveRequestRepository
}

// NewCalendarService constructs a CalendarService.
func NewCalendarService(requests repository.LeaveRequestRepository) *CalendarService {
	return &CalendarService{requests: requests}
}

// Holidays returns Turkish official holidays for the given year.
func (s *CalendarService) Holidays(_ context.Context, year int) []calculator.Holiday {
	if year == 0 {
		year = time.Now().UTC().Year()
	}
	return calculator.TurkishPublicHolidays(year)
}

// TeamOverlapPct returns the percentage of a team on leave on a given date.
func (s *CalendarService) TeamOverlapPct(ctx context.Context, tenantID uuid.UUID, teamMemberIDs []uuid.UUID, date time.Time) (float64, error) {
	if len(teamMemberIDs) == 0 {
		return 0, nil
	}
	requests, err := s.requests.ListForEmployees(ctx, tenantID, teamMemberIDs, date, date)
	if err != nil {
		return 0, err
	}
	onLeave := map[uuid.UUID]bool{}
	for _, r := range requests {
		if r.Status == domain.StatusApproved || r.Status == domain.StatusTaken ||
			r.Status == domain.StatusManagerApproved {
			onLeave[r.EmployeeID] = true
		}
	}
	return float64(len(onLeave)) * 100.0 / float64(len(teamMemberIDs)), nil
}

// WriteICS writes an RFC-5545 iCalendar feed of approved/taken leaves for
// the tenant in a given window. It contains VEVENTs with Turkish timezone
// handling (Europe/Istanbul).
func (s *CalendarService) WriteICS(ctx context.Context, tenantID uuid.UUID, start, end time.Time, w io.Writer) error {
	reqs, err := s.requests.ListByDateRange(ctx, tenantID, start, end)
	if err != nil {
		return err
	}
	var b strings.Builder
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//Upcore//Leave Service//TR\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("X-WR-CALNAME:Upcore İzin Takvimi\r\n")
	b.WriteString("X-WR-TIMEZONE:Europe/Istanbul\r\n")
	for _, r := range reqs {
		b.WriteString("BEGIN:VEVENT\r\n")
		fmt.Fprintf(&b, "UID:%s@upcore.io\r\n", r.ID.String())
		fmt.Fprintf(&b, "DTSTAMP:%s\r\n", time.Now().UTC().Format("20060102T150405Z"))
		// All-day events — DATE value type, DTEND is exclusive so add 1 day.
		fmt.Fprintf(&b, "DTSTART;VALUE=DATE:%s\r\n", r.StartDate.Format("20060102"))
		fmt.Fprintf(&b, "DTEND;VALUE=DATE:%s\r\n", r.EndDate.AddDate(0, 0, 1).Format("20060102"))
		fmt.Fprintf(&b, "SUMMARY:İzin - %s\r\n", strings.ToUpper(string(r.Status)))
		fmt.Fprintf(&b, "STATUS:%s\r\n", icsStatus(r.Status))
		b.WriteString("END:VEVENT\r\n")
	}
	b.WriteString("END:VCALENDAR\r\n")
	_, err = io.WriteString(w, b.String())
	return err
}

func icsStatus(s domain.LeaveStatus) string {
	switch s {
	case domain.StatusApproved, domain.StatusTaken:
		return "CONFIRMED"
	case domain.StatusCancelled, domain.StatusRejected:
		return "CANCELLED"
	default:
		return "TENTATIVE"
	}
}
