package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/service"
)

// UploadHandler handles multipart document uploads.
type UploadHandler struct {
	svc      *service.DocumentService
	dep      Dependencies
	maxBytes int64
}

// NewUploadHandler constructs an UploadHandler. maxBytes is enforced by
// http.MaxBytesReader before the service-level guard.
func NewUploadHandler(svc *service.DocumentService, maxBytes int64, dep Dependencies) *UploadHandler {
	return &UploadHandler{svc: svc, dep: dep, maxBytes: maxBytes}
}

// Post handles POST /documents (multipart/form-data).
func (h *UploadHandler) Post(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)

	// Cap request body size at Handler level.
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

	category, err := domain.ParseDocType(r.FormValue("type"))
	if err != nil {
		WriteError(w, err)
		return
	}
	title := strings.TrimSpace(r.FormValue("name"))
	if title == "" {
		title = header.Filename
	}
	description := strVal(r.FormValue("description"))
	tags := splitCSV(r.FormValue("tags"))
	isConf := r.FormValue("is_confidential") != "false"
	var retention *time.Time
	if v := strings.TrimSpace(r.FormValue("expires_at")); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			if t2, err2 := time.Parse(time.RFC3339, v); err2 == nil {
				t = t2
			} else {
				WriteError(w, domain.ErrValidation)
				return
			}
		}
		retention = &t
	}

	var ownerEmp *uuid.UUID
	if v := r.FormValue("owner_employee_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			WriteError(w, domain.ErrValidation)
			return
		}
		ownerEmp = &id
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = service.MimeFromFilename(header.Filename)
	}

	doc, ver, err := h.svc.Upload(ctx, service.UploadRequest{
		TenantID:        tenantID,
		UploaderID:      userID,
		OwnerEmployeeID: ownerEmp,
		Category:        category,
		Title:           title,
		Description:     description,
		Tags:            tags,
		IsConfidential:  isConf,
		RetentionUntil:  retention,
		MimeType:        mimeType,
		Filename:        header.Filename,
		Body:            file,
		ContentLength:   header.Size,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{
		"id":          doc.ID,
		"version":     ver.Version,
		"blob_path":   ver.StorageKey,
		"size_bytes":  ver.SizeBytes,
		"checksum":    ver.ChecksumSHA256,
		"retention":   doc.RetentionUntil,
		"mime_type":   ver.MimeType,
	})
}

func strVal(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func splitCSV(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	raw := strings.Split(s, ",")
	out := make([]string, 0, len(raw))
	for _, r := range raw {
		r = strings.TrimSpace(r)
		if r != "" {
			out = append(out, r)
		}
	}
	return out
}
