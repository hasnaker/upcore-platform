package storage

import (
	"bytes"
	"context"
	"io"
	"net/url"
	"sync"
	"time"
)

// MemoryBlobClient is an in-memory BlobClient for tests and local dev.
type MemoryBlobClient struct {
	mu    sync.RWMutex
	blobs map[string][]byte
}

// NewMemoryBlobClient returns a fresh in-memory client.
func NewMemoryBlobClient() *MemoryBlobClient {
	return &MemoryBlobClient{blobs: map[string][]byte{}}
}

func (m *MemoryBlobClient) k(container, key string) string { return container + "/" + key }

// Upload streams body into memory.
func (m *MemoryBlobClient) Upload(_ context.Context, container, key string, r io.Reader, _ string) error {
	buf, err := io.ReadAll(r)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.blobs[m.k(container, key)] = buf
	return nil
}

// Download returns a reader over the stored bytes.
func (m *MemoryBlobClient) Download(_ context.Context, container, key string) (io.ReadCloser, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	b, ok := m.blobs[m.k(container, key)]
	if !ok {
		return nil, ErrBlobNotFound
	}
	return io.NopCloser(bytes.NewReader(b)), nil
}

// Delete removes a blob if present.
func (m *MemoryBlobClient) Delete(_ context.Context, container, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := m.k(container, key)
	if _, ok := m.blobs[k]; !ok {
		return ErrBlobNotFound
	}
	delete(m.blobs, k)
	return nil
}

// Exists reports whether the blob is present.
func (m *MemoryBlobClient) Exists(_ context.Context, container, key string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, ok := m.blobs[m.k(container, key)]
	return ok, nil
}

// SignedReadURL returns a synthetic URL. Tests only.
func (m *MemoryBlobClient) SignedReadURL(_ context.Context, container, key, filename string, ttl time.Duration) (string, error) {
	q := url.Values{}
	q.Set("exp", time.Now().UTC().Add(ttl).Format(time.RFC3339))
	if filename != "" {
		q.Set("filename", filename)
	}
	return "mem://" + container + "/" + key + "?" + q.Encode(), nil
}

// SignedWriteURL returns a synthetic URL. Tests only.
func (m *MemoryBlobClient) SignedWriteURL(_ context.Context, container, key string, ttl time.Duration) (string, error) {
	q := url.Values{}
	q.Set("exp", time.Now().UTC().Add(ttl).Format(time.RFC3339))
	q.Set("mode", "write")
	return "mem://" + container + "/" + key + "?" + q.Encode(), nil
}

// Ensure compile-time interface satisfaction.
var _ BlobClient = (*MemoryBlobClient)(nil)
