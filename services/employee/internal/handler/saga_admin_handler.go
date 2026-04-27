package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/saga"
)

// SagaAdminHandler exposes operator endpoints for the saga orchestrator.
type SagaAdminHandler struct {
	repo saga.AdminRepository
	orch *saga.Orchestrator
	// Registry of known saga definitions by name — retry dispatches to the
	// right definition based on the persisted saga_name.
	definitions map[string]saga.Definition
}

// NewSagaAdminHandler constructs the handler. All known definitions must be
// passed so Retry can re-run the correct chain for any persisted instance.
func NewSagaAdminHandler(
	repo saga.AdminRepository,
	orch *saga.Orchestrator,
	defs ...saga.Definition,
) *SagaAdminHandler {
	m := make(map[string]saga.Definition, len(defs))
	for _, d := range defs {
		m[d.Name] = d
	}
	return &SagaAdminHandler{repo: repo, orch: orch, definitions: m}
}

// Stats handles GET /api/v1/saga/stats.
func (h *SagaAdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	s, err := h.repo.Stats(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, s)
}

// List handles GET /api/v1/saga?status=failed&saga_name=onboarding_v1&page=0&limit=50.
func (h *SagaAdminHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	status := r.URL.Query().Get("status")
	sagaName := r.URL.Query().Get("saga_name")
	page := ParseIntQuery(r, "page", 0)
	limit := ParseIntQuery(r, "limit", 50)
	items, total, err := h.repo.List(r.Context(), tid, status, sagaName, limit, page*limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Get handles GET /api/v1/saga/{id} — instance + step log.
func (h *SagaAdminHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	inst, steps, err := h.repo.Get(r.Context(), tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"instance": inst, "steps": steps})
}

// Retry handles POST /api/v1/saga/{id}/retry — resets state and inline re-runs
// the orchestrator from the last successful step. Returns the updated instance.
func (h *SagaAdminHandler) Retry(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}

	// 1. Load the persisted instance (and its full step payload).
	inst, _, err := h.repo.Get(r.Context(), tid, id)
	if err != nil {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{
			Error: "not_found", Message: err.Error(),
		})
		return
	}
	def, known := h.definitions[inst.SagaName]
	if !known {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error:   "unknown_saga",
			Message: "no definition registered for saga_name " + inst.SagaName,
		})
		return
	}

	// 2. Reset state to 'running' so orchestrator can resume.
	if err := h.repo.MarkForRetry(r.Context(), tid, id); err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "retry_failed", Message: err.Error(),
		})
		return
	}

	// 3. Rehydrate the saga state from the persisted payload + rerun inline.
	//    The orchestrator's Start() idempotency short-circuit is OK here —
	//    it will detect the existing instance, but since we've reset
	//    current_step via MarkForRetry (actually we haven't, MarkForRetry
	//    only resets status), we directly re-enter run() by resuming.
	state := saga.State{
		TenantID:      tid,
		AggregateID:   inst.AggregateID,
		CorrelationID: derefOrEmpty(inst.CorrelationID),
		Data:          parsePayload(inst.Payload),
	}
	retried, rerr := h.orch.Resume(r.Context(), def, inst, state)
	if rerr != nil {
		WriteJSON(w, http.StatusOK, map[string]any{
			"ok":      false,
			"status":  retried.Status,
			"message": rerr.Error(),
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"ok":           true,
		"saga_id":      retried.ID,
		"status":       retried.Status,
		"current_step": retried.CurrentStep,
		"total_steps":  retried.TotalSteps,
	})
}

func derefOrEmpty(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func parsePayload(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	_ = json.Unmarshal(raw, &out)
	return out
}

// Cancel handles POST /api/v1/saga/{id}/cancel.
func (h *SagaAdminHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.repo.Cancel(r.Context(), tid, id); err != nil {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error: "cancel_failed", Message: err.Error(),
		})
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}
