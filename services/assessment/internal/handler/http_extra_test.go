package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/upcore/assessment/internal/domain"
)

func TestWriteJSON_NilSkips(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil body expected to skip")
	}
}

func TestParseUUID_InvalidWrites400(t *testing.T) {
	w := httptest.NewRecorder()
	_, ok := ParseUUID(w, "not-a-uuid")
	if ok {
		t.Errorf("invalid must fail")
	}
	if w.Code != http.StatusBadRequest {
		t.Errorf("status: %d", w.Code)
	}
}

func TestParseUUID_Valid(t *testing.T) {
	id := uuid.New()
	w := httptest.NewRecorder()
	got, ok := ParseUUID(w, id.String())
	if !ok || got != id {
		t.Errorf("valid parse")
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","zz":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
}

func TestParseIntQuery_Branches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=4&bad=abc&neg=-1", nil)
	if ParseIntQuery(r, "n", 0) != 4 {
		t.Errorf("parse")
	}
	if ParseIntQuery(r, "bad", 7) != 7 {
		t.Errorf("fallback non-int")
	}
	if ParseIntQuery(r, "neg", 5) != 5 {
		t.Errorf("fallback negative")
	}
	if ParseIntQuery(r, "miss", 3) != 3 {
		t.Errorf("fallback missing")
	}
}

func TestWriteError_Mappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrAssessmentNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrSessionNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{domain.ErrSessionActive, http.StatusConflict, "conflict"},
		{domain.ErrInvalidToken, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrTokenExpired, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{domain.ErrAssessmentExpired, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrSessionTimedOut, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidInstrument, http.StatusUnprocessableEntity, "validation_error"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		WriteError(w, c.err)
		if w.Code != c.wantCode {
			t.Errorf("%v: want %d, got %d", c.err, c.wantCode, w.Code)
		}
		var env ErrorResponse
		_ = json.Unmarshal(w.Body.Bytes(), &env)
		if env.Error != c.wantError {
			t.Errorf("%v: error want %s, got %s", c.err, c.wantError, env.Error)
		}
	}
}

func TestWriteError_ValidationFieldsFromDomain(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"instrument": "required"})
	w := httptest.NewRecorder()
	WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["instrument"] != "required" {
		t.Errorf("fields: %+v", env.Fields)
	}
}

func TestWriteError_ValidatorFieldsPath(t *testing.T) {
	type payload struct {
		Name string `validate:"required"`
	}
	v := validator.New(validator.WithRequiredStructEnabled())
	vErr := v.Struct(payload{})
	w := httptest.NewRecorder()
	WriteError(w, vErr)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["name"] == "" {
		t.Errorf("validator fields: %+v", env.Fields)
	}
}
