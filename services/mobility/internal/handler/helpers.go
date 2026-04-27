// Package handler provides HTTP handlers for the mobility service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
)

// WriteJSON writes JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteErr writes a standard error envelope.
func WriteErr(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

// MapDomainErr converts known sentinels into HTTP codes.
func MapDomainErr(w http.ResponseWriter, logger zerolog.Logger, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		WriteErr(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, domain.ErrValidation):
		WriteErr(w, http.StatusBadRequest, "validation_failed", err.Error())
	case errors.Is(err, domain.ErrCooldownActive):
		WriteErr(w, http.StatusConflict, "cooldown_active", err.Error())
	case errors.Is(err, domain.ErrDuplicateOpenRotation):
		WriteErr(w, http.StatusConflict, "duplicate_open_rotation", err.Error())
	case errors.Is(err, domain.ErrRejectReasonRequired):
		WriteErr(w, http.StatusBadRequest, "reject_reason_required", err.Error())
	case errors.Is(err, domain.ErrInvalidTransition):
		WriteErr(w, http.StatusConflict, "invalid_transition", err.Error())
	case errors.Is(err, domain.ErrSuccessionPoolFull):
		WriteErr(w, http.StatusConflict, "pool_full", err.Error())
	case errors.Is(err, domain.ErrSuccessionMaxPools):
		WriteErr(w, http.StatusConflict, "max_pools_per_candidate", err.Error())
	case errors.Is(err, domain.ErrSuccessionDuplicate):
		WriteErr(w, http.StatusConflict, "duplicate_candidate", err.Error())
	case errors.Is(err, domain.ErrSuccessionReadiness):
		WriteErr(w, http.StatusBadRequest, "invalid_readiness", err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		WriteErr(w, http.StatusForbidden, "forbidden", err.Error())
	default:
		logger.Error().Err(err).Msg("internal error")
		WriteErr(w, http.StatusInternalServerError, "internal_error", "bir hata oluştu")
	}
}

// ParseUUID pulls + parses a URL param; writes 400 on failure and returns ok=false.
func ParseUUID(w http.ResponseWriter, raw, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(raw)
	if err != nil {
		WriteErr(w, http.StatusBadRequest, "invalid_uuid", name+" geçersiz UUID")
		return uuid.Nil, false
	}
	return id, true
}

// DecodeJSON reads body into v; writes 400 on failure.
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		WriteErr(w, http.StatusBadRequest, "invalid_body", "JSON ayrıştırılamadı: "+err.Error())
		return false
	}
	return true
}

// decodeJSONOptional silently tolerates an empty or missing body (EOF). Any
// other JSON error is returned so callers can decide how strict to be.
func decodeJSONOptional(r *http.Request, v any) error {
	if r.Body == nil {
		return nil
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		// empty body is fine — ignore.
		if err.Error() == "EOF" {
			return nil
		}
		return err
	}
	return nil
}
