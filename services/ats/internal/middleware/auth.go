package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// AuthChecker calls the auth service to validate JWT / RBAC claims.
type AuthChecker struct {
	baseURL string
	client  *http.Client
}

// NewAuthChecker constructs a checker pointing at the auth service.
func NewAuthChecker(baseURL string, timeout time.Duration) *AuthChecker {
	if timeout == 0 {
		timeout = 500 * time.Millisecond
	}
	return &AuthChecker{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: timeout},
	}
}

// CheckResponse matches the auth service /auth/check response.
type CheckResponse struct {
	Allowed  bool      `json:"allowed"`
	UserID   uuid.UUID `json:"user_id"`
	TenantID uuid.UUID `json:"tenant_id"`
	Role     string    `json:"role"`
}

// Check calls the auth service.
func (a *AuthChecker) Check(ctx context.Context, token, permission string) (*CheckResponse, error) {
	if a.baseURL == "" {
		return nil, fmt.Errorf("auth service not configured")
	}
	url := fmt.Sprintf("%s/api/v1/auth/check?permission=%s", a.baseURL, permission)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("auth check failed: status=%d", resp.StatusCode)
	}
	var out CheckResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// RequireAuth verifies the caller is authenticated.
func RequireAuth(checker *AuthChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			tid := TenantIDFromContext(ctx)
			uid := UserIDFromContext(ctx)
			if tid != uuid.Nil && uid != uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}

			token := extractBearer(r.Header.Get("Authorization"))
			if token == "" || checker == nil {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
				return
			}
			authCtx, cancel := context.WithTimeout(ctx, 750*time.Millisecond)
			defer cancel()
			res, err := checker.Check(authCtx, token, "ats:read")
			if err != nil || !res.Allowed {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
				return
			}
			ctx = context.WithValue(ctx, CtxTenantID, res.TenantID)
			ctx = context.WithValue(ctx, CtxUserID, res.UserID)
			ctx = context.WithValue(ctx, CtxRole, res.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole enforces that the caller holds one of the given roles.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[strings.ToLower(r)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := strings.ToLower(RoleFromContext(r.Context()))
			if _, ok := allowed[role]; !ok {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func extractBearer(h string) string {
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
