package jwt

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// JWKSCache fetches and caches JWKS (JSON Web Key Set) keys from a remote endpoint.
type JWKSCache struct {
	url       string
	ttl       time.Duration
	keys      map[string]*rsa.PublicKey
	lastFetch time.Time
	mu        sync.RWMutex
	client    *http.Client
}

// jwksResponse is the JWKS endpoint response structure.
type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

// jwkKey represents a single JWK key.
type jwkKey struct {
	KID string `json:"kid"`
	KTY string `json:"kty"`
	ALG string `json:"alg"`
	USE string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// NewJWKSCache creates a new JWKS cache that refreshes from the given URL.
func NewJWKSCache(url string, ttl time.Duration) *JWKSCache {
	return &JWKSCache{
		url:  url,
		ttl:  ttl,
		keys: make(map[string]*rsa.PublicKey),
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Get returns the public key for the given key ID. It refreshes the cache if
// expired or if the key is not found.
func (c *JWKSCache) Get(kid string) (*rsa.PublicKey, error) {
	c.mu.RLock()
	key, ok := c.keys[kid]
	expired := time.Since(c.lastFetch) > c.ttl
	c.mu.RUnlock()

	if ok && !expired {
		return key, nil
	}

	// Refresh cache
	if err := c.refresh(); err != nil {
		// If we have a stale key, return it rather than failing
		if ok {
			log.Warn().Err(err).Str("kid", kid).Msg("jwks refresh failed, using stale key")
			return key, nil
		}
		return nil, fmt.Errorf("jwks refresh: %w", err)
	}

	c.mu.RLock()
	key, ok = c.keys[kid]
	c.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

// refresh fetches the JWKS endpoint and updates the key cache.
func (c *JWKSCache) refresh() error {
	resp, err := c.client.Get(c.url)
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned %d", resp.StatusCode)
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		if k.KTY != "RSA" {
			continue
		}

		pubKey, err := parseRSAPublicKey(k)
		if err != nil {
			log.Warn().Err(err).Str("kid", k.KID).Msg("skip invalid JWKS key")
			continue
		}
		keys[k.KID] = pubKey
	}

	if len(keys) == 0 {
		return fmt.Errorf("no valid RSA keys found in JWKS response")
	}

	c.mu.Lock()
	c.keys = keys
	c.lastFetch = time.Now()
	c.mu.Unlock()

	log.Debug().Int("keys", len(keys)).Msg("jwks cache refreshed")
	return nil
}

// parseRSAPublicKey converts a JWK key to an RSA public key.
func parseRSAPublicKey(k jwkKey) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, fmt.Errorf("decode modulus: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, fmt.Errorf("decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}

// SetTestKey adds a key to the cache for testing purposes.
func (c *JWKSCache) SetTestKey(kid string, key *rsa.PublicKey) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.keys[kid] = key
	c.lastFetch = time.Now()
}
