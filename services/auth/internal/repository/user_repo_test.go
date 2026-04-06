package repository

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/auth/internal/domain"
)

// These are behavioral tests on domain.User validation used by the repo.
// Integration tests against real Postgres live in tests/integration (invoked via Makefile target).

func TestIsUniqueViolation(t *testing.T) {
	assert.False(t, isUniqueViolation(nil))
	assert.True(t, isUniqueViolation(&stringErr{"pq: duplicate key violates unique constraint"}))
	assert.False(t, isUniqueViolation(&stringErr{"other error"}))
}

func TestUser_Validate(t *testing.T) {
	tenantID := uuid.New()
	cases := []struct {
		name    string
		user    *domain.User
		wantErr bool
	}{
		{"happy", &domain.User{ClerkID: "usr_1", TenantID: tenantID, Email: "a@b.com", Status: domain.UserStatusActive}, false},
		{"no clerk id", &domain.User{TenantID: tenantID, Email: "a@b.com", Status: domain.UserStatusActive}, true},
		{"no tenant", &domain.User{ClerkID: "x", Email: "a@b.com", Status: domain.UserStatusActive}, true},
		{"no email", &domain.User{ClerkID: "x", TenantID: tenantID, Status: domain.UserStatusActive}, true},
		{"bad email", &domain.User{ClerkID: "x", TenantID: tenantID, Email: "no-at", Status: domain.UserStatusActive}, true},
		{"bad status", &domain.User{ClerkID: "x", TenantID: tenantID, Email: "a@b.com", Status: "weird"}, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.user.Validate()
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, "tr-TR", tc.user.Locale)
			}
		})
	}
}

func TestUser_IsActive(t *testing.T) {
	u := &domain.User{Status: domain.UserStatusActive}
	assert.True(t, u.IsActive())
	u.Status = domain.UserStatusSuspended
	assert.False(t, u.IsActive())
}

func TestUser_FullName(t *testing.T) {
	u := &domain.User{FirstName: "Ada", LastName: "Lovelace"}
	assert.Equal(t, "Ada Lovelace", u.FullName())
	u.LastName = ""
	assert.Equal(t, "Ada", u.FullName())
}

func TestUser_MetadataRoundTrip(t *testing.T) {
	meta := json.RawMessage(`{"tenant_id":"abc"}`)
	u := &domain.User{
		ClerkID:  "c1",
		TenantID: uuid.New(),
		Email:    "a@b.com",
		Status:   domain.UserStatusActive,
		Metadata: meta,
	}
	require.NoError(t, u.Validate())
	assert.JSONEq(t, `{"tenant_id":"abc"}`, string(u.Metadata))
}

type stringErr struct{ s string }

func (e *stringErr) Error() string { return e.s }
