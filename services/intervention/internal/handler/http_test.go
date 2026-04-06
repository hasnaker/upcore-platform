package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/intervention/internal/handler"
)

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")

	var body map[string]string
	err := json.NewDecoder(w.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "ok", body["status"])
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteError(w, http.StatusBadRequest, "bad_request", "invalid input")
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var body handler.ErrorResponse
	err := json.NewDecoder(w.Body).Decode(&body)
	require.NoError(t, err)
	assert.Equal(t, "bad_request", body.Error)
	assert.Equal(t, "invalid input", body.Message)
}

func TestDecodeJSON_Valid(t *testing.T) {
	body := `{"name":"test","value":42}`
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")

	var out map[string]any
	err := handler.DecodeJSON(r, &out)
	require.NoError(t, err)
	assert.Equal(t, "test", out["name"])
	assert.Equal(t, float64(42), out["value"])
}

func TestDecodeJSON_Invalid(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader("{bad json"))
	var out map[string]any
	err := handler.DecodeJSON(r, &out)
	assert.Error(t, err)
}

func TestParseUUID_Valid(t *testing.T) {
	w := httptest.NewRecorder()
	id, ok := handler.ParseUUID(w, "550e8400-e29b-41d4-a716-446655440000")
	assert.True(t, ok)
	assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", id.String())
}

func TestParseUUID_Invalid(t *testing.T) {
	w := httptest.NewRecorder()
	_, ok := handler.ParseUUID(w, "not-a-uuid")
	assert.False(t, ok)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestParseIntQuery(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?page=3&limit=abc", nil)
	assert.Equal(t, 3, handler.ParseIntQuery(r, "page", 1))
	assert.Equal(t, 50, handler.ParseIntQuery(r, "limit", 50))
	assert.Equal(t, 10, handler.ParseIntQuery(r, "missing", 10))
}

func TestParseUUIDQuery(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?id=550e8400-e29b-41d4-a716-446655440000", nil)
	uid := handler.ParseUUIDQuery(r, "id")
	require.NotNil(t, uid)
	assert.Equal(t, "550e8400-e29b-41d4-a716-446655440000", uid.String())

	missing := handler.ParseUUIDQuery(r, "nope")
	assert.Nil(t, missing)
}
