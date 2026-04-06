package rbac

import "sync"

// Policy is an immutable rule set backing the permission engine.
type Policy struct {
	mu    sync.RWMutex
	rules []Rule
	// index[role][action][resource] = true
	index map[string]map[string]map[string]struct{}
}

// NewPolicy constructs a policy from the default rule set.
func NewPolicy() *Policy {
	p := &Policy{}
	p.SetRules(DefaultRules)
	return p
}

// NewPolicyFromRules constructs a policy from a custom rule set.
func NewPolicyFromRules(rules []Rule) *Policy {
	p := &Policy{}
	p.SetRules(rules)
	return p
}

// SetRules atomically replaces the policy's rules and rebuilds the index.
func (p *Policy) SetRules(rules []Rule) {
	index := make(map[string]map[string]map[string]struct{})
	for _, r := range rules {
		if _, ok := index[r.Role]; !ok {
			index[r.Role] = make(map[string]map[string]struct{})
		}
		if _, ok := index[r.Role][r.Action]; !ok {
			index[r.Role][r.Action] = make(map[string]struct{})
		}
		index[r.Role][r.Action][r.Resource] = struct{}{}
	}
	p.mu.Lock()
	p.rules = append([]Rule(nil), rules...)
	p.index = index
	p.mu.Unlock()
}

// Rules returns a copy of the underlying rules.
func (p *Policy) Rules() []Rule {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]Rule, len(p.rules))
	copy(out, p.rules)
	return out
}
