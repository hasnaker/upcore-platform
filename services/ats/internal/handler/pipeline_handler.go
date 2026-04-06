package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/service"
)

// PipelineHandler exposes pipeline stage and kanban endpoints.
type PipelineHandler struct {
	pipelineSvc *service.PipelineService
	dep         Dependencies
}

// NewPipelineHandler constructs a PipelineHandler.
func NewPipelineHandler(pipelineSvc *service.PipelineService, dep Dependencies) *PipelineHandler {
	return &PipelineHandler{pipelineSvc: pipelineSvc, dep: dep}
}

// GetBoard handles GET /api/v1/ats/requisitions/{id}/board.
func (h *PipelineHandler) GetBoard(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	board, err := h.pipelineSvc.GetBoard(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, board)
}

// ListStages handles GET /api/v1/ats/pipeline/stages.
func (h *PipelineHandler) ListStages(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	stages, err := h.pipelineSvc.ListStages(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, stages)
}

// CreateStage handles POST /api/v1/ats/pipeline/stages.
func (h *PipelineHandler) CreateStage(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.CreateStageRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.pipelineSvc.CreateCustomStage(r.Context(), tid, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, result)
}

// UpdateStage handles PATCH /api/v1/ats/pipeline/stages/{id}.
func (h *PipelineHandler) UpdateStage(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req service.UpdateStageRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	result, err := h.pipelineSvc.UpdateStage(r.Context(), tid, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, result)
}

// ReorderStages handles POST /api/v1/ats/pipeline/stages/reorder.
func (h *PipelineHandler) ReorderStages(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req service.ReorderStagesRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.pipelineSvc.ReorderStages(r.Context(), tid, req.Order); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetFunnelAnalytics handles GET /api/v1/ats/analytics/funnel.
func (h *PipelineHandler) GetFunnelAnalytics(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	reqID := ParseUUIDQuery(r, "requisition_id")
	if reqID == nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "requisition_id required"})
		return
	}

	counts, err := h.pipelineSvc.Applications().CountByStage(r.Context(), *reqID)
	if err != nil {
		WriteError(w, err)
		return
	}

	total := 0
	for _, c := range counts {
		total += c
	}

	get := func(s domain.Stage) int { return counts[s] }
	convRate := func(s domain.Stage) float64 {
		if total == 0 {
			return 0
		}
		return float64(counts[s]) / float64(total) * 100
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"applied":      get(domain.StageApplied),
		"screened":     get(domain.StageScreened),
		"assessed":     get(domain.StageAssessed),
		"interviewed":  get(domain.StageInterviewed),
		"offered":      get(domain.StageOffered),
		"hired":        get(domain.StageHired),
		"rejected":     get(domain.StageRejected),
		"withdrawn":    get(domain.StageWithdrawn),
		"conversion_rates": map[string]float64{
			"screened":    convRate(domain.StageScreened),
			"assessed":    convRate(domain.StageAssessed),
			"interviewed": convRate(domain.StageInterviewed),
			"offered":     convRate(domain.StageOffered),
			"hired":       convRate(domain.StageHired),
		},
	})
}

// GetTimeToHire handles GET /api/v1/ats/analytics/time-to-hire.
func (h *PipelineHandler) GetTimeToHire(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	stats, err := h.pipelineSvc.Applications().GetTimeInStageStats(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"stages": stats,
	})
}
