package handler

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/upcore/leave/internal/calculator"
	"github.com/upcore/leave/internal/service"
)

func TestHolidaysHandler(t *testing.T) {
	cal := service.NewCalendarService(nil)
	h := NewCalendarHandler(cal, Dependencies{Validator: NewValidator()})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/leaves/holidays?year=2026", nil)
	h.Holidays(rr, req)

	assert.Equal(t, 200, rr.Code)
	var body struct {
		Year  int                  `json:"year"`
		Items []calculator.Holiday `json:"items"`
	}
	err := json.NewDecoder(rr.Body).Decode(&body)
	assert.NoError(t, err)
	assert.Equal(t, 2026, body.Year)
	assert.GreaterOrEqual(t, len(body.Items), 7)
}

func TestHolidaysHandler_DefaultsToCurrentYear(t *testing.T) {
	cal := service.NewCalendarService(nil)
	h := NewCalendarHandler(cal, Dependencies{Validator: NewValidator()})

	rr := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/leaves/holidays", nil)
	h.Holidays(rr, req)

	assert.Equal(t, 200, rr.Code)
	var body struct {
		Year int `json:"year"`
	}
	err := json.NewDecoder(rr.Body).Decode(&body)
	assert.NoError(t, err)
	assert.Equal(t, time.Now().UTC().Year(), body.Year)
}
