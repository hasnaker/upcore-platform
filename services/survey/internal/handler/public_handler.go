package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/service"
)

// PublicHandler exposes token-authenticated public endpoints.
type PublicHandler struct {
	svc *service.ResponseService
	log zerolog.Logger
}

// NewPublicHandler constructs a PublicHandler.
func NewPublicHandler(svc *service.ResponseService, log zerolog.Logger) *PublicHandler {
	return &PublicHandler{svc: svc, log: log}
}

// GetSurveyByToken handles GET /api/v1/public/surveys/invitations/{token}.
func (h *PublicHandler) GetSurveyByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		WriteError(w, http.StatusBadRequest, "bad_request", "token required")
		return
	}

	survey, items, inv, err := h.svc.GetSurveyForToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, domain.ErrInvitationNotFound) || errors.Is(err, domain.ErrInvalidToken) {
			WriteError(w, http.StatusNotFound, "not_found", "invitation not found")
			return
		}
		if errors.Is(err, domain.ErrInvitationExpired) {
			WriteError(w, http.StatusGone, "expired", "invitation expired")
			return
		}
		WriteServerError(w, err)
		return
	}

	alreadySubmitted := inv.IsCompleted()

	WriteJSON(w, http.StatusOK, map[string]any{
		"survey":            survey,
		"items":             items,
		"closes_at":         inv.ExpiresAt,
		"already_submitted": alreadySubmitted,
	})
}

// submitRequest is the body for POST /api/v1/public/surveys/invitations/{token}/submit.
type submitRequest struct {
	Answers []service.AnswerInput `json:"answers"`
}

// SubmitResponse handles POST /api/v1/public/surveys/invitations/{token}/submit.
func (h *PublicHandler) SubmitResponse(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		WriteError(w, http.StatusBadRequest, "bad_request", "token required")
		return
	}

	var req submitRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	if len(req.Answers) == 0 {
		WriteError(w, http.StatusBadRequest, "bad_request", "answers required")
		return
	}

	resp, err := h.svc.SubmitByToken(r.Context(), token, req.Answers)
	if err != nil {
		if errors.Is(err, domain.ErrAlreadySubmitted) {
			WriteError(w, http.StatusConflict, "already_submitted", "response already submitted")
			return
		}
		if errors.Is(err, domain.ErrInvitationExpired) {
			WriteError(w, http.StatusGone, "expired", "invitation expired")
			return
		}
		if errors.Is(err, domain.ErrInvitationNotFound) {
			WriteError(w, http.StatusNotFound, "not_found", "invitation not found")
			return
		}
		WriteDomainError(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]any{
		"submitted_at": resp.CompletedAt,
	})
}
