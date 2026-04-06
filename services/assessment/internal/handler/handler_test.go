package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/upcore/assessment/internal/domain"
)

func TestHealthEndpoint(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	handleHealth(w, r)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"status":"ok"`)
}

func TestReadyEndpoint(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/ready", nil)
	handleReady(w, r)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"status":"ready"`)
}

func TestMapError_StatusCodes(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantError  string
	}{
		{"assessment not found", domain.ErrAssessmentNotFound, http.StatusNotFound, "not_found"},
		{"session not found", domain.ErrSessionNotFound, http.StatusNotFound, "not_found"},
		{"conflict", domain.ErrConflict, http.StatusConflict, "conflict"},
		{"unauthorized", domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{"forbidden", domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{"expired", domain.ErrAssessmentExpired, http.StatusUnprocessableEntity, "validation_error"},
		{"cheating", domain.ErrCheatingDetected, http.StatusForbidden, "cheating_detected"},
		{"scoring failed", domain.ErrScoringFailed, http.StatusBadGateway, "scoring_failed"},
		{"nil error", nil, http.StatusOK, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, resp := mapError(tt.err)
			assert.Equal(t, tt.wantStatus, status)
			assert.Equal(t, tt.wantError, resp.Error)
		})
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusOK, map[string]string{"key": "value"})
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
	assert.Contains(t, w.Body.String(), `"key":"value"`)
}

func TestParseUUID_Invalid(t *testing.T) {
	w := httptest.NewRecorder()
	_, ok := ParseUUID(w, "not-a-uuid")
	assert.False(t, ok)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestParseIntQuery(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?page=3&invalid=abc", nil)
	assert.Equal(t, 3, ParseIntQuery(r, "page", 1))
	assert.Equal(t, 1, ParseIntQuery(r, "invalid", 1))
	assert.Equal(t, 50, ParseIntQuery(r, "missing", 50))
}
