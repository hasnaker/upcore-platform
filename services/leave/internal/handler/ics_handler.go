package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/service"
)

// ICSHandler exposes /calendar.ics for leave requests so employees can
// subscribe from their native calendar apps (Google Cal / Outlook / Apple).
type ICSHandler struct {
	svc *service.LeaveService
}

// NewICSHandler constructs the handler.
func NewICSHandler(svc *service.LeaveService) *ICSHandler {
	return &ICSHandler{svc: svc}
}

// Export serves GET /calendar.ics. Requires tenant + user context; returns
// the user's own approved leave as VEVENTs. Subscribe URL includes a
// rotating token so the user can revoke without exposing credentials.
func (h *ICSHandler) Export(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	uid := middleware.UserIDFromContext(r.Context())
	if tid == uuid.Nil || uid == uuid.Nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// ListApprovedForUser: uid currently treated as employee_id. When auth
	// middleware injects employee_id separately, swap here.
	events, err := h.svc.ListApprovedForUser(r.Context(), tid, uid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var b strings.Builder
	b.WriteString("BEGIN:VCALENDAR\r\n")
	b.WriteString("VERSION:2.0\r\n")
	b.WriteString("PRODID:-//UpCore//UpCore HR//TR\r\n")
	b.WriteString("CALSCALE:GREGORIAN\r\n")
	b.WriteString("METHOD:PUBLISH\r\n")
	b.WriteString("X-WR-CALNAME:UpCore İzinlerim\r\n")

	for _, e := range events {
		b.WriteString("BEGIN:VEVENT\r\n")
		b.WriteString(fmt.Sprintf("UID:%s@upcore.app\r\n", e.ID))
		b.WriteString(fmt.Sprintf("DTSTAMP:%s\r\n", time.Now().UTC().Format("20060102T150405Z")))
		b.WriteString(fmt.Sprintf("DTSTART;VALUE=DATE:%s\r\n", e.Start.Format("20060102")))
		b.WriteString(fmt.Sprintf("DTEND;VALUE=DATE:%s\r\n", e.End.AddDate(0, 0, 1).Format("20060102")))
		b.WriteString(fmt.Sprintf("SUMMARY:%s\r\n", icsEscape(e.Title)))
		if e.Description != "" {
			b.WriteString(fmt.Sprintf("DESCRIPTION:%s\r\n", icsEscape(e.Description)))
		}
		b.WriteString("STATUS:CONFIRMED\r\n")
		b.WriteString("TRANSP:TRANSPARENT\r\n")
		b.WriteString("END:VEVENT\r\n")
	}
	b.WriteString("END:VCALENDAR\r\n")

	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", "inline; filename=\"upcore-izin.ics\"")
	w.Header().Set("Cache-Control", "public, max-age=300")
	_, _ = w.Write([]byte(b.String()))
}

func icsEscape(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, ",", "\\,")
	s = strings.ReplaceAll(s, ";", "\\;")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}
