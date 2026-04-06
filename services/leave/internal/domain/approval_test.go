package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestApproverRole_Parse(t *testing.T) {
	assert.Equal(t, RoleManager, ParseApproverRole("Manager"))
	assert.Equal(t, RoleManager, ParseApproverRole("team_lead"))
	assert.Equal(t, RoleHR, ParseApproverRole("HR"))
	assert.Equal(t, RoleHR, ParseApproverRole("hr_manager"))
	assert.Equal(t, RoleAdmin, ParseApproverRole("tenant_admin"))
	assert.Equal(t, RoleEmployee, ParseApproverRole("random"))
	assert.Equal(t, RoleEmployee, ParseApproverRole(""))
}

func TestCanTransition_Submit(t *testing.T) {
	// draft → pending by employee
	target, ok := CanTransition(StatusDraft, "submit", RoleEmployee)
	assert.True(t, ok)
	assert.Equal(t, StatusPending, target)

	// pending → submit fails
	_, ok = CanTransition(StatusPending, "submit", RoleEmployee)
	assert.False(t, ok)
}

func TestCanTransition_Approve(t *testing.T) {
	// pending → manager_approved by manager
	target, ok := CanTransition(StatusPending, "approve", RoleManager)
	assert.True(t, ok)
	assert.Equal(t, StatusManagerApproved, target)

	// manager_approved → approved by HR
	target, ok = CanTransition(StatusManagerApproved, "approve", RoleHR)
	assert.True(t, ok)
	assert.Equal(t, StatusApproved, target)

	// manager_approved + manager → denied (already approved by manager)
	_, ok = CanTransition(StatusManagerApproved, "approve", RoleManager)
	assert.False(t, ok)

	// pending + employee → denied
	_, ok = CanTransition(StatusPending, "approve", RoleEmployee)
	assert.False(t, ok)
}

func TestCanTransition_Reject(t *testing.T) {
	target, ok := CanTransition(StatusPending, "reject", RoleManager)
	assert.True(t, ok)
	assert.Equal(t, StatusRejected, target)

	_, ok = CanTransition(StatusApproved, "reject", RoleManager)
	assert.False(t, ok)
}

func TestCanTransition_Cancel(t *testing.T) {
	for _, from := range []LeaveStatus{StatusDraft, StatusPending, StatusManagerApproved, StatusApproved} {
		target, ok := CanTransition(from, "cancel", RoleEmployee)
		assert.True(t, ok, "from=%s", from)
		assert.Equal(t, StatusCancelled, target)
	}
	_, ok := CanTransition(StatusRejected, "cancel", RoleEmployee)
	assert.False(t, ok)
}

func TestStatusIsTerminal(t *testing.T) {
	assert.True(t, StatusRejected.IsTerminal())
	assert.True(t, StatusCancelled.IsTerminal())
	assert.True(t, StatusTaken.IsTerminal())
	assert.False(t, StatusPending.IsTerminal())
	assert.False(t, StatusApproved.IsTerminal())
}

func TestStatusCountsAgainstBalance(t *testing.T) {
	assert.True(t, StatusPending.CountsAgainstBalance())
	assert.True(t, StatusManagerApproved.CountsAgainstBalance())
	assert.True(t, StatusApproved.CountsAgainstBalance())
	assert.False(t, StatusDraft.CountsAgainstBalance())
	assert.False(t, StatusCancelled.CountsAgainstBalance())
	assert.False(t, StatusRejected.CountsAgainstBalance())
}
