package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/service"
)

// DownloadHandler serves signed-URL redirect endpoints.
type DownloadHandler struct {
	svc *service.DocumentService
	dep Dependencies
}

// NewDownloadHandler constructs a DownloadHandler.
func NewDownloadHandler(svc *service.DocumentService, dep Dependencies) *DownloadHandler {
	return &DownloadHandler{svc: svc, dep: dep}
}

// Get handles GET /documents/{id}/download.
// Honors `?redirect=false` for clients that want the raw URL in JSON.
func (h *DownloadHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tenantID := middleware.TenantIDFromContext(ctx)
	userID := middleware.UserIDFromContext(ctx)
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		WriteError(w, domain.ErrValidation)
		return
	}
	url, err := h.svc.Download(ctx, tenantID, id, userID)
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
