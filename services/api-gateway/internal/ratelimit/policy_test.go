package ratelimit

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPolicyStore_PolicyFor_Default(t *testing.T) {
	store := NewPolicyStore(DefaultPolicy)

	policy := store.PolicyFor("/api/v1/unknown")
	assert.Equal(t, 100, policy.PerUser)
	assert.Equal(t, 1000, policy.PerTenant)
}

func TestPolicyStore_PolicyFor_Registered(t *testing.T) {
	store := NewPolicyStore(DefaultPolicy)
	store.Register("/api/v1/auth", 10, 100)
	store.Register("/api/v1/documents", 5, 50)

	authPolicy := store.PolicyFor("/api/v1/auth/login")
	assert.Equal(t, 10, authPolicy.PerUser)
	assert.Equal(t, 100, authPolicy.PerTenant)

	docPolicy := store.PolicyFor("/api/v1/documents/upload")
	assert.Equal(t, 5, docPolicy.PerUser)
	assert.Equal(t, 50, docPolicy.PerTenant)
}

func TestPolicyStore_PolicyFor_LongestPrefixWins(t *testing.T) {
	store := NewPolicyStore(DefaultPolicy)
	store.Register("/api/v1", 50, 500)
	store.Register("/api/v1/auth", 10, 100)
	store.Register("/api/v1/auth/login", 5, 50)

	policy := store.PolicyFor("/api/v1/auth/login")
	assert.Equal(t, 5, policy.PerUser)
	assert.Equal(t, 50, policy.PerTenant)

	policy2 := store.PolicyFor("/api/v1/auth/register")
	assert.Equal(t, 10, policy2.PerUser)
	assert.Equal(t, 100, policy2.PerTenant)

	policy3 := store.PolicyFor("/api/v1/tenants")
	assert.Equal(t, 50, policy3.PerUser)
	assert.Equal(t, 500, policy3.PerTenant)
}

func TestPolicyStore_PolicyFor_NoMatch(t *testing.T) {
	store := NewPolicyStore(DefaultPolicy)
	store.Register("/api/v1/auth", 10, 100)

	policy := store.PolicyFor("/health")
	assert.Equal(t, DefaultPolicy.PerUser, policy.PerUser)
	assert.Equal(t, DefaultPolicy.PerTenant, policy.PerTenant)
}
