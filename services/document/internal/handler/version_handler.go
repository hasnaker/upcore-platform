package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/service"
)

// VersionHandler serves endpoints under /documents/{id}/versions.
type VersionHandler struct {
	svc      *service.VersionService
	dep      Dependencies
	maxBytes int64
}

// NewVersionHandler constructs a VersionHandler.
func NewVersionHandler(svc *service.VersionService, maxBytes int64, dep Dependencies) *VersionHandler {
	return &VersionHandler{svc: svc, dep: dep, maxBytes: maxBytes}
}

// List handles GET /documents/{id}/versions.
func (h *VersionHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	items, err := h.svc.ListVersions(ctx, tenantID, docID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// Create handles POST /documents/{id}/versions (multipart).
func (h *VersionHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)
	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, h.maxBytes+1024)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			WriteError(w, domain.ErrFileTooLarge)
			return
		}
		WriteError(w, domain.ErrValidation)
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			_ = r.MultipartForm.RemoveAll()
		}
	}()
	file, header, err := r.FormFile("file")
	if err != nil {
		WriteError(w, domain.ErrEmptyFile)
		return
	}
	defer file.Close()
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = service.MimeFromFilename(header.Filename)
	}
	notes := strVal(r.FormValue("notes"))
	ver, err := h.svc.CreateVersion(ctx, service.VersionUploadRequest{
		TenantID:   tenantID,
		DocumentID: docID,
		UploaderID: userID,
		MimeType:   mimeType,
		Filename:   header.Filename,
		Notes:      notes,
		Body:       file,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, ver)
}

// Download handles GET /documents/{id}/versions/{version}/download.
func (h *VersionHandler) Download(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)
	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	versionStr := chi.URLParam(r, "version")
	v, err := strconv.Atoi(versionStr)
	if err != nil || v <= 0 {
		WriteError(w, domain.ErrValidation)
		return
	}
	url, err := h.svc.DownloadVersion(ctx, tenantID, docID, v, userID)
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.URL.Query().Get("redirect") == "false" {
		WriteJSON(w, http.StatusOK, map[string]string{"url": url})
		return
	}
	http.Redirect(w, r, url, http.StatusFound)
}

// Restore handles POST /documents/{id}/versions/{version}/restore.
func (h *VersionHandler) Restore(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)
	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	v, err := strconv.Atoi(chi.URLParam(r, "version"))
	if err != nil || v <= 0 {
		WriteError(w, domain.ErrValidation)
		return
	}
	ver, err := h.svc.RestoreVersion(ctx, tenantID, docID, v, userID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, ver)
}
