package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
)

func TestWriteJSON_NilSkips(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil must skip encoding")
	}
}

func TestWriteJSON_Payload(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusOK, map[string]string{"k": "v"})
	if !strings.Contains(w.Body.String(), `"k":"v"`) {
		t.Errorf("body: %s", w.Body.String())
	}
	if w.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Errorf("content-type")
	}
}

func TestParseUUID_Variants(t *testing.T) {
	id := uuid.New()
	w := httptest.NewRecorder()
	got, ok := ParseUUID(w, id.String())
	if !ok || got != id {
		t.Errorf("valid parse")
	}
	w2 := httptest.NewRecorder()
	_, ok2 := ParseUUID(w2, "bad")
	if ok2 {
		t.Errorf("invalid must fail")
	}
	if w2.Code != http.StatusBadRequest {
		t.Errorf("status: %d", w2.Code)
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","extra":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
}

func TestParseIntQuery_Branches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=5&bad=abc&neg=-1", nil)
	if ParseIntQuery(r, "n", 0) != 5 {
		t.Errorf("parse")
	}
	if ParseIntQuery(r, "bad", 3) != 3 {
		t.Errorf("fallback")
	}
	if ParseIntQuery(r, "neg", 2) != 2 {
		t.Errorf("neg fallback")
	}
	if ParseIntQuery(r, "m", 9) != 9 {
		t.Errorf("missing fallback")
	}
}

func TestWriteError_DomainMappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{domain.ErrPeriodLocked, http.StatusConflict, "period_locked"},
		{domain.ErrInvalidStatus, http.StatusUnprocessableEntity, "invalid_status"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
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
	err := domain.NewValidationError(map[string]string{"period_year": "out_of_range"})
	w := httptest.NewRecorder()
	WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["period_year"] == "" {
		t.Errorf("fields: %+v", env.Fields)
	}
}
