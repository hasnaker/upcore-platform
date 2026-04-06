package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// ImportHandler exposes POST /employees/import.
type ImportHandler struct {
	svc       *service.ImportService
	maxBytes  int64
}

// NewImportHandler constructs the handler with a max upload size.
func NewImportHandler(svc *service.ImportService, maxMB int) *ImportHandler {
	if maxMB <= 0 {
		maxMB = 10
	}
	return &ImportHandler{svc: svc, maxBytes: int64(maxMB) << 20}
}

// Import handles POST /employees/import (multipart/form-data, field "file").
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
