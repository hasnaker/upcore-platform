package rbac

import "github.com/upcore/auth/internal/domain"

// Wildcard token used in rules to denote "any".
const Wildcard = "*"

// Rule is a single permission grant: (role may perform action on resource).
type Rule struct {
	Role     string
	Action   string // e.g. "read:employees", "manage:interventions"
	Resource string // e.g. "tenant", "self", "team", "department"
}

// DefaultRules is the baseline RBAC set seeded in migration 004.
// Can be extended per-tenant via the rbac_policies table.
var DefaultRules = []Rule{
	// super_admin: unrestricted across tenants
	{Role: domain.RoleSuperAdmin, Action: Wildcard, Resource: Wildcard},

	// tenant_admin: unrestricted within own tenant
	{Role: domain.RoleTenantAdmin, Action: Wildcard, Resource: "tenant"},
	{Role: domain.RoleTenantAdmin, Action: Wildcard, Resource: "self"},
	{Role: domain.RoleTenantAdmin, Action: Wildcard, Resource: "team"},
	{Role: domain.RoleTenantAdmin, Action: Wildcard, Resource: "department"},

	// hr_director
	{Role: domain.RoleHRDirector, Action: "read:employees", Resource: "tenant"},
	{Role: domain.RoleHRDirector, Action: "manage:employees", Resource: "tenant"},
	{Role: domain.RoleHRDirector, Action: "view:all", Resource: "tenant"},
	{Role: domain.RoleHRDirector, Action: "manage:interventions", Resource: "tenant"},
	{Role: domain.RoleHRDirector, Action: "approve:high", Resource: "tenant"},
	{Role: domain.RoleHRDirector, Action: "read:self", Resource: "self"},
	{Role: domain.RoleHRDirector, Action: "update:self_profile", Resource: "self"},

	// hr_manager
	{Role: domain.RoleHRManager, Action: "read:employees", Resource: "department"},
	{Role: domain.RoleHRManager, Action: "manage:employees", Resource: "department"},
	{Role: domain.RoleHRManager, Action: "view:department", Resource: "department"},
	{Role: domain.RoleHRManager, Action: "create:interventions", Resource: "department"},
	{Role: domain.RoleHRManager, Action: "read:self", Resource: "self"},
	{Role: domain.RoleHRManager, Action: "update:self_profile", Resource: "self"},

	// line_manager
	{Role: domain.RoleLineManager, Action: "view:team", Resource: "team"},
	{Role: domain.RoleLineManager, Action: "read:employees", Resource: "team"},
	{Role: domain.RoleLineManager, Action: "approve:team_leaves", Resource: "team"},
	{Role: domain.RoleLineManager, Action: "view:team_burnout", Resource: "team"},
	{Role: domain.RoleLineManager, Action: "read:self", Resource: "self"},
	{Role: domain.RoleLineManager, Action: "update:self_profile", Resource: "self"},

	// employee
	{Role: domain.RoleEmployee, Action: "view:self", Resource: "self"},
	{Role: domain.RoleEmployee, Action: "read:self", Resource: "self"},
	{Role: domain.RoleEmployee, Action: "update:self_profile", Resource: "self"},
	{Role: domain.RoleEmployee, Action: "submit:surveys", Resource: "self"},

	// candidate
	{Role: domain.RoleCandidate, Action: "take:assessment", Resource: "self"},
	{Role: domain.RoleCandidate, Action: "view:own_results", Resource: "self"},
}
