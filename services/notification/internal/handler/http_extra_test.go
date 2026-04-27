package handler_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/handler"
)

func TestWriteJSON_NilSkipsEncoding(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil payload should not encode")
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","zz":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := handler.DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must be rejected")
	}
}

func TestDecodeJSON_InvalidJSON(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`garbage`))
	var s map[string]any
	if err := handler.DecodeJSON(r, &s); err == nil {
		t.Errorf("bad json must fail")
	}
}

func TestParseIntQuery_AllBranches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=7&bad=abc&neg=-3&empty=", nil)
	if got := handler.ParseIntQuery(r, "n", 1); got != 7 {
		t.Errorf("parse int: %d", got)
	}
	if got := handler.ParseIntQuery(r, "bad", 4); got != 4 {
		t.Errorf("non-int fallback: %d", got)
	}
	if got := handler.ParseIntQuery(r, "neg", 5); got != 5 {
		t.Errorf("negative fallback: %d", got)
	}
	if got := handler.ParseIntQuery(r, "empty", 6); got != 6 {
		t.Errorf("empty fallback: %d", got)
	}
	if got := handler.ParseIntQuery(r, "missing", 9); got != 9 {
		t.Errorf("missing fallback: %d", got)
	}
}

func TestWriteError_ValidationFieldsPassThrough(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"recipient": "required"})
	w := httptest.NewRecorder()
	handler.WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env handler.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["recipient"] != "required" {
		t.Errorf("fields: %+v", env.Fields)
	}
}

func TestWriteError_ExtraMappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{domain.ErrTemplateRenderFailed, http.StatusUnprocessableEntity, "template_error"},
		{domain.ErrInvalidChannel, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidStatus, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrMissingRecipient, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrPreferenceNotFound, http.StatusNotFound, "not_found"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		handler.WriteError(w, c.err)
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
