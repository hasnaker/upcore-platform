package handler_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/handler"
)

func TestWriteJSON_NilSkips(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusNoContent, nil)
	if w.Body.Len() != 0 {
		t.Errorf("nil skip expected")
	}
}

func TestWriteJSON_Payload(t *testing.T) {
	w := httptest.NewRecorder()
	handler.WriteJSON(w, http.StatusOK, map[string]int{"n": 1})
	if w.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Errorf("content-type")
	}
	if !strings.Contains(w.Body.String(), `"n":1`) {
		t.Errorf("body: %s", w.Body.String())
	}
}

func TestParseUUID_InvalidWrites400(t *testing.T) {
	w := httptest.NewRecorder()
	_, ok := handler.ParseUUID(w, "not-a-uuid")
	if ok {
		t.Errorf("invalid must fail")
	}
	if w.Code != http.StatusBadRequest {
		t.Errorf("status: %d", w.Code)
	}
}

func TestParseUUID_ValidRoundtrip(t *testing.T) {
	id := uuid.New()
	w := httptest.NewRecorder()
	got, ok := handler.ParseUUID(w, id.String())
	if !ok || got != id {
		t.Errorf("valid parse failed")
	}
}

func TestDecodeJSON_UnknownField(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"a":"x","extra":"e"}`))
	type S struct{ A string `json:"a"` }
	var s S
	if err := handler.DecodeJSON(r, &s); err == nil {
		t.Errorf("unknown field must fail")
	}
}

func TestParseIntQuery_Branches(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/?n=3&bad=abc&neg=-1", nil)
	if handler.ParseIntQuery(r, "n", 0) != 3 {
		t.Errorf("parse")
	}
	if handler.ParseIntQuery(r, "bad", 5) != 5 {
		t.Errorf("fallback non-int")
	}
	if handler.ParseIntQuery(r, "neg", 2) != 2 {
		t.Errorf("fallback negative")
	}
	if handler.ParseIntQuery(r, "miss", 9) != 9 {
		t.Errorf("fallback missing")
	}
}

func TestWriteError_Mappings(t *testing.T) {
	cases := []struct {
		err       error
		wantCode  int
		wantError string
	}{
		{domain.ErrEventNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrDSRNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrExportNotFound, http.StatusNotFound, "not_found"},
		{domain.ErrInvalidInput, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidLegalBasis, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidDSRType, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrInvalidTransition, http.StatusUnprocessableEntity, "validation_error"},
		{domain.ErrImmutable, http.StatusConflict, "immutable"},
		{domain.ErrDSRAlreadyCompleted, http.StatusConflict, "already_completed"},
		{domain.ErrMissingTenantID, http.StatusBadRequest, "missing_tenant"},
		{domain.ErrUnauthorized, http.StatusUnauthorized, "unauthorized"},
		{domain.ErrForbidden, http.StatusForbidden, "forbidden"},
		{domain.ErrBackpressure, http.StatusServiceUnavailable, "backpressure"},
		{errors.New("beklenmeyen"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		w := httptest.NewRecorder()
		handler.WriteError(w, c.err)
		if w.Code != c.wantCode {
			t.Errorf("%v: want %d, got %d", c.err, c.wantCode, w.Code)
		}
		var env handler.ErrorResponse
		_ = json.Unmarshal(w.Body.Bytes(), &env)
		if env.Error != c.wantError {
			t.Errorf("%v: error want %s, got %s", c.err, c.wantError, env.Error)
		}
	}
}
