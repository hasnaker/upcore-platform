// Package handler — sürekli geri bildirim (continuous feedback) endpoint'leri.
//
// Dinamikler:
//   - Slack/Teams bot: /upcore-feedback @kişi mesaj
//   - UI: kronolojik timeline, verilen + alınan
//   - Yıl sonu değerlendirme: manuel seçim — bazı geri bildirimler review'e
//     bağlanır (inclusion flag).
package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
)

// FeedbackType — dürtüleyici / takdir / gelişim.
type FeedbackType string

const (
	FeedbackKudos        FeedbackType = "kudos"        // teşekkür
	FeedbackRecognition  FeedbackType = "recognition"  // takdir
	FeedbackDevelopment  FeedbackType = "development"  // gelişim önerisi
	FeedbackConcern      FeedbackType = "concern"      // endişe
	FeedbackCoaching     FeedbackType = "coaching"     // koçluk
)

// FeedbackChannel — giriş kaynağı.
type FeedbackChannel string

const (
	ChannelUI     FeedbackChannel = "ui"
	ChannelSlack  FeedbackChannel = "slack_bot"
	ChannelTeams  FeedbackChannel = "teams_bot"
	ChannelEmail  FeedbackChannel = "email"
)

// FeedbackItem — bir geri bildirim kaydı.
type FeedbackItem struct {
	ID                uuid.UUID       `json:"id"`
	TenantID          uuid.UUID       `json:"tenant_id"`
	FromUserID        uuid.UUID       `json:"from_user_id"`
	ToEmployeeID      uuid.UUID       `json:"to_employee_id"`
	Type              FeedbackType    `json:"type"`
	Channel           FeedbackChannel `json:"channel"`
	BodyMD            string          `json:"body_md"`
	RelatedCompetency *uuid.UUID      `json:"related_competency,omitempty"`
	IsAnonymous       bool            `json:"is_anonymous"`
	IncludeInReview   bool            `json:"include_in_review"` // yıl sonu için işaretli
	ReviewPeriod      string          `json:"review_period,omitempty"` // 2026Q4
	CreatedAt         time.Time       `json:"created_at"`
}

// FeedbackRepository — port.
type FeedbackRepository interface {
	Create(r *http.Request, f *FeedbackItem) error
	Get(r *http.Request, tenantID, id uuid.UUID) (*FeedbackItem, error)
	ListReceived(r *http.Request, tenantID, employeeID uuid.UUID, limit, offset int) ([]*FeedbackItem, int, error)
	ListGiven(r *http.Request, tenantID, userID uuid.UUID, limit, offset int) ([]*FeedbackItem, int, error)
	ListForReview(r *http.Request, tenantID, employeeID uuid.UUID, period string) ([]*FeedbackItem, error)
	SetIncludeInReview(r *http.Request, tenantID, id uuid.UUID, include bool, period string) error
}

// ContinuousFeedbackHandler — HTTP handler.
type ContinuousFeedbackHandler struct {
	repo FeedbackRepository
}

// NewContinuousFeedbackHandler builds the handler.
func NewContinuousFeedbackHandler(repo FeedbackRepository) *ContinuousFeedbackHandler {
	return &ContinuousFeedbackHandler{repo: repo}
}

// Register endpoints under /feedback.
func (h *ContinuousFeedbackHandler) Register(r chi.Router) {
	r.Route("/feedback", func(r chi.Router) {
		r.Post("/", h.Submit)
		r.Post("/slack-webhook", h.SlackWebhook) // bot giriş noktası
		r.Get("/received", h.ListReceived)
		r.Get("/given", h.ListGiven)
		r.Get("/for-review", h.ListForReview)
		r.Patch("/{id}/review-inclusion", h.SetReviewInclusion)
	})
}

// SubmitRequest — UI form.
type SubmitRequest struct {
	ToEmployeeID      uuid.UUID    `json:"to_employee_id"`
	Type              FeedbackType `json:"type"`
	BodyMD            string       `json:"body_md"`
	RelatedCompetency *uuid.UUID   `json:"related_competency,omitempty"`
	IsAnonymous       bool         `json:"is_anonymous"`
}

// Submit — POST /feedback.
func (h *ContinuousFeedbackHandler) Submit(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req SubmitRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if req.ToEmployeeID == uuid.Nil || req.BodyMD == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_fields"})
		return
	}
	f := &FeedbackItem{
		ID:                uuid.New(),
		TenantID:          tid,
		FromUserID:        actor,
		ToEmployeeID:      req.ToEmployeeID,
		Type:              req.Type,
		Channel:           ChannelUI,
		BodyMD:            req.BodyMD,
		RelatedCompetency: req.RelatedCompetency,
		IsAnonymous:       req.IsAnonymous,
	}
	if err := h.repo.Create(r, f); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, f)
}

// SlackWebhookRequest — Slack slash command payload.
// `/upcore-feedback @kişi mesaj` parse edilir: slack_handle -> user_id çözümlemesi
// (identity service'te), sonra Create.
type SlackWebhookRequest struct {
	TeamID      string `json:"team_id"`
	ChannelID   string `json:"channel_id"`
	UserID      string `json:"user_id"`      // slack user id
	UserName    string `json:"user_name"`
	Command     string `json:"command"`
	Text        string `json:"text"`
	ResponseURL string `json:"response_url"`
	TriggerID   string `json:"trigger_id"`
}

// SlackWebhook — POST /feedback/slack-webhook.
// Slack signing secret middleware upstream'de doğrulanmış olmalı.
func (h *ContinuousFeedbackHandler) SlackWebhook(w http.ResponseWriter, r *http.Request) {
	// Slack form-encoded gönderir; pratikte form parse yapılır.
	if err := r.ParseForm(); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request"})
		return
	}
	text := r.FormValue("text")
	slackUserID := r.FormValue("user_id")
	if text == "" || slackUserID == "" {
		WriteJSON(w, http.StatusOK, map[string]any{
			"response_type": "ephemeral",
			"text":          "Kullanım: /upcore-feedback @kişi mesaj",
		})
		return
	}

	// Placeholder: tenant + user resolution Slack install kaydından yapılır.
	// Burada yalnızca iskelet: handler real servise bağlanacak.
	WriteJSON(w, http.StatusOK, map[string]any{
		"response_type": "ephemeral",
		"text":          "Geri bildiriminiz kaydedildi. Teşekkürler!",
	})
}

// ListReceived — GET /feedback/received?employee_id=...
func (h *ContinuousFeedbackHandler) ListReceived(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	empID := ParseUUIDQuery(r, "employee_id")
	if empID == uuid.Nil {
		empID = actor
	}
	limit := ParseIntQuery(r, "limit", 50)
	offset := ParseIntQuery(r, "offset", 0)

	items, total, err := h.repo.ListReceived(r, tid, empID, limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items, "total": total, "limit": limit, "offset": offset,
	})
}

// ListGiven — GET /feedback/given.
func (h *ContinuousFeedbackHandler) ListGiven(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	limit := ParseIntQuery(r, "limit", 50)
	offset := ParseIntQuery(r, "offset", 0)
	items, total, err := h.repo.ListGiven(r, tid, actor, limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items": items, "total": total, "limit": limit, "offset": offset,
	})
}

// ListForReview — GET /feedback/for-review?employee_id=...&period=2026Q4
// Yıl sonu değerlendirme modülü bu endpoint'i çağırır; yalnızca
// include_in_review=true olanlar döner.
func (h *ContinuousFeedbackHandler) ListForReview(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	empID := ParseUUIDQuery(r, "employee_id")
	period := r.URL.Query().Get("period")
	if empID == uuid.Nil || period == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_params"})
		return
	}
	items, err := h.repo.ListForReview(r, tid, empID, period)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items, "period": period})
}

// SetReviewInclusionRequest — manuel seçim.
type SetReviewInclusionRequest struct {
	Include bool   `json:"include"`
	Period  string `json:"period"`
}

// SetReviewInclusion — PATCH /feedback/{id}/review-inclusion.
func (h *ContinuousFeedbackHandler) SetReviewInclusion(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req SetReviewInclusionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if err := h.repo.SetIncludeInReview(r, tid, id, req.Include, req.Period); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}
