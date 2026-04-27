package handler

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/repository"
)

// Bu dosya marketplace handler'ının "application" bölümünü kapsar:
// Apply, ListApplicationsForOpp, ListApplicationsForEmployee,
// UpdateApplicationStatus, WithdrawApplication.
//
// Tüm metodlar marketplace_handler.go'daki MarketplaceHandler struct'ına
// metod ekler — derleyici tek class olarak görür; ayrı dosyada tutmamızın
// sebebi okunabilirlik (548 satırlık tek dosyayı parçaladık).

// allowedStatusTransitions describes the states HR may transition an
// application into. `withdrawn` is reserved for the applicant (employee) and
// handled by a dedicated endpoint.
var allowedStatusTransitions = map[string]struct{}{
	"applied":      {},
	"under_review": {},
	"shortlisted":  {},
	"interview":    {},
	"offered":      {},
	"accepted":     {},
	"rejected":     {},
}

// Apply POST /marketplace/opportunities/{id}/apply
// Body: {employee_id, cover_note, candidate_skills[], confidential}
func (h *MarketplaceHandler) Apply(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	oppID, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	opp, err := h.repo.GetOpportunity(r.Context(), t, oppID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			WriteErr(w, http.StatusNotFound, "not_found", "ilan bulunamadı")
			return
		}
		h.logger.Error().Err(err).Msg("get opportunity for apply")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "ilan okunamadı")
		return
	}
	if opp.Status != "open" {
		WriteErr(w, http.StatusConflict, "opportunity_closed", "ilan başvuruya kapalı")
		return
	}
	var body struct {
		EmployeeID      uuid.UUID `json:"employee_id"`
		CoverNote       *string   `json:"cover_note"`
		CandidateSkills []string  `json:"candidate_skills"`
		Confidential    bool      `json:"confidential"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	if body.EmployeeID == uuid.Nil {
		if uid, ok := middleware.UserID(r.Context()); ok {
			body.EmployeeID = uid
		}
	}
	if body.EmployeeID == uuid.Nil {
		WriteErr(w, http.StatusBadRequest, "validation_failed", "employee_id gerekli")
		return
	}
	// Merge provided skills with the persisted profile — provides a meaningful
	// score even when the applicant skips the skills input.
	persistedSkills, err := h.repo.GetEmployeeSkills(r.Context(), t, body.EmployeeID)
	if err != nil {
		h.logger.Warn().Err(err).Msg("get employee skills")
	}
	skills := append([]string{}, body.CandidateSkills...)
	skills = append(skills, persistedSkills...)
	score := h.matcher.Score(opp.RequiredSkills, opp.PreferredSkills, skills)
	app := &repository.InternalApplication{
		ID: uuid.New(), TenantID: t, OpportunityID: oppID,
		EmployeeID: body.EmployeeID, CoverNote: body.CoverNote,
		MatchScore: &score, Status: "applied",
		Confidential: body.Confidential,
	}
	inserted, err := h.repo.Apply(r.Context(), app)
	if err != nil {
		h.logger.Error().Err(err).Msg("apply insert")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "başvuru kaydedilemedi")
		return
	}
	if !inserted {
		existing, ferr := h.repo.FindApplicationByEmployee(r.Context(), t, oppID, body.EmployeeID)
		if ferr != nil {
			WriteErr(w, http.StatusConflict, "already_applied", "bu ilana zaten başvuru var")
			return
		}
		WriteJSON(w, http.StatusConflict, map[string]any{
			"error":       map[string]string{"code": "already_applied", "message": "bu ilana zaten başvuru var"},
			"application": existing,
		})
		return
	}
	uid, _ := middleware.UserID(r.Context())
	h.writeAudit(r, t, uid, "mobility.application.applied", "internal_application", app.ID, map[string]any{
		"opportunity_id": oppID.String(), "match_score": score, "confidential": body.Confidential,
	})
	WriteJSON(w, http.StatusCreated, app)
}

// ListApplicationsForOpp GET /marketplace/opportunities/{id}/applications
// Confidential applications are surfaced as "Gizli aday #abc123" unless the
// caller has already moved the application into `interview` status (per PM
// spec — once the HR team invites the candidate to interview, identity must be
// revealed to the interview panel).
func (h *MarketplaceHandler) ListApplicationsForOpp(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	if !isHRRole(middleware.Role(r.Context())) {
		WriteErr(w, http.StatusForbidden, "forbidden", "İK rolü gerekli")
		return
	}
	oppID, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	out, err := h.repo.ListApplicationsForOpp(r.Context(), t, oppID)
	if err != nil {
		h.logger.Error().Err(err).Msg("list applications for opp")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "başvurular okunamadı")
		return
	}
	// Envelope applicantAlias respects the confidential flag.
	items := make([]map[string]any, 0, len(out))
	for _, a := range out {
		items = append(items, viewForHR(a))
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// viewForHR masks the candidate id when confidential AND status is pre-interview.
// Once the HR moves the application into `interview`, the identity is revealed.
func viewForHR(a *repository.InternalApplication) map[string]any {
	m := map[string]any{
		"id":             a.ID,
		"tenant_id":      a.TenantID,
		"opportunity_id": a.OpportunityID,
		"cover_note":     a.CoverNote,
		"match_score":    a.MatchScore,
		"status":         a.Status,
		"confidential":   a.Confidential,
		"applied_at":     a.AppliedAt,
		"decided_at":     a.DecidedAt,
		"decision_notes": a.DecisionNotes,
	}
	revealed := !a.Confidential || a.Status == "interview" || a.Status == "offered" || a.Status == "accepted" || a.Status == "rejected"
	if revealed {
		m["employee_id"] = a.EmployeeID
		m["applicant_alias"] = nil
	} else {
		m["employee_id"] = nil
		m["applicant_alias"] = "Gizli aday #" + a.ID.String()[:6]
	}
	return m
}

// ListApplicationsForEmployee GET /marketplace/employees/{eid}/applications?cursor=&limit=
// Keyset paginated. Backward compat: an unset cursor returns the first page.
func (h *MarketplaceHandler) ListApplicationsForEmployee(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	eid, ok := ParseUUID(w, chi.URLParam(r, "eid"), "eid")
	if !ok {
		return
	}
	// Employee may only read their own applications unless HR.
	if uid, ok := middleware.UserID(r.Context()); ok && uid != eid && !isHRRole(middleware.Role(r.Context())) {
		WriteErr(w, http.StatusForbidden, "forbidden", "yalnızca kendi başvurularınıza erişebilirsiniz")
		return
	}
	cursor, ok := ParseCursorQuery(w, r)
	if !ok {
		return
	}
	limit := ParseLimit(r, 50, 200)
	p := repository.KeysetPage{Limit: limit}
	if cursor != nil {
		ts := cursor.CreatedAt
		id := cursor.ID
		p.CursorCreatedAt = &ts
		p.CursorID = &id
	}
	out, err := h.repo.ListApplicationsForEmployeePaged(r.Context(), t, eid, p)
	if err != nil {
		h.logger.Error().Err(err).Msg("list applications for employee")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "başvurular okunamadı")
		return
	}
	resp := map[string]any{"items": out}
	if len(out) > 0 {
		last := out[len(out)-1]
		resp["next_cursor"] = EncodeCursor(last.AppliedAt, last.ID)
		resp["has_more"] = len(out) == limit
	} else {
		resp["next_cursor"] = ""
		resp["has_more"] = false
	}
	WriteJSON(w, http.StatusOK, resp)
}

// UpdateApplicationStatus PATCH /marketplace/applications/{id}/status — İK action.
func (h *MarketplaceHandler) UpdateApplicationStatus(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	if !isHRRole(middleware.Role(r.Context())) {
		WriteErr(w, http.StatusForbidden, "forbidden", "İK rolü gerekli")
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	var body struct {
		Status        string  `json:"status"`
		DecisionNotes *string `json:"decision_notes"`
	}
	if !DecodeJSON(w, r, &body) {
		return
	}
	status := strings.ToLower(strings.TrimSpace(body.Status))
	if _, ok := allowedStatusTransitions[status]; !ok {
		WriteErr(w, http.StatusBadRequest, "validation_failed", "geçersiz durum")
		return
	}
	if err := h.repo.UpdateApplicationStatus(r.Context(), t, id, status, body.DecisionNotes); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			WriteErr(w, http.StatusNotFound, "not_found", "başvuru bulunamadı")
			return
		}
		h.logger.Error().Err(err).Msg("update application status")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "durum güncellenemedi")
		return
	}
	uid, _ := middleware.UserID(r.Context())
	h.writeAudit(r, t, uid, "mobility.application.status_changed", "internal_application", id, map[string]any{
		"status":         status,
		"decision_notes": body.DecisionNotes,
	})
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "status": status})
}

// WithdrawApplication POST /marketplace/applications/{id}/withdraw — employee self-service.
func (h *MarketplaceHandler) WithdrawApplication(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	id, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	uid, ok := middleware.UserID(r.Context())
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "kullanıcı bağlamı gerekli")
		return
	}
	ok2, err := h.repo.WithdrawApplication(r.Context(), t, id, uid)
	if err != nil {
		h.logger.Error().Err(err).Msg("withdraw application")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "başvuru geri çekilemedi")
		return
	}
	if !ok2 {
		WriteErr(w, http.StatusConflict, "not_withdrawable", "başvuru geri çekilemez — sahip değilsiniz veya durum uygun değil")
		return
	}
	h.writeAudit(r, t, uid, "mobility.application.withdrawn", "internal_application", id, nil)
	WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "status": "withdrawn"})
}
