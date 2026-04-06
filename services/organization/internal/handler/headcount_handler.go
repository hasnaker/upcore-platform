package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
)

// HeadcountHandler serves /headcount routes.
type HeadcountHandler struct {
	svc *service.HeadcountService
	dep Dependencies
}

// NewHeadcountHandler creates a handler.
func NewHeadcountHandler(svc *service.HeadcountService, dep Dependencies) *HeadcountHandler {
	return &HeadcountHandler{svc: svc, dep: dep}
}

// GetCurrent handles GET /headcount.
func (h *HeadcountHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	report, err := h.svc.GetCurrent(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, report)
}

// GetByDepartments handles GET /headcount/departments.
func (h *HeadcountHandler) GetByDepartments(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	report, err := h.svc.GetCurrent(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": report.ByDepartment,
		"count": len(report.ByDepartment),
	})
}

// GetTrends handles GET /headcount/trends.
func (h *HeadcountHandler) GetTrends(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	q := r.URL.Query()
	period := strings.TrimSpace(q.Get("period"))
	months := 12
	if period != "" {
		months = parsePeriod(period)
	} else if v := q.Get("months"); v != "" {
		if m, err := strconv.Atoi(v); err == nil && m > 0 {
			months = m
		}
	}
	var deptID *uuid.UUID
	if v := q.Get("department_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			deptID = &id
		}
	}
	report, err := h.svc.GetTrend(r.Context(), tid, deptID, months)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, report)
}

// TakeSnapshot handles POST /headcount/snapshot.
func (h *HeadcountHandler) TakeSnapshot(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	var in struct {
		SnapshotDate *time.Time                `json:"snapshot_date,omitempty"`
		Counts       []service.DepartmentCount `json:"counts"`
	}
	if err := DecodeJSON(r, &in); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	date := time.Now().UTC()
	if in.SnapshotDate != nil {
		date = *in.SnapshotDate
	}
	if err := h.svc.CaptureSnapshot(r.Context(), tid, date, in.Counts); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusAccepted, map[string]any{
		"status":        "snapshotted",
		"snapshot_date": date,
		"departments":   len(in.Counts),
	})
}

// parsePeriod parses strings like "3m", "12m", "2y" into months.
func parsePeriod(period string) int {
	period = strings.ToLower(strings.TrimSpace(period))
	if period == "" {
		return 12
	}
	unit := period[len(period)-1]
	num, err := strconv.Atoi(period[:len(period)-1])
	if err != nil || num <= 0 {
		return 12
	}
	switch unit {
	case 'y':
		return num * 12
	case 'm':
		return num
	default:
		return 12
	}
}
