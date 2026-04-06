package handler

import (
	"net/http"

	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// RecommenderHandler exposes recommendation endpoints.
type RecommenderHandler struct {
	svc *service.RecommenderService
	log zerolog.Logger
}

// NewRecommenderHandler constructs a RecommenderHandler.
func NewRecommenderHandler(svc *service.RecommenderService, log zerolog.Logger) *RecommenderHandler {
	return &RecommenderHandler{svc: svc, log: log}
}

// Recommend handles POST /interventions/recommend.
func (h *RecommenderHandler) Recommend(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())

	var req service.RecommendRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	req.TenantID = tid

	recs, err := h.svc.Recommend(r.Context(), req)
	if err != nil {
		WriteDomainError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, recs)
}
