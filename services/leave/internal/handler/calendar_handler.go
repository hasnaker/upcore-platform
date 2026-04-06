package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/upcore/leave/internal/middleware"
	"github.com/upcore/leave/internal/service"
)

// CalendarHandler serves calendar + holidays endpoints.
type CalendarHandler struct {
	svc *service.CalendarService
	dep Dependencies
}

// NewCalendarHandler constructs a CalendarHandler.
func NewCalendarHandler(svc *service.CalendarService, dep Dependencies) *CalendarHandler {
	return &CalendarHandler{svc: svc, dep: dep}
}

// Holidays handles GET /leaves/holidays?year=2026.
func (h *CalendarHandler) Holidays(w http.ResponseWriter, r *http.Request) {
	year := time.Now().UTC().Year()
	if y := r.URL.Query().Get("year"); y != "" {
		if n, err := strconv.Atoi(y); err == nil {
			year = n
		}
	}
	holidays := h.svc.Holidays(r.Context(), year)
	WriteJSON(w, http.StatusOK, map[string]any{"year": year, "items": holidays})
}

// ICS handles GET /leaves/calendar.ics?start=2026-01-01&end=2026-12-31.
func (h *CalendarHandler) ICS(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	now := time.Now().UTC()
	start := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(now.Year(), 12, 31, 0, 0, 0, 0, time.UTC)
	if s := r.URL.Query().Get("start"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			start = t
		}
	}
	if s := r.URL.Query().Get("end"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			end = t
		}
	}
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="upcore-leaves.ics"`)
	w.WriteHeader(http.StatusOK)
	_ = h.svc.WriteICS(r.Context(), tid, start, end, w)
}
