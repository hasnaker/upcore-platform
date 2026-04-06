package domain

import "strings"

// ApproverRole identifies who is acting on an approval transition.
type ApproverRole string

// Known approver roles (lowercase).
const (
	RoleEmployee ApproverRole = "employee"
	RoleManager  ApproverRole = "manager"
	RoleHR       ApproverRole = "hr"
	RoleAdmin    ApproverRole = "admin"
)

// ParseApproverRole normalises a free-form role string.
func ParseApproverRole(s string) ApproverRole {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "manager", "lead", "team_lead":
		return RoleManager
	case "hr", "hr_admin", "hr-manager", "hr_manager":
		return RoleHR
	case "admin", "tenant_admin", "owner":
		return RoleAdmin
	default:
		return RoleEmployee
	}
}

// CanApprove reports whether the role may approve the given status.
func (r ApproverRole) CanApprove(status LeaveStatus) bool {
	switch status {
	case StatusPending:
		// first stage — manager or HR/admin can approve
		return r == RoleManager || r == RoleHR || r == RoleAdmin
	case StatusManagerApproved:
		// second stage — only HR or admin
		return r == RoleHR || r == RoleAdmin
	}
	return false
}

// CanReject reports whether the role may reject the given status.
func (r ApproverRole) CanReject(status LeaveStatus) bool {
	if !status.IsPending() {
		return false
	}
	return r == RoleManager || r == RoleHR || r == RoleAdmin
}

// CanTransition validates a state transition for a given actor role.
// Returns the target state when allowed.
func CanTransition(from LeaveStatus, action string, role ApproverRole) (LeaveStatus, bool) {
	switch action {
	case "submit":
		if from == StatusDraft && (role == RoleEmployee || role == RoleManager || role == RoleHR || role == RoleAdmin) {
			return StatusPending, true
		}
	case "approve":
		if from == StatusPending && role.CanApprove(from) {
			// Single-stage approval: manager moves straight to approved when HR isn't
			// required. The caller (service) decides which target to use; here we
			// default to manager_approved so that services can then fold directly
			// into approved if HR step is skipped.
			return StatusManagerApproved, true
		}
		if from == StatusManagerApproved && role.CanApprove(from) {
			return StatusApproved, true
		}
	case "reject":
		if role.CanReject(from) {
			return StatusRejected, true
		}
	case "cancel":
		switch from {
		case StatusDraft, StatusPending, StatusManagerApproved, StatusApproved:
			return StatusCancelled, true
		}
	case "mark_taken":
		if from == StatusApproved {
			return StatusTaken, true
		}
	}
	return from, false
}
