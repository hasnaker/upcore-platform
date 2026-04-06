package handler

import (
	"encoding/json"
	"net/http"

	"github.com/upcore/auth/internal/domain"
	"github.com/upcore/auth/internal/rbac"
)

type checkRequest struct {
	Action   string `json:"action"`
	Resource string `json:"resource"`
	Role     string `json:"role,omitempty"` // optional override (admin only)
}

// MakeCheckPermission builds GET/POST /check handler.
// GET: ?action=read:employees&resource=tenant
// POST: { "action":..., "resource":..., "role": "optional" }
func MakeCheckPermission(p *rbac.Policy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := domain.UserFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "auth context missing")
			return
		}

		var req checkRequest
		if r.Method == http.MethodPost {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
				return
			}
		} else {
			q := r.URL.Query()
			req.Action = q.Get("action")
			req.Resource = q.Get("resource")
		}

		if req.Action == "" || req.Resource == "" {
			writeError(w, http.StatusBadRequest, "missing_params", "action and resource are required")
			return
		}

		roles := user.Roles
		if len(roles) == 0 && user.Role != "" {
			roles = []string{user.Role}
		}
		decision := p.CheckAny(roles, req.Action, req.Resource)

		writeJSON(w, http.StatusOK, map[string]any{
			"allowed":  decision.Allowed,
			"reason":   decision.Reason,
			"action":   req.Action,
			"resource": req.Resource,
			"roles":    roles,
		})
	}
}
