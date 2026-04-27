package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/assessment/internal/middleware"
	"github.com/upcore/assessment/internal/repository"
)

// LongitudinalHandler exposes snapshot + bulk invitation endpoints
// (migration 040).
type LongitudinalHandler struct {
	repo repository.LongitudinalRepository
}

// NewLongitudinalHandler constructs.
func NewLongitudinalHandler(r repository.LongitudinalRepository) *LongitudinalHandler {
	return &LongitudinalHandler{repo: r}
}

// Register wires routes.
func (h *LongitudinalHandler) Register(r chi.Router) {
	r.Route("/snapshots", func(r chi.Router) {
		r.Post("/", h.AddSnapshot)
		r.Get("/employees/{eid}", h.ListSnapshots)
		r.Get("/trend", h.TrendSeries)
	})
	r.Route("/bulk-invitations", func(r chi.Router) {
		r.Post("/", h.CreateBulk)
	})
}

func tid(r *http.Request) uuid.UUID {
	return middleware.TenantIDFromContext(r.Context())
}

func writeJSONL(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// AddSnapshot POST /snapshots
func (h *LongitudinalHandler) AddSnapshot(w http.ResponseWriter, r *http.Request) {
	t := tid(r)
	if t == uuid.Nil {
		writeJSONL(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body repository.AssessmentSnapshot
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONL(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	body.ID = uuid.New()
	body.TenantID = t
	if err := h.repo.AddSnapshot(r.Context(), &body); err != nil {
		writeJSONL(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSONL(w, 201, body)
}

// ListSnapshots GET /snapshots/employees/{eid}?instrument=BAT-12-TR
func (h *LongitudinalHandler) ListSnapshots(w http.ResponseWriter, r *http.Request) {
	t := tid(r)
	if t == uuid.Nil {
		writeJSONL(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	eid, err := uuid.Parse(chi.URLParam(r, "eid"))
	if err != nil {
		writeJSONL(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	out, err := h.repo.ListSnapshots(r.Context(), t, eid, r.URL.Query().Get("instrument"))
	if err != nil {
		writeJSONL(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSONL(w, 200, map[string]any{"items": out})
}

// TrendSeries GET /snapshots/trend?instrument=BAT-12-TR&from=2026-01-01&to=2026-12-31
func (h *LongitudinalHandler) TrendSeries(w http.ResponseWriter, r *http.Request) {
	t := tid(r)
	if t == uuid.Nil {
		writeJSONL(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	instrument := r.URL.Query().Get("instrument")
	if instrument == "" {
		writeJSONL(w, 400, map[string]string{"error": "instrument_required"})
		return
	}
	from, _ := time.Parse("2006-01-02", r.URL.Query().Get("from"))
	to, _ := time.Parse("2006-01-02", r.URL.Query().Get("to"))
	if from.IsZero() {
		from = time.Now().AddDate(-1, 0, 0)
	}
	if to.IsZero() {
		to = time.Now()
	}
	points, err := h.repo.TrendSeries(r.Context(), t, instrument, from, to)
	if err != nil {
		writeJSONL(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSONL(w, 200, map[string]any{"items": points})
}

// CreateBulk POST /bulk-invitations
func (h *LongitudinalHandler) CreateBulk(w http.ResponseWriter, r *http.Request) {
	t := tid(r)
	if t == uuid.Nil {
		writeJSONL(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		Instrument     string         `json:"instrument"`
		AudienceFilter map[string]any `json:"audience_filter"`
		ExpiresAt      *time.Time     `json:"expires_at"`
		InvitedCount   int            `json:"invited_count"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONL(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	filterBytes, _ := json.Marshal(body.AudienceFilter)
	createdBy, _ := uuid.Parse(r.Header.Get("X-User-ID"))
	b := &repository.BulkInvitation{
		TenantID: t, Instrument: body.Instrument,
		AudienceFilter: filterBytes,
		InvitedCount: body.InvitedCount, ExpiresAt: body.ExpiresAt,
		CreatedBy: createdBy,
	}
	if err := h.repo.CreateBulkInvitation(r.Context(), b); err != nil {
		writeJSONL(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSONL(w, 201, b)
}
