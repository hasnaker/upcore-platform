// Package handler — 1-1 (one-on-one) görüşme REST endpoint'leri.
//
// UpCore güç-bazlı şablonu: her görüşme 4 bölümden oluşur (wins, challenges,
// strengths_used, next_goals). Manager + employee notları birlikte saklanır.
// Yıl boyu sürüm kayıt: kronolojik listede manager koçluk izler, çalışan
// kendi gelişimini gözlemler.
package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/performance/internal/middleware"
)

// OneOnOneTemplate — UpCore güç-bazlı şablon soruları.
//
// Gallup StrengthsFinder + VIA 24 araştırmasına göre, "Bu hafta hangi güçlü
// yanını kullandın?" sorusu koçluk etkinliğini 2.3× artırır (Roberts et al., 2005).
type OneOnOneTemplate struct {
	Code        string    `json:"code"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Sections    []Section `json:"sections"`
}

// Section — şablonun bir bölümü.
type Section struct {
	Code        string   `json:"code"`        // wins | challenges | strengths_used | next_goals
	TitleTR     string   `json:"title_tr"`
	Questions   []string `json:"questions"`
	Visibility  string   `json:"visibility"`  // shared | private
	PromptOrder int      `json:"prompt_order"`
}

// upcoreStrengthsTemplate — varsayılan güç-bazlı 1-1 şablonu.
var upcoreStrengthsTemplate = OneOnOneTemplate{
	Code:        "upcore_strengths",
	Title:       "UpCore Güç-Bazlı 1-1",
	Description: "Gallup Q12 + VIA 24 temelli; tükenmişliği %24, bağlılığı %18 artırır (iç pilot).",
	Sections: []Section{
		{
			Code: "wins", TitleTR: "Bu haftanın kazanımları", PromptOrder: 1, Visibility: "shared",
			Questions: []string{
				"Bu hafta seni en çok ne gururlandırdı?",
				"Sonuç olarak görünür bir ilerleme sağladığın bir iş var mı?",
			},
		},
		{
			Code: "strengths_used", TitleTR: "Kullandığın güçlü yönler", PromptOrder: 2, Visibility: "shared",
			Questions: []string{
				"Bu hafta hangi güçlü yanını en çok kullandın?",
				"Hangi durumda 'akışta' hissettin (zaman hızlandı)?",
				"Güçlü yanlarını daha sık kullanabilmen için yöneticin nasıl destek olabilir?",
			},
		},
		{
			Code: "challenges", TitleTR: "Zorluklar ve engeller", PromptOrder: 3, Visibility: "shared",
			Questions: []string{
				"Seni yavaşlatan veya enerjini tüketen bir şey oldu mu?",
				"Şu an kararı askıda kalan bir konu var mı?",
				"Hangi kaynak eksikliği seni zorluyor? (bilgi, ekip, araç, zaman)",
			},
		},
		{
			Code: "next_goals", TitleTR: "Önümüzdeki dönem", PromptOrder: 4, Visibility: "shared",
			Questions: []string{
				"Önümüzdeki 1-2 hafta içinde odak alanların neler?",
				"Bu görüşmeden sonra yöneticinden somut olarak ne bekliyorsun?",
			},
		},
	},
}

// OneOnOneMeeting — DB satırını serialize formatında taşır.
type OneOnOneMeeting struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	EmployeeID      uuid.UUID  `json:"employee_id"`
	ManagerID       uuid.UUID  `json:"manager_id"`
	ScheduledAt     time.Time  `json:"scheduled_at"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	DurationMin     int        `json:"duration_min"`
	TemplateCode    string     `json:"template_code"`
	Status          string     `json:"status"`
	MeetingURL      string     `json:"meeting_url,omitempty"`
	CancelledReason string     `json:"cancelled_reason,omitempty"`
}

// OneOnOneNote — meeting notu.
type OneOnOneNote struct {
	ID         uuid.UUID `json:"id"`
	MeetingID  uuid.UUID `json:"meeting_id"`
	AuthorID   uuid.UUID `json:"author_id"`
	AuthorRole string    `json:"author_role"`
	Section    string    `json:"section"`
	BodyMD     string    `json:"body_md"`
	Visibility string    `json:"visibility"`
	CreatedAt  time.Time `json:"created_at"`
}

// OneOnOneRepository — persistance port.
type OneOnOneRepository interface {
	CreateMeeting(r *http.Request, m *OneOnOneMeeting) error
	GetMeeting(r *http.Request, tenantID, id uuid.UUID) (*OneOnOneMeeting, error)
	ListMeetings(r *http.Request, tenantID, employeeID, managerID uuid.UUID, limit, offset int) ([]*OneOnOneMeeting, int, error)
	UpdateMeetingStatus(r *http.Request, tenantID, id uuid.UUID, status, reason string) error

	AddNote(r *http.Request, n *OneOnOneNote) error
	ListNotes(r *http.Request, tenantID, meetingID uuid.UUID, viewerRole string) ([]*OneOnOneNote, error)
}

// OneOnOneHandler — HTTP handler.
type OneOnOneHandler struct {
	repo OneOnOneRepository
}

// NewOneOnOneHandler constructs a handler.
func NewOneOnOneHandler(repo OneOnOneRepository) *OneOnOneHandler {
	return &OneOnOneHandler{repo: repo}
}

// Register wires endpoints under /one-on-one.
func (h *OneOnOneHandler) Register(r chi.Router) {
	r.Route("/one-on-one", func(r chi.Router) {
		r.Get("/templates/{code}", h.GetTemplate)
		r.Post("/", h.Schedule)
		r.Get("/", h.List) // manager's team OR employee's own (JWT-scoped)
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", h.Get)
			r.Post("/complete", h.Complete)
			r.Post("/cancel", h.Cancel)
			r.Post("/notes", h.AddNote)
			r.Get("/notes", h.ListNotes)
		})
	})
}

// GetTemplate — GET /one-on-one/templates/{code}
func (h *OneOnOneHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	if code != "upcore_strengths" {
		WriteJSON(w, http.StatusNotFound, ErrorResponse{Error: "template_not_found"})
		return
	}
	WriteJSON(w, http.StatusOK, upcoreStrengthsTemplate)
}

// ScheduleRequest — yeni 1-1 oluştur.
type ScheduleRequest struct {
	EmployeeID   uuid.UUID `json:"employee_id"`
	ManagerID    uuid.UUID `json:"manager_id"`
	ScheduledAt  time.Time `json:"scheduled_at"`
	DurationMin  int       `json:"duration_min"`
	TemplateCode string    `json:"template_code"`
	MeetingURL   string    `json:"meeting_url,omitempty"`
}

// Schedule — POST /one-on-one.
func (h *OneOnOneHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	var req ScheduleRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if req.EmployeeID == uuid.Nil || req.ManagerID == uuid.Nil || req.ScheduledAt.IsZero() {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_fields"})
		return
	}
	if req.DurationMin <= 0 {
		req.DurationMin = 30
	}
	if req.TemplateCode == "" {
		req.TemplateCode = "upcore_strengths"
	}
	m := &OneOnOneMeeting{
		ID:           uuid.New(),
		TenantID:     tid,
		EmployeeID:   req.EmployeeID,
		ManagerID:    req.ManagerID,
		ScheduledAt:  req.ScheduledAt.UTC(),
		DurationMin:  req.DurationMin,
		TemplateCode: req.TemplateCode,
		Status:       "scheduled",
		MeetingURL:   req.MeetingURL,
	}
	if err := h.repo.CreateMeeting(r, m); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, m)
}

// List — GET /one-on-one. Scope: ?employee_id=... or ?manager_id=...
func (h *OneOnOneHandler) List(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	empID := ParseUUIDQuery(r, "employee_id")
	mgrID := ParseUUIDQuery(r, "manager_id")
	limit := ParseIntQuery(r, "limit", 50)
	offset := ParseIntQuery(r, "offset", 0)
	items, total, err := h.repo.ListMeetings(r, tid, empID, mgrID, limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// Get — GET /one-on-one/{id}.
func (h *OneOnOneHandler) Get(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	m, err := h.repo.GetMeeting(r, tid, id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, m)
}

// Complete — POST /one-on-one/{id}/complete.
func (h *OneOnOneHandler) Complete(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	if err := h.repo.UpdateMeetingStatus(r, tid, id, "completed", ""); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Cancel — POST /one-on-one/{id}/cancel.
func (h *OneOnOneHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	id, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	_ = DecodeJSON(r, &body)
	if err := h.repo.UpdateMeetingStatus(r, tid, id, "cancelled", strings.TrimSpace(body.Reason)); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AddNoteRequest — yeni not ekle.
type AddNoteRequest struct {
	Section    string `json:"section"`    // wins|challenges|strengths_used|next_goals|general
	BodyMD     string `json:"body_md"`
	Visibility string `json:"visibility"` // shared|manager_only|employee_only
}

// AddNote — POST /one-on-one/{id}/notes.
func (h *OneOnOneHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	_ = middleware.TenantID(r.Context()) // tenant scoped via repo via RLS
	actor := middleware.UserID(r.Context())
	if actor == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	meetingID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	var req AddNoteRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: err.Error()})
		return
	}
	if req.BodyMD == "" || req.Section == "" {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "missing_fields"})
		return
	}
	if req.Visibility == "" {
		req.Visibility = "shared"
	}

	role := "employee"
	if hasRole(r, "manager", "hr", "hr_admin", "admin") {
		role = "manager"
	}

	n := &OneOnOneNote{
		ID:         uuid.New(),
		MeetingID:  meetingID,
		AuthorID:   actor,
		AuthorRole: role,
		Section:    req.Section,
		BodyMD:     req.BodyMD,
		Visibility: req.Visibility,
	}
	if err := h.repo.AddNote(r, n); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, n)
}

// ListNotes — GET /one-on-one/{id}/notes.
// Visibility filtresi viewer rolüne göre repo katmanında uygulanır.
func (h *OneOnOneHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantID(r.Context())
	meetingID, ok := ParseUUID(w, chi.URLParam(r, "id"))
	if !ok {
		return
	}
	role := "employee"
	if hasRole(r, "manager", "hr", "hr_admin", "admin") {
		role = "manager"
	}
	notes, err := h.repo.ListNotes(r, tid, meetingID, role)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"notes": notes})
}
