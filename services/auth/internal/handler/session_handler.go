package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/upcore/auth/internal/domain"
	"github.com/upcore/auth/internal/service"
)

// MakeCurrentSession returns GET /sessions/current handler.
// It currently returns the JWT-derived identity, not a refresh-token session.
func MakeCurrentSession(_ *service.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"user_id":   user.UserID,
			"tenant_id": user.TenantID,
			"email":     user.Email,
			"role":      user.Role,
			"roles":     user.Roles,
		})
	}
}

// MakeListSessions returns GET /sessions handler.
func MakeListSessions(svc *service.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}
		sessions, err := svc.List(r.Context(), user.UserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "list_failed", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"sessions": sessions})
	}
}

// MakeRevokeSession returns DELETE /sessions/{id}.
func MakeRevokeSession(svc *service.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_id", err.Error())
			return
		}

		sess, err := svc.Current(r.Context(), id)
		if err != nil {
			if errors.Is(err, domain.ErrSessionNotFound) {
				writeError(w, http.StatusNotFound, "not_found", "session not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "lookup_failed", err.Error())
			return
		}
		// Owner or tenant admin only
		if sess.UserID != user.UserID && !user.HasRole(domain.RoleTenantAdmin) && !user.HasRole(domain.RoleSuperAdmin) {
			writeError(w, http.StatusForbidden, "forbidden", "cannot revoke session")
			return
		}

		if err := svc.Revoke(r.Context(), id, "user_requested"); err != nil {
			writeError(w, http.StatusInternalServerError, "revoke_failed", err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// MakeRevokeAllSessions returns DELETE /sessions.
func MakeRevokeAllSessions(svc *service.SessionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}
		n, err := svc.RevokeAll(r.Context(), user.UserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "revoke_all_failed", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"revoked": n})
	}
}
