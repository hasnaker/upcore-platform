package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/upcore/organization/internal/domain"
)

func TestWriteJSON_NilSkips(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil should skip")
	}
}

func TestNewValidator_Ok(t *testing.T) {
	if NewValidator() == nil {
		t.Fatal("nil validator")
	}
}

func TestDecodeJSON_UnknownFieldAndBad(t *testing.T) {
	type S struct{ A string `json:"a"` }
	var s S
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","zz":"y"}`))
	if err := DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
	r2 := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`bad`))
	if err := DecodeJSON(r2, &s); err == nil {
		t.Errorf("bad json must fail")
	}
}

func TestWriteError_DomainMappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrDuplicateCode, http.StatusConflict, "duplicate_code"},
		{domain.ErrDepartmentNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrPositionNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrTeamNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrCycleDetected, http.StatusConflict, "conflict"},
		{domain.ErrManagerCycle, http.StatusConflict, "conflict"},
		{domain.ErrDepartmentHasChildren, http.StatusConflict, "conflict"},
		{domain.ErrPositionInUse, http.StatusConflict, "conflict"},
		{domain.ErrAlreadyArchived, http.StatusConflict, "conflict"},
		{domain.ErrMaxDepthExceeded, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidPath, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrSelfManager, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{errors.New("bilinmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		WriteError(w, c.err)
		if w.Code != c.wantCode {
			t.Errorf("%v: status want %d, got %d", c.err, c.wantCode, w.Code)
		}
		var env ErrorResponse
		_ = json.Unmarshal(w.Body.Bytes(), &env)
		if env.Error != c.wantError {
			t.Errorf("%v: error want %s, got %s", c.err, c.wantError, env.Error)
		}
	}
}

func TestWriteError_ValidationFieldsFromDomain(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"code": "required"})
	w := httptest.NewRecorder()
	WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["code"] != "required" {
		t.Errorf("fields: %+v", env.Fields)
	}
}

func TestWriteError_ValidationFieldsFromValidator(t *testing.T) {
	type payload struct {
		Name string `validate:"required"`
	}
	v := NewValidator()
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
