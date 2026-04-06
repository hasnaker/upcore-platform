package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"
)

const gzipMinSize = 1024 // 1KB minimum for compression

var gzipPool = sync.Pool{
	New: func() interface{} {
		gz, _ := gzip.NewWriterLevel(io.Discard, gzip.DefaultCompression)
		return gz
	},
}

type gzipResponseWriter struct {
	http.ResponseWriter
	writer *gzip.Writer
	status int
	buf    []byte
	sent   bool
}

func (g *gzipResponseWriter) WriteHeader(code int) {
	g.status = code
	// Don't write header yet; we need to decide on compression first
}

func (g *gzipResponseWriter) Write(b []byte) (int, error) {
	if g.sent {
		return g.writer.Write(b)
	}

	g.buf = append(g.buf, b...)

	// If we have enough data, decide on compression
	if len(g.buf) >= gzipMinSize {
		return g.flush()
	}
	return len(b), nil
}

func (g *gzipResponseWriter) flush() (int, error) {
	g.sent = true
	contentType := g.ResponseWriter.Header().Get("Content-Type")

	// Only compress text-based content types
	if isCompressible(contentType) && len(g.buf) >= gzipMinSize {
		g.ResponseWriter.Header().Set("Content-Encoding", "gzip")
		g.ResponseWriter.Header().Del("Content-Length")
		if g.status > 0 {
			g.ResponseWriter.WriteHeader(g.status)
		}
		g.writer.Reset(g.ResponseWriter)
		n, err := g.writer.Write(g.buf)
		return n, err
	}

	// Not compressing, write directly
	if g.status > 0 {
		g.ResponseWriter.WriteHeader(g.status)
	}
	return g.ResponseWriter.Write(g.buf)
}

func (g *gzipResponseWriter) Close() error {
	if !g.sent && len(g.buf) > 0 {
		g.flush()
	}
	if g.sent && g.writer != nil {
		return g.writer.Close()
	}
	return nil
}

func (g *gzipResponseWriter) Flush() {
	if f, ok := g.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// GzipMiddleware compresses response bodies larger than 1KB for clients
// that accept gzip encoding.
func GzipMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
				next.ServeHTTP(w, r)
				return
			}

			gz := gzipPool.Get().(*gzip.Writer)
			defer gzipPool.Put(gz)

			grw := &gzipResponseWriter{
				ResponseWriter: w,
				writer:         gz,
			}
			defer grw.Close()

			next.ServeHTTP(grw, r)
		})
	}
}

// isCompressible returns true for text-based content types.
func isCompressible(contentType string) bool {
	compressible := []string{
		"application/json",
		"application/xml",
		"text/html",
		"text/plain",
		"text/css",
		"text/javascript",
		"application/javascript",
	}
	for _, ct := range compressible {
		if strings.Contains(contentType, ct) {
			return true
		}
	}
	return false
}
