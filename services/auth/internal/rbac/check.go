package rbac

// Decision represents the outcome of a permission check.
type Decision struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason"`
}

// Check returns whether a role may perform action on resource.
// Wildcards ("*") match any action or resource.
// Returns a Decision with a human-readable reason.
func (p *Policy) Check(role, action, resource string) Decision {
	if role == "" || action == "" || resource == "" {
		return Decision{Allowed: false, Reason: "role, action, and resource are required"}
	}

	p.mu.RLock()
	defer p.mu.RUnlock()

	actionIdx, ok := p.index[role]
	if !ok {
		return Decision{Allowed: false, Reason: "role has no rules"}
	}

	// Try exact action match + wildcard action
	if matchResource(actionIdx[action], resource) {
		return Decision{Allowed: true, Reason: "rule matched: " + role + "/" + action + "/" + resource}
	}
	if matchResource(actionIdx[Wildcard], resource) {
		return Decision{Allowed: true, Reason: "rule matched: " + role + "/*/" + resource}
	}

	return Decision{Allowed: false, Reason: "no matching rule"}
}

// CheckAny returns allow if ANY of the roles are granted the permission.
func (p *Policy) CheckAny(roles []string, action, resource string) Decision {
	for _, r := range roles {
		if d := p.Check(r, action, resource); d.Allowed {
			return d
		}
	}
	return Decision{Allowed: false, Reason: "no role grants permission"}
}

func matchResource(resources map[string]struct{}, resource string) bool {
	if resources == nil {
		return false
	}
	if _, ok := resources[resource]; ok {
		return true
	}
	if _, ok := resources[Wildcard]; ok {
		return true
	}
	return false
}
