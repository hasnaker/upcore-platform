package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
)

// OnboardingHandler exposes the wizard progress + commit endpoints.
type OnboardingHandler struct {
	svc *service.OnboardingService
	dep Dependencies
}

// NewOnboardingHandler constructs the handler.
func NewOnboardingHandler(svc *service.OnboardingService, dep Dependencies) *OnboardingHandler {
	return &OnboardingHandler{svc: svc, dep: dep}
}

// Register mounts the onboarding routes. Caller is responsible for any auth
// middleware; this service expects the Clerk user ID in the X-User-ID header
// (set by the API gateway) but falls back to a body field for the wizard's
// server-action flow.
func (h *OnboardingHandler) Register(r chi.Router) {
	r.Get("/onboarding/progress", h.Get)
	r.Post("/onboarding/progress/{step}", h.SaveStep)
	r.Post("/onboarding/commit", h.Commit)
	r.Post("/onboarding/abandon", h.Abandon)
	r.Get("/admin/onboarding/funnel", h.Funnel)
}

// Get returns the current user's in-progress draft, creating one if needed.
func (h *OnboardingHandler) Get(w http.ResponseWriter, r *http.Request) {
	clerkUID, email, err := clerkIdentity(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	d, err := h.svc.GetOrCreate(r.Context(), clerkUID, email)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// SaveStep merges the payload for the given step number into the draft.
func (h *OnboardingHandler) SaveStep(w http.ResponseWriter, r *http.Request) {
	clerkUID, email, err := clerkIdentity(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	stepStr := chi.URLParam(r, "step")
	step, convErr := strconv.Atoi(stepStr)
	if convErr != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "step must be 1-10"})
		return
	}
	var payload domain.OnboardingData
	if derr := DecodeJSON(r, &payload); derr != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: derr.Error()})
		return
	}
	d, err := h.svc.UpsertProgress(r.Context(), service.UpsertProgressInput{
		ClerkUserID: clerkUID,
		AdminEmail:  email,
		Step:        step,
		Payload:     payload,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, d)
}

// commitRequest is the optional body for POST /onboarding/commit. All fields
// are optional — if DraftID is absent, the in-progress draft for the user
// is used.
type commitRequest struct {
	DraftID string `json:"draft_id,omitempty"`
}

// Commit finalizes the draft into a tenant + subscription.
func (h *OnboardingHandler) Commit(w http.ResponseWriter, r *http.Request) {
	clerkUID, _, err := clerkIdentity(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	var req commitRequest
	if r.ContentLength > 0 {
		if derr := DecodeJSON(r, &req); derr != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: derr.Error()})
			return
		}
	}
	in := service.CommitInput{ClerkUserID: clerkUID}
	if req.DraftID != "" {
		id, perr := uuid.Parse(req.DraftID)
		if perr != nil {
			WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid draft_id"})
			return
		}
		in.DraftID = id
	}
	res, err := h.svc.Commit(r.Context(), in)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

// Abandon marks the in-progress draft abandoned.
func (h *OnboardingHandler) Abandon(w http.ResponseWriter, r *http.Request) {
	clerkUID, _, err := clerkIdentity(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := h.svc.Abandon(r.Context(), clerkUID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}

// Funnel returns the admin funnel dashboard aggregate.
func (h *OnboardingHandler) Funnel(w http.ResponseWriter, r *http.Request) {
	days := 30
	if s := r.URL.Query().Get("days"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 365 {
			days = n
		}
	}
	agg, err := h.svc.Funnel(r.Context(), days)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, agg)
}

// clerkIdentity extracts the Clerk user ID + email for the onboarding flow.
// Accepts either the API gateway headers (X-Clerk-User-ID + X-Clerk-Email)
// or falls back to X-User-ID (a UUID) with the email from X-Clerk-Email.
// Returns unauthorized otherwise.
func clerkIdentity(r *http.Request) (string, string, error) {
	uid := strings.TrimSpace(r.Header.Get("X-Clerk-User-ID"))
	if uid == "" {
		uid = strings.TrimSpace(r.Header.Get("X-User-ID"))
	}
	if uid == "" {
		// Fall back to context-set UUID for services running behind RequireAuth.
		if ctxUID := middleware.UserIDFromContext(r.Context()); ctxUID != uuid.Nil {
			uid = ctxUID.String()
		}
	}
	if uid == "" {
		return "", "", domain.ErrUnauthorized
	}
	email := strings.TrimSpace(r.Header.Get("X-Clerk-Email"))
	if email == "" {
		email = strings.TrimSpace(r.Header.Get("X-User-Email"))
	}
	return uid, email, nil
}
