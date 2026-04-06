package jwt

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Validator verifies JWT tokens using cached JWKS keys.
type Validator struct {
	jwks     *JWKSCache
	issuer   string
	audience string
}

// NewValidator creates a new JWT validator.
func NewValidator(jwks *JWKSCache, issuer, audience string) *Validator {
	return &Validator{
		jwks:     jwks,
		issuer:   issuer,
		audience: audience,
	}
}

// Validate parses and validates the JWT token string, returning the claims on success.
func (v *Validator) Validate(tokenString string) (*Claims, error) {
	// Remove "Bearer " prefix if present
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	tokenString = strings.TrimPrefix(tokenString, "bearer ")

	if tokenString == "" {
		return nil, fmt.Errorf("empty token")
	}

	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate signing algorithm
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Get key ID from token header
		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, fmt.Errorf("token missing kid header")
		}

		// Fetch the public key from JWKS cache
		return v.jwks.Get(kid)
	},
		jwt.WithIssuer(v.issuer),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
	)

	if err != nil {
		return nil, fmt.Errorf("token validation: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Validate audience if configured
	if v.audience != "" {
		aud, err := claims.GetAudience()
		if err != nil || !containsAudience(aud, v.audience) {
			return nil, fmt.Errorf("invalid audience")
		}
	}

	return claims, nil
}

// containsAudience checks if the audience list contains the expected audience.
func containsAudience(audiences jwt.ClaimStrings, expected string) bool {
	for _, a := range audiences {
		if a == expected {
			return true
		}
	}
	return false
}
