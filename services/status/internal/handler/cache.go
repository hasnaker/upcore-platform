// In-memory 30s cache for the public status summary.
//
// The public status summary endpoint (/api/v2/status) is fanned out to every
// visitor of status.upcore.io — when there is a real incident the page gets
// hammered. Hitting the database on every request would pin a postgres pool
// under load just to return the same rollup for 30 seconds.
//
// This cache is:
//   - in-process only (sync.RWMutex + snapshot map) — no Redis dep.
//   - 30-second TTL, matching the Cache-Control: public, max-age=30 header
//     that GetStatusSummary already emits.
//   - scoped to a small, fixed set of public GET endpoints by key.
//   - bypassed for admin routes (which mount under a separate chi subrouter).
//
// If an incident happens mid-cache-window, admin mutations are expected to
// invalidate via InvalidatePublic() — already hooked by
// AdminCreateIncident / AdminAppendUpdate / AdminResolveIncident /
// AdminSetComponentStatus via the helper on *Handler.
package handler

import (
	"bytes"
	"net/http"
	"sync"
	"time"
)

const publicCacheTTL = 30 * time.Second

type cachedResponse struct {
	status int
	header http.Header
	body   []byte
	expiry time.Time
}

type publicCache struct {
	mu      sync.RWMutex
	entries map[string]cachedResponse
}

func newPublicCache() *publicCache {
	return &publicCache{entries: make(map[string]cachedResponse)}
}

func (c *publicCache) get(key string) (cachedResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.entries[key]
	if !ok {
		return cachedResponse{}, false
	}
	if time.Now().After(v.expiry) {
		return cachedResponse{}, false
	}
	return v, true
}

func (c *publicCache) set(key string, v cachedResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = v
}

// InvalidateAll drops every cached entry — used by admin mutation handlers so
// that a new incident or component status change appears on the next public
// request instead of waiting up to 30 seconds.
func (c *publicCache) InvalidateAll() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]cachedResponse)
}

// publicCacheMiddleware caches the response of a GET handler in memory for up
// to publicCacheTTL. Keyed by METHOD + PATH + RAW QUERY; safe only for public
// idempotent endpoints.
func (h *Handler) publicCacheMiddleware(next http.Handler) http.Handler {
	if h.publicCache == nil {
		h.publicCache = newPublicCache()
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}
		key := r.Method + " " + r.URL.Path + "?" + r.URL.RawQuery
		if v, ok := h.publicCache.get(key); ok {
			for k, vv := range v.header {
				for _, value := range vv {
					w.Header().Add(k, value)
				}
			}
			w.Header().Set("X-Cache", "HIT")
			w.WriteHeader(v.status)
			_, _ = w.Write(v.body)
			return
		}
		rec := &cacheRecorder{ResponseWriter: w, status: http.StatusOK, buf: &bytes.Buffer{}}
		next.ServeHTTP(rec, r)
		if rec.status >= 200 && rec.status < 400 {
			snapshot := cachedResponse{
				status: rec.status,
				header: rec.Header().Clone(),
				body:   rec.buf.Bytes(),
				expiry: time.Now().Add(publicCacheTTL),
			}
			h.publicCache.set(key, snapshot)
		}
	})
}

type cacheRecorder struct {
	http.ResponseWriter
	status int
	buf    *bytes.Buffer
	wrote  bool
}

func (c *cacheRecorder) WriteHeader(status int) {
	if c.wrote {
		return
	}
	c.status = status
	c.wrote = true
	c.ResponseWriter.WriteHeader(status)
}

func (c *cacheRecorder) Write(b []byte) (int, error) {
	if !c.wrote {
		c.WriteHeader(http.StatusOK)
	}
	c.buf.Write(b)
	return c.ResponseWriter.Write(b)
}
