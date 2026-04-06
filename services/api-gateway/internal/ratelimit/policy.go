package ratelimit

// Policy defines rate limits for a specific route or default.
type Policy struct {
	Path      string
	PerUser   int
	PerTenant int
}

// DefaultPolicy is the fallback rate limit policy.
var DefaultPolicy = Policy{
	Path:      "*",
	PerUser:   100,
	PerTenant: 1000,
}

// PolicyStore holds route-specific rate limit policies.
type PolicyStore struct {
	policies map[string]Policy
	fallback Policy
}

// NewPolicyStore creates a new policy store with the given fallback policy.
func NewPolicyStore(fallback Policy) *PolicyStore {
	return &PolicyStore{
		policies: make(map[string]Policy),
		fallback: fallback,
	}
}

// Register adds a route-specific rate limit policy.
func (ps *PolicyStore) Register(path string, perUser, perTenant int) {
	ps.policies[path] = Policy{
		Path:      path,
		PerUser:   perUser,
		PerTenant: perTenant,
	}
}

// PolicyFor returns the rate limit policy for the given path.
// It performs a longest-prefix match against registered policies.
func (ps *PolicyStore) PolicyFor(path string) Policy {
	var best Policy
	bestLen := 0

	for prefix, p := range ps.policies {
		if len(prefix) > bestLen && len(path) >= len(prefix) && path[:len(prefix)] == prefix {
			best = p
			bestLen = len(prefix)
		}
	}

	if bestLen == 0 {
		return ps.fallback
	}
	return best
}
