package rbac

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPolicy_SuperAdminAllowsAll(t *testing.T) {
	p := NewPolicy()
	d := p.Check("super_admin", "delete:anything", "tenant")
	assert.True(t, d.Allowed)
}

func TestPolicy_EmployeeSelfOnly(t *testing.T) {
	p := NewPolicy()
	assert.True(t, p.Check("employee", "view:self", "self").Allowed)
	assert.False(t, p.Check("employee", "manage:employees", "tenant").Allowed)
}

func TestPolicy_LineManagerTeam(t *testing.T) {
	p := NewPolicy()
	assert.True(t, p.Check("line_manager", "view:team", "team").Allowed)
	assert.True(t, p.Check("line_manager", "approve:team_leaves", "team").Allowed)
	assert.False(t, p.Check("line_manager", "manage:employees", "tenant").Allowed)
}

func TestPolicy_HRManagerDepartment(t *testing.T) {
	p := NewPolicy()
	assert.True(t, p.Check("hr_manager", "manage:employees", "department").Allowed)
	assert.False(t, p.Check("hr_manager", "manage:employees", "tenant").Allowed)
}

func TestPolicy_EmptyInput(t *testing.T) {
	p := NewPolicy()
	assert.False(t, p.Check("", "read", "tenant").Allowed)
	assert.False(t, p.Check("employee", "", "self").Allowed)
	assert.False(t, p.Check("employee", "read", "").Allowed)
}

func TestPolicy_UnknownRole(t *testing.T) {
	p := NewPolicy()
	d := p.Check("sandbox_role", "read", "tenant")
	assert.False(t, d.Allowed)
	assert.Contains(t, d.Reason, "no rules")
}

func TestPolicy_CheckAny(t *testing.T) {
	p := NewPolicy()
	d := p.CheckAny([]string{"employee", "hr_manager"}, "manage:employees", "department")
	assert.True(t, d.Allowed)

	d = p.CheckAny([]string{"employee", "candidate"}, "manage:employees", "tenant")
	assert.False(t, d.Allowed)
}

func TestPolicy_SetRules(t *testing.T) {
	p := NewPolicy()
	p.SetRules([]Rule{{Role: "custom", Action: "read", Resource: "widget"}})
	assert.True(t, p.Check("custom", "read", "widget").Allowed)
	assert.False(t, p.Check("employee", "view:self", "self").Allowed)
}

func TestPolicy_Rules(t *testing.T) {
	p := NewPolicy()
	rules := p.Rules()
	assert.NotEmpty(t, rules)
	// Mutating returned slice should not affect the policy
	rules[0] = Rule{Role: "mutated"}
	assert.NotEqual(t, "mutated", p.Rules()[0].Role)
}

func TestPolicy_TenantAdminWithinTenant(t *testing.T) {
	p := NewPolicy()
	assert.True(t, p.Check("tenant_admin", "manage:employees", "tenant").Allowed)
	assert.True(t, p.Check("tenant_admin", "manage:employees", "self").Allowed)
}

func TestPolicy_CandidateLimited(t *testing.T) {
	p := NewPolicy()
	assert.True(t, p.Check("candidate", "take:assessment", "self").Allowed)
	assert.True(t, p.Check("candidate", "view:own_results", "self").Allowed)
	assert.False(t, p.Check("candidate", "read:employees", "tenant").Allowed)
}
