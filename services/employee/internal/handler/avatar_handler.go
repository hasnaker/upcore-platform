package handler

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/service"
)

// AvatarHandler manages employee profile photos.
// Upload flow: multipart form → size/mime check → Azure Blob (implementation
// injected via Uploader) → DB update avatar_url.
type AvatarHandler struct {
	svc      *service.EmployeeService
	uploader Uploader
}

// Uploader abstracts the storage backend. In production this is an Azure
// Blob adapter; in dev a local-fs adapter. Returns the public (or signed)
// URL of the stored object.
type Uploader interface {
	Upload(ctx context.Context, key string, body io.Reader, contentType string) (string, error)
}

// NewAvatarHandler constructs the handler.
func NewAvatarHandler(svc *service.EmployeeService, up Uploader) *AvatarHandler {
	return &AvatarHandler{svc: svc, uploader: up}
}

// Upload handles POST /employees/{id}/avatar.
//
// Max 2MB, mime: image/jpeg | image/png | image/webp. The handler enforces
// the limits at the HTTP layer so oversized bodies are rejected early.
func (h *AvatarHandler) Upload(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 2<<20) // 2 MiB
	if err := r.ParseMultipartForm(2 << 20); err != nil {
		WriteJSON(w, http.StatusRequestEntityTooLarge, ErrorResponse{
			Error: "too_large", Message: "max 2 MB",
		})
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "no_file"})
		return
	}
	defer file.Close()

	mime := hdr.Header.Get("Content-Type")
	if !strings.HasPrefix(mime, "image/jpeg") &&
		!strings.HasPrefix(mime, "image/png") &&
		!strings.HasPrefix(mime, "image/webp") {
		WriteJSON(w, http.StatusUnsupportedMediaType, ErrorResponse{
			Error: "bad_mime", Message: "only jpeg/png/webp allowed",
		})
		return
	}

	key := fmt.Sprintf("avatars/%s/%s-%d%s", tid, id, time.Now().Unix(), extFor(mime))

	url, err := h.uploader.Upload(r.Context(), key, file, mime)
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
			Error: "upload_failed", Message: err.Error(),
		})
		return
	}
	if err := h.svc.UpdateAvatar(r.Context(), tid, id, url); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"avatar_url": url})
}

// Delete handles DELETE /employees/{id}/avatar — avatar_url NULL.
func (h *AvatarHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.UpdateAvatar(r.Context(), tid, id, ""); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func extFor(mime string) string {
	switch {
	case strings.HasPrefix(mime, "image/jpeg"):
		return ".jpg"
	case strings.HasPrefix(mime, "image/png"):
		return ".png"
	case strings.HasPrefix(mime, "image/webp"):
		return ".webp"
	}
	return ""
}
