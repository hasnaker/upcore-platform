package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/upcore/performance/internal/domain"
)

func TestWriteJSON_StatusAndNil(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, http.StatusOK, map[string]int{"a": 1})
	if w.Code != http.StatusOK {
		t.Errorf("status: %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"a":1`) {
		t.Errorf("body: %s", w.Body.String())
	}
	w2 := httptest.NewRecorder()
	WriteJSON(w2, http.StatusNoContent, nil)
	if w2.Body.Len() != 0 {
		t.Errorf("nil skip")
	}
}

func TestParseUUID_ValidAndInvalid(t *testing.T) {
	id := uuid.New()
	w := httptest.NewRecorder()
	got, ok := ParseUUID(w, id.String())
	if !ok || got != id {
		t.Errorf("valid parse")
	}
	w2 := httptest.NewRecorder()
	_, ok2 := ParseUUID(w2, "nope")
	if ok2 {
		t.Errorf("invalid should fail")
	}
	if w2.Code != http.StatusBadRequest {
		t.Errorf("status: %d", w2.Code)
	}
}

func TestParseUUIDQuery_Variants(t *testing.T) {
	valid := uuid.New()
	r := httptest.NewRequest(http.MethodGet, "/?id="+valid.String(), nil)
	if got := ParseUUIDQuery(r, "id"); got != valid {
		t.Errorf("valid expected")
	}
	r2 := httptest.NewRequest(http.MethodGet, "/?id=bad", nil)
	if got := ParseUUIDQuery(r2, "id"); got != uuid.Nil {
		t.Errorf("bad uuid → nil")
	}
	r3 := httptest.NewRequest(http.MethodGet, "/", nil)
	if got := ParseUUIDQuery(r3, "id"); got != uuid.Nil {
		t.Errorf("missing → nil")
	}
}

func TestParseIntQuery_Branches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=2&bad=abc&neg=-5&e=", nil)
	if ParseIntQuery(r, "n", 0) != 2 {
		t.Errorf("parse")
	}
	if ParseIntQuery(r, "bad", 7) != 7 {
		t.Errorf("non-int fallback")
	}
	if ParseIntQuery(r, "neg", 3) != 3 {
		t.Errorf("negative fallback")
	}
	if ParseIntQuery(r, "e", 9) != 9 {
		t.Errorf("empty fallback")
	}
	if ParseIntQuery(r, "m", 1) != 1 {
		t.Errorf("missing fallback")
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","b":"y"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
}

func TestWriteError_Mappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrConflict, http.StatusConflict, "conflict"},
		{domain.ErrInvalidStatus, http.StatusUnprocessableEntity, "invalid_status"},
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

func TestWriteError_ValidationFields(t *testing.T) {
	err := domain.NewValidationError(map[string]string{"weight": "must be 1..5"})
	w := httptest.NewRecorder()
	WriteError(w, err)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: %d", w.Code)
	}
	var env ErrorResponse
	_ = json.Unmarshal(w.Body.Bytes(), &env)
	if env.Fields["weight"] == "" {
		t.Errorf("fields: %+v", env.Fields)
	}
}
