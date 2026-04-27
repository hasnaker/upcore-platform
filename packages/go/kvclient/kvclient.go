// Package kvclient provides a minimal Azure Key Vault client that authenticates
// via Managed Identity (DefaultAzureCredential chain). Use this from every Go
// service instead of reading secrets from environment variables.
//
// Example:
//
//	kv, err := kvclient.New(ctx, "kv-upcore-prod")
//	if err != nil { return err }
//	dsn, err := kv.Secret(ctx, "pg-dsn")
//
// The client caches values for `cacheTTL` and refreshes transparently. On
// rotation, services pick up the new value within one TTL window without
// restart.
package kvclient

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
)

// Client is a concurrency-safe Key Vault secret fetcher with TTL cache.
type Client struct {
	vaultURL string
	inner    *azsecrets.Client
	ttl      time.Duration

	mu    sync.RWMutex
	cache map[string]cached
}

type cached struct {
	value   string
	expires time.Time
}

// Option configures the Client.
type Option func(*Client)

// WithTTL overrides the default cache TTL (15 min).
func WithTTL(d time.Duration) Option {
	return func(c *Client) { c.ttl = d }
}

// New constructs a Client backed by Azure managed identity.
// vaultName is the short name (e.g. "kv-upcore-prod"); the .vault.azure.net
// suffix is appended automatically.
func New(ctx context.Context, vaultName string, opts ...Option) (*Client, error) {
	if vaultName == "" {
		return nil, errors.New("kvclient: vaultName required")
	}
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return nil, fmt.Errorf("kvclient: credential: %w", err)
	}
	url := fmt.Sprintf("https://%s.vault.azure.net/", vaultName)
	inner, err := azsecrets.NewClient(url, cred, &azsecrets.ClientOptions{
		ClientOptions: policy.ClientOptions{
			Retry: policy.RetryOptions{MaxRetries: 3, RetryDelay: 500 * time.Millisecond},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("kvclient: azsecrets client: %w", err)
	}
	c := &Client{
		vaultURL: url,
		inner:    inner,
		ttl:      15 * time.Minute,
		cache:    make(map[string]cached),
	}
	for _, o := range opts {
		o(c)
	}
	return c, nil
}

// Secret returns the current value of the named secret. Cached for TTL.
func (c *Client) Secret(ctx context.Context, name string) (string, error) {
	c.mu.RLock()
	if v, ok := c.cache[name]; ok && time.Now().Before(v.expires) {
		c.mu.RUnlock()
		return v.value, nil
	}
	c.mu.RUnlock()

	resp, err := c.inner.GetSecret(ctx, name, "", nil)
	if err != nil {
		return "", fmt.Errorf("kvclient: GetSecret(%s): %w", name, err)
	}
	if resp.Value == nil {
		return "", fmt.Errorf("kvclient: empty value for %s", name)
	}

	c.mu.Lock()
	c.cache[name] = cached{value: *resp.Value, expires: time.Now().Add(c.ttl)}
	c.mu.Unlock()
	return *resp.Value, nil
}

// Invalidate forces a refresh on the next Secret call.
func (c *Client) Invalidate(name string) {
	c.mu.Lock()
	delete(c.cache, name)
	c.mu.Unlock()
}
