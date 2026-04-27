package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// TestParseDate_Variants locks down the date parser used across cycle + pip services.
func TestParseDate_Variants(t *testing.T) {
	cases := []struct {
		in      string
		wantErr bool
	}{
		{"2026-04-24", false},
		{"2026-04-24T10:00:00Z", false},
		{"  2026-04-24  ", false},
		{"", true},
		{"not-a-date", true},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.in, func(t *testing.T) {
			_, err := parseDate(tc.in)
			if (err != nil) != tc.wantErr {
				t.Fatalf("parseDate(%q) err=%v wantErr=%v", tc.in, err, tc.wantErr)
			}
		})
	}
}

// TestParseOptionalDate_PreservesEmpty ensures empty-string returns nil-pointer, no error.
func TestParseOptionalDate_PreservesEmpty(t *testing.T) {
	ptr, err := parseOptionalDate("")
	if err != nil || ptr != nil {
		t.Fatalf("expected nil/nil, got %v/%v", ptr, err)
	}
	ptr, err = parseOptionalDate("2026-04-24")
	if err != nil || ptr == nil {
		t.Fatalf("expected non-nil, got %v/%v", ptr, err)
	}
	if !ptr.Equal(time.Date(2026, 4, 24, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected time: %v", ptr)
	}
}

// TestJSONMarshalIndirection verifies the jsonMarshal var is overrideable for error injection in tests.
func TestJSONMarshalIndirection(t *testing.T) {
	orig := jsonMarshal
	t.Cleanup(func() { jsonMarshal = orig })
	called := false
	jsonMarshal = func(v interface{}) ([]byte, error) { called = true; return []byte(`"stub"`), nil }
	b, err := jsonMarshal(map[string]int{"a": 1})
	if err != nil || string(b) != `"stub"` || !called {
		t.Fatalf("indirection broken: b=%s err=%v called=%v", b, err, called)
	}
}

// TestCycleServiceCreate_ValidationErrors covers the negative paths in CycleService.Create.
func TestCycleServiceCreate_ValidationErrors(t *testing.T) {
	// We construct the service with a nil repo; validation errors must fire before touching it.
	svc := NewCycleService(nil, zerolog.Nop())
	tenant := uuid.New()
	actor := uuid.New()

	cases := []struct {
		name string
		req  CycleRequest
	}{
		{"empty start", CycleRequest{PeriodStart: "", PeriodEnd: "2026-04-01"}},
		{"bad start", CycleRequest{PeriodStart: "not-a-date", PeriodEnd: "2026-04-01"}},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.Create(context.Background(), tenant, actor, tc.req)
			if err == nil {
				t.Fatal("expected validation error, got nil")
			}
		})
	}
}
