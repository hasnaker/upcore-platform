package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/pdf"
	"github.com/upcore/bordrosvc/internal/service"
)

// SlipPDFHandler serves the single-slip PDF envelope.
type SlipPDFHandler struct {
	svc       *service.PayrollService
	workplace *service.WorkplaceService
}

// NewSlipPDFHandler constructs the handler.
func NewSlipPDFHandler(svc *service.PayrollService, workplace *service.WorkplaceService) *SlipPDFHandler {
	return &SlipPDFHandler{svc: svc, workplace: workplace}
}

// Download serves GET /slips/{id}/pdf — bordro zarfı PDF.
// Auth: admin OR owner employee (scope enforcement handled by repo RLS).
func (h *SlipPDFHandler) Download(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	slipID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	slip, err := h.svc.GetSlip(r.Context(), tid, slipID)
	if err != nil {
		WriteError(w, err)
		return
	}

	// Workplace header (if configured) pulled best-effort.
	workplaceUnvan := ""
	tenantName := "UpCore Tenant"
	tenantVKN := ""
	if h.workplace != nil {
		if wp, werr := h.workplace.Get(r.Context(), tid); werr == nil && wp != nil {
			workplaceUnvan = wp.Unvan
			tenantName = wp.Unvan
			tenantVKN = wp.VergiNo
		}
	}

	p := pdf.Payslip{
		TenantName:   tenantName,
		TenantTaxNo:  tenantVKN,
		EmployeeNo:   "-",
		EmployeeName: slip.EmployeeID.String()[:8],
		PeriodLabel:  monthLabel(slip.PeriodMonth) + " " + intToStr(slip.PeriodYear),
		Workplace:    workplaceUnvan,
		Slip:         slip,
		Items:        slip.Items,
	}

	body, err := pdf.Render(p)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "pdf_render_failed", Message: err.Error(),
		})
		return
	}

	fname := "bordro_" + slip.EmployeeID.String()[:8] + "_" +
		monthLabel(slip.PeriodMonth) + "_" + intToStr(slip.PeriodYear) + ".pdf"
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fname+"\"")
	_, _ = w.Write(body)
}

func monthLabel(m int) string {
	names := []string{
		"", "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
		"Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
	}
	if m >= 1 && m <= 12 {
		return names[m]
	}
	return ""
}
