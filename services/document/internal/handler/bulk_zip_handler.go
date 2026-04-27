package handler

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/service"
)

// BulkZipHandler streams multiple documents as a single .zip download.
// Kullanım: IK çalışan dosyası dökümü, toplu arşiv, KVKK DSR response.
type BulkZipHandler struct {
	svc *service.DocumentService
}

// NewBulkZipHandler constructs the handler.
func NewBulkZipHandler(svc *service.DocumentService) *BulkZipHandler {
	return &BulkZipHandler{svc: svc}
}

// BulkZipRequest is POST body with a list of document IDs.
type BulkZipRequest struct {
	DocumentIDs []uuid.UUID `json:"document_ids"`
	ArchiveName string      `json:"archive_name,omitempty"`
}

// DownloadZip handles POST /documents/bulk-zip.
func (h *BulkZipHandler) DownloadZip(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req BulkZipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	if len(req.DocumentIDs) == 0 {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "empty_list"})
		return
	}
	if len(req.DocumentIDs) > 500 {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "too_many", Message: "max 500 dosya tek zipte",
		})
		return
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	for _, id := range req.DocumentIDs {
		doc, content, err := h.svc.GetWithContent(r.Context(), tid, id)
		if err != nil {
			// Skip inaccessible items (not authorized / deleted), continue
			continue
		}
		fname := doc.FileName
		if fname == "" {
			fname = fmt.Sprintf("%s.bin", id.String()[:8])
		}
		f, err := zw.Create(fname)
		if err != nil {
			continue
		}
		_, _ = io.Copy(f, bytes.NewReader(content))
	}

	if err := zw.Close(); err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{Error: "zip_close_failed"})
		return
	}

	name := req.ArchiveName
	if name == "" {
		name = "documents.zip"
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", name))
	_, _ = w.Write(buf.Bytes())
}
