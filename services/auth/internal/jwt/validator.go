package jwt

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/upcore/auth/internal/domain"
)

// jwk is one JSON Web Key from a JWKS document.
type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwks struct {
	Keys []jwk `json:"keys"`
}

// KeyFetcher returns the public key for a given kid. Safe for concurrent use.
type KeyFetcher interface {
	Fetch(ctx context.Context, kid string) (*rsa.PublicKey, error)
}

// StaticKeyFetcher is a test helper returning a pre-registered key set.
type StaticKeyFetcher struct {
	Keys map[string]*rsa.PublicKey
}

// Fetch implements KeyFetcher.
func (s *StaticKeyFetcher) Fetch(_ context.Context, kid string) (*rsa.PublicKey, error) {
	k, ok := s.Keys[kid]
	if !ok {
		return nil, fmt.Errorf("kid %q not found", kid)
	}
	return k, nil
}

// RemoteJWKS fetches and caches a JWKS endpoint.
type RemoteJWKS struct {
	url      string
	ttl      time.Duration
	http     *http.Client
	mu       sync.RWMutex
	cache    map[string]*rsa.PublicKey
	fetchedAt time.Time
}

// NewRemoteJWKS constructs a JWKS cache with the given TTL.
func NewRemoteJWKS(url string, ttl time.Duration) *RemoteJWKS {
	return &RemoteJWKS{
		url:   url,
		ttl:   ttl,
		http:  &http.Client{Timeout: 10 * time.Second},
		cache: map[string]*rsa.PublicKey{},
	}
}

// Fetch returns the public key for kid, refreshing the cache if stale.
func (j *RemoteJWKS) Fetch(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	j.mu.RLock()
	key, ok := j.cache[kid]
	fresh := time.Since(j.fetchedAt) < j.ttl
	j.mu.RUnlock()
	if ok && fresh {
		return key, nil
	}

	if err := j.refresh(ctx); err != nil {
		return nil, err
	}

	j.mu.RLock()
	defer j.mu.RUnlock()
	if k, ok := j.cache[kid]; ok {
		return k, nil
	}
	return nil, fmt.Errorf("kid %q not present in jwks", kid)
}

func (j *RemoteJWKS) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, j.url, nil)
	if err != nil {
		return err
	}
	resp, err := j.http.Do(req)
	if err != nil {
		return fmt.Errorf("fetch jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks endpoint returned %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	var set jwks
	if err := json.Unmarshal(body, &set); err != nil {
		return fmt.Errorf("decode jwks: %w", err)
	}
	next := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := rsaFromJWK(k)
		if err != nil {
			continue
		}
		next[k.Kid] = pub
	}

	j.mu.Lock()
	j.cache = next
	j.fetchedAt = time.Now()
	j.mu.Unlock()
	return nil
}

func rsaFromJWK(k jwk) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("decode n: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("decode e: %w", err)
	}
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}
	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: e,
	}, nil
}

// Validator verifies RS256 JWTs against a KeyFetcher and checks iss/aud/exp.
type Validator struct {
	keys     KeyFetcher
	issuer   string
	audience string
}

// NewValidator constructs a validator.
func NewValidator(keys KeyFetcher, issuer, audience string) *Validator {
	return &Validator{keys: keys, issuer: issuer, audience: audience}
}

// Validate parses & verifies the token and returns its claims.
func (v *Validator) Validate(ctx context.Context, tokenString string) (*Claims, error) {
	keyFn := func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("%w: unexpected alg %q", domain.ErrInvalidToken, t.Method.Alg())
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, fmt.Errorf("%w: missing kid", domain.ErrInvalidToken)
		}
		return v.keys.Fetch(ctx, kid)
	}

	claims := &Claims{}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}),
		jwt.WithLeeway(30*time.Second),
	)
	tok, err := parser.ParseWithClaims(tokenString, claims, keyFn)
	if err != nil {
		if isExpired(err) {
			return nil, domain.ErrTokenExpired
		}
		return nil, fmt.Errorf("%w: %v", domain.ErrInvalidToken, err)
	}
	if !tok.Valid {
		return nil, domain.ErrInvalidToken
	}

	if v.issuer != "" && claims.Issuer != v.issuer {
		return nil, fmt.Errorf("%w: issuer %q not allowed", domain.ErrInvalidToken, claims.Issuer)
	}
	if v.audience != "" {
		ok := false
		for _, a := range claims.Audience {
			if a == v.audience {
				ok = true
				break
			}
		}
		if !ok {
			return nil, fmt.Errorf("%w: audience mismatch", domain.ErrInvalidToken)
		}
	}
	return claims, nil
}

func isExpired(err error) bool {
	return err != nil && (errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, jwt.ErrTokenNotValidYet))
}
