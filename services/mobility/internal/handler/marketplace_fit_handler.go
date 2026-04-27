package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Bu dosya marketplace handler'ının "fit" ve "readiness" bölümünü kapsar.
//
// Şu anlık tek endpoint var: GET /marketplace/opportunities/{id}/fit/{eid}.
// Mobility readiness map (TalentMatching üzerinde kümeli) ileride aynı
// dosyaya eklenecek (P3 kapsamında).

// FitScore GET /marketplace/opportunities/{id}/fit/{eid}
//
// Returns JD-R fit between an opportunity's required/preferred skills and an
// employee's persisted talent profile. Score range [0,1]; also returns the
// missing skill gap so the UI can hint development plan items.
//
// Yetki: ilan açık + tenant kontrolü. HR olmasa bile çalışan kendi fit
// skorunu görebilir; eid != self ise middleware tenant bazlı RLS sayesinde
// erişim kısıtlanır.
func (h *MarketplaceHandler) FitScore(w http.ResponseWriter, r *http.Request) {
	t, ok := tid(r)
	if !ok {
		WriteErr(w, http.StatusUnauthorized, "unauthorized", "tenant bağlamı gerekli")
		return
	}
	oppID, ok := ParseUUID(w, chi.URLParam(r, "id"), "id")
	if !ok {
		return
	}
	empID, ok := ParseUUID(w, chi.URLParam(r, "eid"), "eid")
	if !ok {
		return
	}
	opp, err := h.repo.GetOpportunity(r.Context(), t, oppID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			WriteErr(w, http.StatusNotFound, "not_found", "ilan bulunamadı")
			return
		}
		h.logger.Error().Err(err).Msg("get opportunity for fit")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "fit hesaplanamadı")
		return
	}
	skills, err := h.repo.GetEmployeeSkills(r.Context(), t, empID)
	if err != nil {
		h.logger.Error().Err(err).Msg("get employee skills for fit")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "yetkinlik profili okunamadı")
		return
	}
	score := h.matcher.Score(opp.RequiredSkills, opp.PreferredSkills, skills)
	missing := h.matcher.MissingSkills(opp.RequiredSkills, skills)
	WriteJSON(w, http.StatusOK, map[string]any{
		"opportunity_id":   oppID,
		"employee_id":      empID,
		"score":            score,
		"required_skills":  opp.RequiredSkills,
		"preferred_skills": opp.PreferredSkills,
		"employee_skills":  skills,
		"missing_skills":   missing,
	})
}
