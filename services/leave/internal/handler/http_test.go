package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/upcore/leave/internal/domain"
)

func TestWriteJSON_Basic(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusOK, map[string]string{"s": "ok"})
	if w.Code != http.StatusOK {
		t.Errorf("status: %d", w.Code)
	}
	if w.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Errorf("content-type")
	}
	if !strings.Contains(w.Body.String(), `"s":"ok"`) {
		t.Errorf("body: %s", w.Body.String())
	}
}

func TestWriteJSON_NilBodySkips(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil body should not write")
	}
}

func TestDecodeJSON_LimitAndUnknown(t *testing.T) {
	// unknown field
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","b":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must be rejected")
	}
	// invalid json
	r2 := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`nope`))
	if err := DecodeJSON(r2, &s); err == nil {
		t.Errorf("invalid json must fail")
	}
}

func TestWriteError_DomainMappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrLeaveTypeNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrLeaveRequestNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrInsufficientBalance, http.StatusConflict, "insufficient_balance"},
		{domain.ErrOverlappingRequest, http.StatusConflict, "overlap_detected"},
		{domain.ErrCannotCancel, http.StatusConflict, "invalid_state"},
		{domain.ErrRequestAlreadyHandled, http.StatusConflict, "invalid_state"},
		{domain.ErrDocumentRequired, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidDateRange, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrSelfApproval, http.StatusForbidden, "forbidden"},
		{domain.ErrWrongApprover, http.StatusForbidden, "forbidden"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
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
	err := domain.NewValidationError(map[string]string{"from": "required"})
	w := httptest.NewRecorder()
	WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["from"] != "required" {
		t.Errorf("fields: %+v", env.Fields)
	}
}

func TestWriteError_ValidationFieldsFromValidator(t *testing.T) {
	// Use the real validator library to trigger the validator.ValidationErrors branch.
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
		t.Errorf("validator fields must be mapped lowercase, got %+v", env.Fields)
	}
}

func TestNewValidator_Returns(t *testing.T) {
	if NewValidator() == nil {
		t.Errorf("validator must be non-nil")
	}
}
