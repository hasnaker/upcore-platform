package handler

import (
	"bytes"
	"io"
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// ImportHandler exposes POST /employees/import and the validate/commit pair
// used by the onboarding wizard.
type ImportHandler struct {
	svc      *service.ImportService
	maxBytes int64
}

// NewImportHandler constructs the handler with a max upload size.
func NewImportHandler(svc *service.ImportService, maxMB int) *ImportHandler {
	if maxMB <= 0 {
		maxMB = 10
	}
	return &ImportHandler{svc: svc, maxBytes: int64(maxMB) << 20}
}

// Import handles POST /employees/import (multipart/form-data, field "file").
// Parses the CSV, validates, and persists the rows in one pass.
func (h *ImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, h.maxBytes)
	if err := r.ParseMultipartForm(h.maxBytes); err != nil {
		WriteError(w, domain.ErrCSVTooLarge)
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "missing 'file' field"})
		return
	}
	defer file.Close()
	res, err := h.svc.ImportCSV(r.Context(), tid, middleware.UserIDFromContext(r.Context()), file)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// Validate handles POST /employees/import/validate — parses the uploaded
// CSV, runs row-level validation, and returns row errors + a summary
// *without* persisting anything. Designed for the onboarding wizard Step 4
// "dry-run" preview. Returns the same ImportResult shape as Import, but
// the backing implementation doesn't touch the database.
func (h *ImportHandler) Validate(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, h.maxBytes)
	if err := r.ParseMultipartForm(h.maxBytes); err != nil {
		WriteError(w, domain.ErrCSVTooLarge)
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "missing 'file' field"})
		return
	}
	defer file.Close()

	// Buffer the file so the service can replay it after validation if the
	// caller decides to commit. We cap at maxBytes to keep memory bounded.
	buf, berr := io.ReadAll(file)
	if berr != nil {
		WriteError(w, berr)
		return
	}
	res, verr := h.svc.ValidateCSV(r.Context(), tid, bytes.NewReader(buf))
	if verr != nil {
		WriteError(w, verr)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// Commit handles POST /employees/import/commit — same shape as Import but
// exists to keep the wizard's two-phase flow symmetrical: Validate first,
// Commit second.
func (h *ImportHandler) Commit(w http.ResponseWriter, r *http.Request) {
	h.Import(w, r)
}
