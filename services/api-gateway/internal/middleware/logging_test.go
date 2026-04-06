package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
)

func TestLoggingMiddleware_LogsRequest(t *testing.T) {
	var buf bytes.Buffer
	logger := zerolog.New(&buf)

	handler := LoggingMiddleware(logger)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("hello"))
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test?q=search", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	logOutput := buf.String()
	assert.Contains(t, logOutput, "GET")
	assert.Contains(t, logOutput, "/api/v1/test")
	assert.Contains(t, logOutput, "request")
}

func TestLoggingMiddleware_CapturesStatus(t *testing.T) {
	var buf bytes.Buffer
	logger := zerolog.New(&buf)

	handler := LoggingMiddleware(logger)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/not-found", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	logOutput := buf.String()
	assert.Contains(t, logOutput, "404")
}

func TestStatusRecorder_DefaultStatus(t *testing.T) {
	rec := httptest.NewRecorder()
	sr := &statusRecorder{ResponseWriter: rec}

	sr.Write([]byte("test"))

	assert.Equal(t, http.StatusOK, sr.status)
	assert.Equal(t, 4, sr.size)
}

func TestStatusRecorder_ExplicitStatus(t *testing.T) {
	rec := httptest.NewRecorder()
	sr := &statusRecorder{ResponseWriter: rec}

	sr.WriteHeader(http.StatusCreated)
	sr.Write([]byte("created"))

	assert.Equal(t, http.StatusCreated, sr.status)
	assert.Equal(t, 7, sr.size)
}
