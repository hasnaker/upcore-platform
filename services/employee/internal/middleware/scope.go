package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// EmployeeResolver looks up an employee record by its user ID. Injected by
// main.go to avoid an import cycle with the repository package.
type EmployeeResolver interface {
	EmployeeIDForUser(ctx context.Context, tenantID, userID uuid.UUID) (uuid.UUID, error)
}

// EmployeeResolverFunc is an adapter so main.go can pass a simple function.
type EmployeeResolverFunc func(ctx context.Context, tenantID, userID uuid.UUID) (uuid.UUID, error)

// EmployeeIDForUser implements EmployeeResolver.
func (f EmployeeResolverFunc) EmployeeIDForUser(ctx context.Context, tenantID, userID uuid.UUID) (uuid.UUID, error) {
	return f(ctx, tenantID, userID)
}

// ResolveEmployeeScope resolves the authenticated user's employee record and
// stores it in the request context. Downstream handlers use
// EmployeeIDFromContext to implement "manager sees only their team" and
// "employee sees only their own data" without re-querying the DB each time.
//
// If the user has no employee record (pure admin account) the middleware
// still passes the request through; the handler is responsible for role
// gating (IsAdminRole bypasses scope).
func ResolveEmployeeScope(resolver EmployeeResolver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			tid := TenantIDFromContext(ctx)
			uid := UserIDFromContext(ctx)
			if resolver != nil && tid != uuid.Nil && uid != uuid.Nil {
				if empID, err := resolver.EmployeeIDForUser(ctx, tid, uid); err == nil && empID != uuid.Nil {
					ctx = WithEmployeeID(ctx, empID)
				}
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireEmployeeScope enforces that a non-admin, non-manager user can only
// access resources tied to their own employee ID. Managers and admins are
// passed through — list handlers apply their own scope.
func RequireEmployeeScope(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := RoleFromContext(r.Context())
		if IsAdminRole(role) || IsManagerRole(role) {
			next.ServeHTTP(w, r)
			return
		}
		if IsEmployeeOnlyRole(role) && EmployeeIDFromContext(r.Context()) == uuid.Nil {
			writeJSON(w, http.StatusForbidden, map[string]string{
				"error":   "no_employee_record",
				"message": "Employee role requires a linked app.employees record",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}
