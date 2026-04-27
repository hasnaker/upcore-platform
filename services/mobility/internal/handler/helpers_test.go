package handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
)

func TestWriteJSON_StatusAndContentType(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusCreated, map[string]int{"n": 42})
	if w.Code != http.StatusCreated {
		t.Errorf("status: want 201, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Errorf("content-type: %s", ct)
	}
	var out map[string]int
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out["n"] != 42 {
		t.Errorf("body roundtrip")
	}
}

func TestWriteErr_EnvelopeShape(t *testing.T) {
	w := httptest.NewRecorder()
	WriteErr(w, http.StatusBadRequest, "invalid_body", "JSON yok")
	if w.Code != http.StatusBadRequest {
		t.Errorf("status wrong: %d", w.Code)
	}
	var body struct {
		Error map[string]string `json:"error"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body.Error["code"] != "invalid_body" || body.Error["message"] != "JSON yok" {
		t.Errorf("error envelope: %+v", body.Error)
	}
}

func TestMapDomainErr_Mapping(t *testing.T) {
	cases := []struct {
		err        error
		wantStatus int
		wantCode   string
	}{
		{domain.ErrNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrValidation, http.StatusBadRequest, "validation_failed"},
		{domain.ErrCooldownActive, http.StatusConflict, "cooldown_active"},
		{domain.ErrSuccessionPoolFull, http.StatusConflict, "pool_full"},
		{domain.ErrUnauthorized, http.StatusForbidden, "forbidden"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		MapDomainErr(w, zerolog.Nop(), c.err)
		if w.Code != c.wantStatus {
			t.Errorf("%v: status want %d, got %d", c.err, c.wantStatus, w.Code)
		}
		var body struct {
			Error map[string]string `json:"error"`
		}
		_ = json.Unmarshal(w.Body.Bytes(), &body)
		if body.Error["code"] != c.wantCode {
			t.Errorf("%v: code want %s, got %s", c.err, c.wantCode, body.Error["code"])
		}
	}
}

func TestParseUUID_ValidAndInvalid(t *testing.T) {
	valid := uuid.New()
	w := httptest.NewRecorder()
	got, ok := ParseUUID(w, valid.String(), "id")
	if !ok || got != valid {
		t.Errorf("valid uuid should parse; got=%v ok=%v", got, ok)
	}

	w2 := httptest.NewRecorder()
	_, ok2 := ParseUUID(w2, "not-a-uuid", "id")
	if ok2 {
		t.Errorf("invalid uuid should fail")
	}
	if w2.Code != http.StatusBadRequest {
		t.Errorf("bad uuid must 400, got %d", w2.Code)
	}
	if !strings.Contains(w2.Body.String(), "invalid_uuid") {
		t.Errorf("body should include invalid_uuid code")
	}
}

func TestDecodeJSON_GoodAndBad(t *testing.T) {
	// good
	r := httptest.NewRequest(http.MethodPost, "/x", bytes.NewBufferString(`{"name":"Ali"}`))
	w := httptest.NewRecorder()
	var body struct{ Name string `json:"name"` }
	if ok := DecodeJSON(w, r, &body); !ok {
		t.Errorf("valid JSON should decode")
	}
	if body.Name != "Ali" {
		t.Errorf("decode wrong: %v", body)
	}

	// bad
	r2 := httptest.NewRequest(http.MethodPost, "/x", bytes.NewBufferString(`not json`))
	w2 := httptest.NewRecorder()
	var body2 map[string]any
	if ok := DecodeJSON(w2, r2, &body2); ok {
		t.Errorf("invalid JSON should fail")
	}
	if w2.Code != http.StatusBadRequest {
		t.Errorf("bad JSON must 400, got %d", w2.Code)
	}
}
