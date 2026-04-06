package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGzipMiddleware_CompressesLargeResponse(t *testing.T) {
	largeBody := strings.Repeat("hello world ", 200) // > 1KB

	handler := GzipMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(largeBody))
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "gzip", rec.Header().Get("Content-Encoding"))

	// Decompress and verify
	reader, err := gzip.NewReader(rec.Body)
	require.NoError(t, err)
	defer reader.Close()

	decoded, err := io.ReadAll(reader)
	require.NoError(t, err)
	assert.Equal(t, largeBody, string(decoded))
}

func TestGzipMiddleware_NoCompressSmallResponse(t *testing.T) {
	smallBody := "small"

	handler := GzipMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(smallBody))
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	// Small response should not be compressed
	assert.Empty(t, rec.Header().Get("Content-Encoding"))
	assert.Equal(t, smallBody, rec.Body.String())
}

func TestGzipMiddleware_SkipsWithoutAcceptEncoding(t *testing.T) {
	body := strings.Repeat("hello world ", 200)

	handler := GzipMiddleware()(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(body))
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	// No Accept-Encoding header
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Empty(t, rec.Header().Get("Content-Encoding"))
	assert.Equal(t, body, rec.Body.String())
}

func TestIsCompressible(t *testing.T) {
	tests := []struct {
		contentType string
		expected    bool
	}{
		{"application/json", true},
		{"application/json; charset=utf-8", true},
		{"application/xml", true},
		{"text/html", true},
		{"text/plain", true},
		{"text/css", true},
		{"application/javascript", true},
		{"image/png", false},
		{"application/octet-stream", false},
		{"video/mp4", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.contentType, func(t *testing.T) {
			assert.Equal(t, tt.expected, isCompressible(tt.contentType))
		})
	}
}
