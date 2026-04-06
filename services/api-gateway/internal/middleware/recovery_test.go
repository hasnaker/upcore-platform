package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
)

func TestRecoveryMiddleware_CatchesPanic(t *testing.T) {
	logger := zerolog.Nop()

	handler := RecoveryMiddleware(logger)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			panic("something went wrong")
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	// Should not panic
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var body map[string]string
	err := json.NewDecoder(rec.Body).Decode(&body)
	assert.NoError(t, err)
	assert.Equal(t, "internal_server_error", body["error"])
}

func TestRecoveryMiddleware_NoPanic(t *testing.T) {
	logger := zerolog.Nop()

	handler := RecoveryMiddleware(logger)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}
