package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/bordro"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/service"
)

// BankTransferHandler exposes the batch payment file download.
type BankTransferHandler struct {
	svc *service.BankTransferService
}

// NewBankTransferHandler constructs the handler.
func NewBankTransferHandler(svc *service.BankTransferService) *BankTransferHandler {
	return &BankTransferHandler{svc: svc}
}

// Download handles GET /runs/{id}/bank-transfer?format=ing&sender_iban=...&value_date=2026-05-03.
// Returns the raw file with a Content-Disposition header. If some employees
// lack an IBAN, they're exposed in a JSON-encoded X-Missing-IBAN header.
func (h *BankTransferHandler) Download(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	runID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	format := bordro.BankTransferFormat(r.URL.Query().Get("format"))
	if !format.IsValid() {
		format = bordro.BankFormatGeneric
	}
	senderIBAN := r.URL.Query().Get("sender_iban")
	if senderIBAN == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "missing_sender_iban",
			Message: "sender_iban query parameter is required (şirket gönderen hesap IBAN'ı)",
		})
		return
	}
	var valueDate time.Time
	if v := r.URL.Query().Get("value_date"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			valueDate = t
		}
	}

	res, err := h.svc.Build(r.Context(), tid, runID, format, senderIBAN, valueDate)
	if err != nil {
		WriteError(w, err)
		return
	}
	if res.RowCount == 0 {
		WriteJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error":        "no_valid_rows",
			"message":      "Tüm çalışanların IBAN'ı eksik — transfer dosyası üretilemedi",
			"missing_iban": res.Missing,
		})
		return
	}

	// Preview mode: client explicitly requests JSON summary.
	if r.URL.Query().Get("preview") == "true" {
		WriteJSON(w, http.StatusOK, map[string]any{
			"file_name":    res.FileName,
			"row_count":    res.RowCount,
			"total_net":    res.TotalNet,
			"missing_iban": res.Missing,
		})
		return
	}

	w.Header().Set("Content-Type", res.MimeType)
	w.Header().Set("Content-Disposition", "attachment; filename=\""+res.FileName+"\"")
	w.Header().Set("X-Row-Count", intToStr(res.RowCount))
	w.Header().Set("X-Missing-IBAN-Count", intToStr(len(res.Missing)))
	_, _ = w.Write(res.Body)
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	buf := make([]byte, 0, 10)
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		return "-" + string(buf)
	}
	return string(buf)
}
