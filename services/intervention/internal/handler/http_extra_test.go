package handler_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/handler"
)

func TestWriteJSON_NilSkipsEncoding(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil body must skip")
	}
}

func TestWriteServerError_InternalShape(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteServerError(w, errors.New("boom"))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status: %d", w.Code)
	}
	var env handler.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Error != "internal_error" {
		t.Errorf("envelope: %+v", env)
	}
}

func TestWriteDomainError_Mappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrInterventionNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrAssignmentNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrOutcomeNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrPosteriorNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrCodeTaken, http.StatusConflict, "conflict"},
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{domain.ErrAlreadyConsented, http.StatusConflict, "conflict"},
		{domain.ErrOutcomeExists, http.StatusConflict, "conflict"},
		{domain.ErrInvalidStatus, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrConsentRequired, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidBATScore, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		handler.WriteDomainError(w, c.err)
		if w.Code != c.wantCode {
			t.Errorf("%v: status want %d, got %d", c.err, c.wantCode, w.Code)
		}
		var env handler.ErrorResponse
		_ = json.Unmarshal(w.Body.Bytes(), &env)
		if env.Error != c.wantError {
			t.Errorf("%v: error want %s, got %s", c.err, c.wantError, env.Error)
		}
	}
}

func TestWriteDomainError_NilIsNoop(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteDomainError(w, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil must no-op")
	}
}

func TestWriteDomainError_ValidationFieldsPropagate(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"category": "required"})
	w := httptest.NewRecorder()
	handler.WriteDomainError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env handler.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["category"] != "required" {
		t.Errorf("fields: %+v", env.Fields)
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","b":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := handler.DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
}

func TestParseIntQuery_AllBranches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=3&bad=abc&neg=-1&e=", nil)
	if handler.ParseIntQuery(r, "n", 0) != 3 {
		t.Errorf("parse")
	}
	if handler.ParseIntQuery(r, "bad", 5) != 5 {
		t.Errorf("non-int fallback")
	}
	if handler.ParseIntQuery(r, "neg", 8) != 8 {
		t.Errorf("negative fallback")
	}
	if handler.ParseIntQuery(r, "e", 2) != 2 {
		t.Errorf("empty fallback")
	}
	if handler.ParseIntQuery(r, "m", 9) != 9 {
		t.Errorf("missing fallback")
	}
}
