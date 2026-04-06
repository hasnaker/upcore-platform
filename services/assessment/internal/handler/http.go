// Package handler exposes HTTP handlers for the assessment service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/config"
	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/middleware"
	"github.com/upcore/assessment/internal/service"
)

// Deps is the bundle of dependencies handlers need.
type Deps struct {
	Cfg               *config.Config
	AssessmentService *service.AssessmentService
	AuthChecker       *middleware.AuthChecker
	Log               zerolog.Logger
}

// NewRouter builds the chi router with all routes.
func NewRouter(d *Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.StripSlashes)
	r.Use(middleware.RequestLogger(d.Log))
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(d.Cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   d.Cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Tenant-ID", "X-User-ID", "X-User-Role"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.TenantInjector)

	validate := validator.New(validator.WithRequiredStructEnabled())
	h := NewAssessmentHandler(d.AssessmentService, d.Log, validate)

	// Health probes
	r.Get("/health", handleHealth)
	r.Get("/ready", handleReady)

	// Candidate (token-based) endpoints — no JWT required
	r.Route("/api/v1/assessments/candidate/{token}", func(r chi.Router) {
		r.Get("/", h.GetByToken)
		r.Post("/responses", h.SubmitCandidateResponses)
	})

	// Authenticated endpoints
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.RequireAuth(d.AuthChecker))
		r.Route("/assessments", func(r chi.Router) {
			r.Post("/", h.Create)
			r.Get("/", h.List)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", h.Get)
				r.Post("/sessions", h.StartSession)
				r.Get("/sessions/{sid}", h.ResumeSession)
				r.Post("/responses", h.SubmitResponses)
				r.Post("/complete", h.Complete)
				r.Get("/results", h.GetResults)
				r.Post("/report", h.TriggerReport)
			})
		})
	})

	return r
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "assessment",
		"time":    time.Now().UTC(),
	})
}

func handleReady(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":  "ready",
		"service": "assessment",
	})
}

// ErrorResponse is the uniform error payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteJSON writes v as JSON.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError writes an error response with a mapped HTTP status.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON body with a 2MB limit.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 2<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// ParseUUID extracts a UUID from string and writes a 400 on failure.
func ParseUUID(w http.ResponseWriter, s string) (uuid.UUID, bool) {
	id, err := uuid.Parse(s)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid uuid"})
		return uuid.Nil, false
	}
	return id, true
}

// ParseIntQuery returns the named query int or fallback.
func ParseIntQuery(r *http.Request, name string, fallback int) int {
	s := strings.TrimSpace(r.URL.Query().Get(name))
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return fallback
	}
	return v
}

func mapError(err error) (int, ErrorResponse) {
	if err == nil {
		return http.StatusOK, ErrorResponse{}
	}
	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		return http.StatusUnprocessableEntity, ErrorResponse{
			Error:  "validation_error",
			Fields: ve.Fields,
		}
	}
	var vErr validator.ValidationErrors
	if errors.As(err, &vErr) {
		fields := map[string]string{}
		for _, fe := range vErr {
			fields[strings.ToLower(fe.Field())] = fe.Tag()
		}
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: fields}
	}
	switch {
	case errors.Is(err, domain.ErrAssessmentNotFound),
		errors.Is(err, domain.ErrSessionNotFound),
		errors.Is(err, domain.ErrResponseNotFound),
		errors.Is(err, domain.ErrScoreNotFound),
		errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrConflict),
		errors.Is(err, domain.ErrSessionActive),
		errors.Is(err, domain.ErrAssessmentCompleted):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrInvalidToken),
		errors.Is(err, domain.ErrTokenExpired),
		errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	case errors.Is(err, domain.ErrAssessmentExpired),
		errors.Is(err, domain.ErrSessionTimedOut),
		errors.Is(err, domain.ErrSessionCompleted),
		errors.Is(err, domain.ErrAssessmentNotStarted),
		errors.Is(err, domain.ErrInvalidStatus),
		errors.Is(err, domain.ErrInvalidTransition),
		errors.Is(err, domain.ErrInvalidInstrument),
		errors.Is(err, domain.ErrValidation):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrCheatingDetected):
		return http.StatusForbidden, ErrorResponse{Error: "cheating_detected", Message: err.Error()}
	case errors.Is(err, domain.ErrScoringFailed):
		return http.StatusBadGateway, ErrorResponse{Error: "scoring_failed", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
