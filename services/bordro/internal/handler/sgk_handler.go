package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/sgk"
)

// SGKHandler exposes the e-Bildirge XML generation endpoints.
// Two modes:
//   1. Manual build — POST /sgk/{apb,igb,iab} caller supplies full payload.
//   2. Auto build from run — POST /runs/{id}/sgk/apb; service JOINs slips +
//      employees + workplace to produce the XML directly from DB state.
type SGKHandler struct {
	svc SGKBuilder
}

// SGKBuilder is the narrow interface SGKHandler depends on.
// Implemented by service.SGKService.
type SGKBuilder interface {
	BuildAPBForRun(ctx context.Context, tenantID, runID uuid.UUID) ([]byte, string, error)
	BuildIGBForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]byte, string, error)
}

// NewSGKHandler constructs the handler with auto-build service. Pass nil to
// disable the auto endpoints (manual-only mode).
func NewSGKHandler(svc SGKBuilder) *SGKHandler { return &SGKHandler{svc: svc} }

/* ─── APB (Aylık Prim ve Hizmet Belgesi) ─── */

// APBRequest — caller supplies workplace + period (YYYY-MM) + matrahlar.
type APBRequest struct {
	Workplace  sgk.Workplace     `json:"workplace"`
	PeriodYear int               `json:"period_year"`
	PeriodMonth int              `json:"period_month"`
	BelgeTuru  string            `json:"belge_turu,omitempty"`
	KanunTuru  string            `json:"kanun_turu,omitempty"`
	Matrahlar  []APBMatrahWire   `json:"matrahlar"`
}

// APBMatrahWire mirrors sgk.APBMatrah but keeps times as ISO strings
// for cleaner JSON wire format.
type APBMatrahWire struct {
	Employee       sgk.Employee `json:"employee_raw"`
	PrimGunSayisi  int          `json:"prim_gun_sayisi"`
	KazancTutari   float64      `json:"kazanc_tutari"`
	EksikGunKodu   string       `json:"eksik_gun_kodu,omitempty"`
	EksikGunSayisi int          `json:"eksik_gun_sayisi,omitempty"`
}

// APB handles POST /sgk/apb. Returns application/xml.
func (h *SGKHandler) APB(w http.ResponseWriter, r *http.Request) {
	if middleware.TenantID(r.Context()) == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req APBRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if req.PeriodYear == 0 || req.PeriodMonth == 0 {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "validation_error", Message: "period_year ve period_month zorunlu",
		})
		return
	}
	payload := sgk.APBPayload{
		Workplace: req.Workplace,
		Period:    time.Date(req.PeriodYear, time.Month(req.PeriodMonth), 1, 0, 0, 0, 0, time.UTC),
		BelgeTuru: req.BelgeTuru,
		KanunTuru: req.KanunTuru,
	}
	for _, m := range req.Matrahlar {
		payload.Matrahlar = append(payload.Matrahlar, sgk.APBMatrah{
			Employee:       m.Employee,
			PrimGunSayisi:  m.PrimGunSayisi,
			KazancTutari:   m.KazancTutari,
			EksikGunKodu:   m.EksikGunKodu,
			EksikGunSayisi: m.EksikGunSayisi,
		})
	}
	body, err := sgk.BuildAPBXML(payload)
	if err != nil {
		writeSGKError(w, err)
		return
	}
	writeXMLFile(w, body, sgk.SafeFilename(sgk.BildirgeAPB, req.Workplace.SicilNo,
		formatPeriod(req.PeriodYear, req.PeriodMonth)))
}

/* ─── İGB (İşe Giriş Bildirgesi) ─── */

// IGBRequest is the POST /sgk/igb body.
type IGBRequest struct {
	Workplace      sgk.Workplace `json:"workplace"`
	Employee       sgk.Employee  `json:"employee"`
	IseGirisTarihi string        `json:"ise_giris_tarihi"` // YYYY-MM-DD
	CalismaSekli   string        `json:"calisma_sekli,omitempty"`
	GorevKodu      string        `json:"gorev_kodu,omitempty"`
}

// IGB handles POST /sgk/igb.
func (h *SGKHandler) IGB(w http.ResponseWriter, r *http.Request) {
	if middleware.TenantID(r.Context()) == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req IGBRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	t, err := parseDate(req.IseGirisTarihi)
	if err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "validation_error", Message: "ise_giris_tarihi geçersiz",
		})
		return
	}
	payload := sgk.IGBPayload{
		Workplace:      req.Workplace,
		Employee:       req.Employee,
		IseGirisTarihi: t,
		CalismaSekli:   req.CalismaSekli,
		GorevKodu:      req.GorevKodu,
	}
	body, err := sgk.BuildIGBXML(payload)
	if err != nil {
		writeSGKError(w, err)
		return
	}
	writeXMLFile(w, body, sgk.SafeFilename(sgk.BildirgeIGB, req.Workplace.SicilNo,
		t.Format("20060102")+"_"+req.Employee.TCKN))
}

/* ─── İAB (İşten Ayrılış Bildirgesi) ─── */

// IABRequest is the POST /sgk/iab body.
type IABRequest struct {
	Workplace         sgk.Workplace `json:"workplace"`
	Employee          sgk.Employee  `json:"employee"`
	AyrilisTarihi     string        `json:"ayrilis_tarihi"` // YYYY-MM-DD
	AyrilisSebebiKodu string        `json:"ayrilis_sebebi_kodu"`
	SonKazancTutari   float64       `json:"son_kazanc_tutari,omitempty"`
	KidemTazminati    float64       `json:"kidem_tazminati,omitempty"`
	IhbarTazminati    float64       `json:"ihbar_tazminati,omitempty"`
}

// IAB handles POST /sgk/iab.
func (h *SGKHandler) IAB(w http.ResponseWriter, r *http.Request) {
	if middleware.TenantID(r.Context()) == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req IABRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	t, err := parseDate(req.AyrilisTarihi)
	if err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "validation_error", Message: "ayrilis_tarihi geçersiz",
		})
		return
	}
	payload := sgk.IABPayload{
		Workplace:         req.Workplace,
		Employee:          req.Employee,
		AyrilisTarihi:     t,
		AyrilisSebebiKodu: req.AyrilisSebebiKodu,
		SonKazancTutari:   req.SonKazancTutari,
		KidemTazminati:    req.KidemTazminati,
		IhbarTazminati:    req.IhbarTazminati,
	}
	body, err := sgk.BuildIABXML(payload)
	if err != nil {
		writeSGKError(w, err)
		return
	}
	writeXMLFile(w, body, sgk.SafeFilename(sgk.BildirgeIAB, req.Workplace.SicilNo,
		t.Format("20060102")+"_"+req.Employee.TCKN))
}

/* ─── helpers ─── */

func writeXMLFile(w http.ResponseWriter, body []byte, filename string) {
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func writeSGKError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, sgk.ErrMissingWorkplace),
		errors.Is(err, sgk.ErrMissingEmployee),
		errors.Is(err, sgk.ErrInvalidTCKN),
		errors.Is(err, sgk.ErrNoEmployees),
		errors.Is(err, sgk.ErrInvalidPeriod):
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()})
	default:
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
	}
}

func parseDate(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, errors.New("empty")
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	return time.Parse("2006-01-02", s)
}

func formatPeriod(year, month int) string {
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("200601")
}

/* ─── Auto endpoints (DB-driven, no payload needed) ─── */

// APBFromRun handles POST /runs/{id}/sgk/apb — builds APB from persisted slips + workplace.
func (h *SGKHandler) APBFromRun(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		WriteJSON(w, http.StatusNotImplemented, ErrorResponse{Error: "not_implemented"})
		return
	}
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	runID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	body, filename, err := h.svc.BuildAPBForRun(r.Context(), tid, runID)
	if err != nil {
		writeAutoSGKError(w, err)
		return
	}
	writeXMLFile(w, body, filename)
}

// IGBForEmployee handles POST /employees/{id}/sgk/igb — builds İGB from employee record.
func (h *SGKHandler) IGBForEmployee(w http.ResponseWriter, r *http.Request) {
	if h.svc == nil {
		WriteJSON(w, http.StatusNotImplemented, ErrorResponse{Error: "not_implemented"})
		return
	}
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	body, filename, err := h.svc.BuildIGBForEmployee(r.Context(), tid, empID)
	if err != nil {
		writeAutoSGKError(w, err)
		return
	}
	writeXMLFile(w, body, filename)
}

func writeAutoSGKError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()})
	case errors.Is(err, domain.ErrInvalidStatus):
		WriteJSON(w, http.StatusConflict, ErrorResponse{Error: "invalid_status", Message: err.Error()})
	case errors.Is(err, domain.ErrValidation),
		errors.Is(err, sgk.ErrMissingWorkplace),
		errors.Is(err, sgk.ErrMissingEmployee),
		errors.Is(err, sgk.ErrInvalidTCKN),
		errors.Is(err, sgk.ErrNoEmployees):
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()})
	default:
		// Workplace missing surfaces as a plain error chain — 412 is a fit.
		if err != nil && err.Error() != "" && containsWord(err.Error(), "workplace") {
			WriteJSON(w, http.StatusPreconditionFailed, ErrorResponse{Error: "workplace_missing", Message: err.Error()})
			return
		}
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: err.Error()})
	}
}

func containsWord(s, w string) bool {
	if len(w) == 0 {
		return false
	}
	for i := 0; i+len(w) <= len(s); i++ {
		if s[i:i+len(w)] == w {
			return true
		}
	}
	return false
}
