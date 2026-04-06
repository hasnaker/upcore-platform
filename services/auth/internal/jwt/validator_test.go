package jwt

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"errors"
	"testing"
	"time"

	gjwt "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/auth/internal/domain"
)

func newTestKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	return key
}

func signToken(t *testing.T, key *rsa.PrivateKey, kid string, claims *Claims) string {
	t.Helper()
	tok := gjwt.NewWithClaims(gjwt.SigningMethodRS256, claims)
	tok.Header["kid"] = kid
	s, err := tok.SignedString(key)
	require.NoError(t, err)
	return s
}

func TestValidator_Happy(t *testing.T) {
	key := newTestKey(t)
	fetcher := &StaticKeyFetcher{Keys: map[string]*rsa.PublicKey{"k1": &key.PublicKey}}
	v := NewValidator(fetcher, "https://clerk.upcore.app", "upcore-api")

	now := time.Now()
	claims := &Claims{
		UserID:   uuid.NewString(),
		TenantID: uuid.NewString(),
		Email:    "a@b.com",
		Role:     "employee",
		Roles:    []string{"employee"},
		RegisteredClaims: gjwt.RegisteredClaims{
			Issuer:    "https://clerk.upcore.app",
			Audience:  gjwt.ClaimStrings{"upcore-api"},
			ExpiresAt: gjwt.NewNumericDate(now.Add(10 * time.Minute)),
			IssuedAt:  gjwt.NewNumericDate(now),
			NotBefore: gjwt.NewNumericDate(now.Add(-1 * time.Second)),
			Subject:   "clerk-user-123",
		},
	}
	token := signToken(t, key, "k1", claims)

	got, err := v.Validate(context.Background(), token)
	require.NoError(t, err)
	assert.Equal(t, "employee", got.Role)
	assert.Equal(t, claims.UserID, got.UserID)
}

func TestValidator_Expired(t *testing.T) {
	key := newTestKey(t)
	fetcher := &StaticKeyFetcher{Keys: map[string]*rsa.PublicKey{"k1": &key.PublicKey}}
	v := NewValidator(fetcher, "iss", "aud")

	now := time.Now()
	claims := &Claims{
		RegisteredClaims: gjwt.RegisteredClaims{
			Issuer:    "iss",
			Audience:  gjwt.ClaimStrings{"aud"},
			ExpiresAt: gjwt.NewNumericDate(now.Add(-10 * time.Minute)),
			IssuedAt:  gjwt.NewNumericDate(now.Add(-20 * time.Minute)),
		},
	}
	token := signToken(t, key, "k1", claims)

	_, err := v.Validate(context.Background(), token)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrTokenExpired))
}

func TestValidator_BadIssuer(t *testing.T) {
	key := newTestKey(t)
	fetcher := &StaticKeyFetcher{Keys: map[string]*rsa.PublicKey{"k1": &key.PublicKey}}
	v := NewValidator(fetcher, "iss", "aud")

	now := time.Now()
	claims := &Claims{
		RegisteredClaims: gjwt.RegisteredClaims{
			Issuer:    "wrong",
			Audience:  gjwt.ClaimStrings{"aud"},
			ExpiresAt: gjwt.NewNumericDate(now.Add(10 * time.Minute)),
			IssuedAt:  gjwt.NewNumericDate(now),
		},
	}
	token := signToken(t, key, "k1", claims)

	_, err := v.Validate(context.Background(), token)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrInvalidToken))
}

func TestValidator_BadAudience(t *testing.T) {
	key := newTestKey(t)
	fetcher := &StaticKeyFetcher{Keys: map[string]*rsa.PublicKey{"k1": &key.PublicKey}}
	v := NewValidator(fetcher, "iss", "aud")

	now := time.Now()
	claims := &Claims{
		RegisteredClaims: gjwt.RegisteredClaims{
			Issuer:    "iss",
			Audience:  gjwt.ClaimStrings{"other"},
			ExpiresAt: gjwt.NewNumericDate(now.Add(10 * time.Minute)),
			IssuedAt:  gjwt.NewNumericDate(now),
		},
	}
	token := signToken(t, key, "k1", claims)

	_, err := v.Validate(context.Background(), token)
	require.Error(t, err)
}

func TestValidator_UnknownKid(t *testing.T) {
	key := newTestKey(t)
	fetcher := &StaticKeyFetcher{Keys: map[string]*rsa.PublicKey{"k1": &key.PublicKey}}
	v := NewValidator(fetcher, "iss", "aud")

	now := time.Now()
	claims := &Claims{
		RegisteredClaims: gjwt.RegisteredClaims{
			Issuer:    "iss",
			Audience:  gjwt.ClaimStrings{"aud"},
			ExpiresAt: gjwt.NewNumericDate(now.Add(10 * time.Minute)),
			IssuedAt:  gjwt.NewNumericDate(now),
		},
	}
	token := signToken(t, key, "unknown", claims)

	_, err := v.Validate(context.Background(), token)
	require.Error(t, err)
}

func TestClaims_EffectiveRoles(t *testing.T) {
	c := &Claims{Role: "hr_manager", Roles: []string{"employee", "hr_manager"}}
	roles := c.EffectiveRoles()
	assert.Equal(t, []string{"hr_manager", "employee"}, roles)
}

func TestClaims_ParsedIDs(t *testing.T) {
	uid := uuid.NewString()
	c := &Claims{UserID: uid, TenantID: uid}
	u, err := c.ParsedUserID()
	require.NoError(t, err)
	assert.Equal(t, uid, u.String())

	tid, err := c.ParsedTenantID()
	require.NoError(t, err)
	assert.Equal(t, uid, tid.String())

	empty := &Claims{}
	_, err = empty.ParsedUserID()
	assert.Error(t, err)
}
