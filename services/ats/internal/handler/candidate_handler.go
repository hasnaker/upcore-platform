package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/repository"
	"github.com/upcore/ats/internal/service"
)

// CandidateHandler exposes candidate endpoints.
type CandidateHandler struct {
	svc *service.CandidateService
	dep Dependencies
}

// NewCandidateHandler constructs a CandidateHandler.
func NewCandidateHandler(svc *service.CandidateService, dep Dependencies) *CandidateHandler {
	return &CandidateHandler{svc: svc, dep: dep}
}

// List handles GET /api/v1/ats/candidates.
func (h *CandidateHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	f := repository.CandidateFilter{
		TenantID: tid,
		Search:   r.URL.Query().Get("q"),
		Source:   r.URL.Query().Get("source"),
		Page:     ParseIntQuery(r, "page", 1),
		Limit:    ParseIntQuery(r, "limit", 50),
	}
	items, total, err := h.svc.List(r.Context(), f)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  f.Page,
		"limit": f.Limit,
	})
}

// Create handles POST /api/v1/ats/candidates.
func (h *CandidateHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateCandidateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Create(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// Get handles GET /api/v1/ats/candidates/{id}.
func (h *CandidateHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	result, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Patch handles PATCH /api/v1/ats/candidates/{id}.
func (h *CandidateHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.UpdateCandidateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.Update(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// Delete handles DELETE /api/v1/ats/candidates/{id} (GDPR hard delete).
func (h *CandidateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UploadCV handles POST /api/v1/ats/candidates/{id}/cv (placeholder).
func (h *CandidateHandler) UploadCV(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	// Verify candidate exists.
	if _, err := h.svc.Get(r.Context(), tid, id); err != nil {
		WriteError(w, err)
		return
	}
	// In production, this would upload to Azure Blob and trigger parsing.
	WriteJSON(w, http.StatusAccepted, map[string]any{"parse_started": true})
}

// DownloadCV handles GET /api/v1/ats/candidates/{id}/cv/download (placeholder).
func (h *CandidateHandler) DownloadCV(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	c, err := h.svc.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	if c.CVBlobPath == nil || *c.CVBlobPath == "" {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "not_found", Message: "no CV uploaded"})
		return
	}
	// In production, would generate a SAS URL and redirect.
	http.Redirect(w, r, *c.CVBlobPath, http.StatusFound)
}

// AddTags handles POST /api/v1/ats/candidates/{id}/tags.
func (h *CandidateHandler) AddTags(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.TagsRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.svc.AddTags(r.Context(), tid, id, req.Tags)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}
