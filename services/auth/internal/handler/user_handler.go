package handler

import (
	"errors"
	"net/http"

	"github.com/upcore/auth/internal/domain"
	"github.com/upcore/auth/internal/service"
)

// MakeGetMe returns GET /users/me handler.
func MakeGetMe(svc *service.AuthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}
		profile, err := svc.GetProfile(r.Context(), user.UserID)
		if err != nil {
			if errors.Is(err, domain.ErrUserNotFound) {
				writeError(w, http.StatusNotFound, "not_found", "user not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "lookup_failed", err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"id":         profile.User.ID,
			"email":      profile.User.Email,
			"first_name": profile.User.FirstName,
			"last_name":  profile.User.LastName,
			"locale":     profile.User.Locale,
			"status":     profile.User.Status,
			"tenant_id":  profile.User.TenantID,
			"roles":      profile.Roles,
			"metadata":   profile.User.Metadata,
			"created_at": profile.User.CreatedAt,
			"updated_at": profile.User.UpdatedAt,
		})
	}
}
