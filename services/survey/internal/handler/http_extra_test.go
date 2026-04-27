package handler_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/upcore/survey/internal/domain"
	"github.com/upcore/survey/internal/handler"
)

func TestWriteJSON_NilPayloadSkipsEncoding(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusNoContent, nil)
	if w.Code != http.StatusNoContent {
		t.Errorf("status: want 204, got %d", w.Code)
	}
	if w.Body.Len() != 0 {
		t.Errorf("nil body should not encode, got %q", w.Body.String())
	}
}

func TestWriteDomainError_CoversAllBranches(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrSurveyNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrInvitationNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrAlreadySubmitted, http.StatusConflict, "conflict"},
		{domain.ErrDuplicateInvitation, http.StatusConflict, "conflict"},
		{domain.ErrInvitationExpired, http.StatusGone, "expired"},
		{domain.ErrValidation, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidStatus, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrSurveyClosed, http.StatusUnprocessableEntity, "survey_closed"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{errors.New("bilinmeyen"), http.StatusInternalServerError, "internal_error"},
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
			t.Errorf("%v: code want %s, got %s", c.err, c.wantError, env.Error)
		}
	}
}

func TestWriteDomainError_ValidationFieldsPropagate(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"title": "required"})
	w := httptest.NewRecorder()
	handler.WriteDomainError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status: %d", w.Code)
	}
	var env handler.ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["title"] != "required" {
		t.Errorf("fields propagation failed: %+v", env.Fields)
	}
}

func TestWriteDomainError_NilIsNoop(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteDomainError(w, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil err must be no-op")
	}
}

func TestWriteServerError_Internal(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteServerError(w, errors.New("boom"))
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status: %d", w.Code)
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	type S struct{ A string `json:"a"` }
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","b":"y"}`))
	var s S
	if err := handler.DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must be rejected")
	}
}

func TestParseIntQuery_NegativeAndEmpty(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=-5&e=", nil)
	if got := handler.ParseIntQuery(r, "n", 7); got != 7 {
		t.Errorf("negative → fallback; got %d", got)
	}
	if got := handler.ParseIntQuery(r, "e", 3); got != 3 {
		t.Errorf("empty → fallback; got %d", got)
	}
}

func TestParseUUIDQuery_InvalidReturnsNil(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?id=junk", nil)
	if handler.ParseUUIDQuery(r, "id") != nil {
		t.Errorf("invalid uuid must be nil")
	}
}
