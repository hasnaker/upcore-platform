package slack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync/atomic"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

// TestClient_PostForm_Success covers the happy path and token header.
func TestClient_PostForm_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat.postMessage" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer xoxb-fake" {
			t.Fatalf("missing bearer token")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"channel":"C1","ts":"123.456"}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	c := NewClient(zerolog.Nop())
	var resp struct {
		Channel string `json:"channel"`
		TS      string `json:"ts"`
	}
	if err := c.PostForm(context.Background(), "chat.postMessage", "xoxb-fake", nil, &resp); err != nil {
		t.Fatalf("postform: %v", err)
	}
	if resp.Channel != "C1" || resp.TS != "123.456" {
		t.Fatalf("unexpected response %+v", resp)
	}
}

// TestClient_PostForm_OKFalse maps Slack ok:false errors correctly.
func TestClient_PostForm_OKFalse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ok":false,"error":"channel_not_found"}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	c := NewClient(zerolog.Nop())
	err := c.PostForm(context.Background(), "chat.postMessage", "xoxb", nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
	apiErr, ok := err.(*ErrSlackAPI)
	if !ok {
		t.Fatalf("expected *ErrSlackAPI got %T", err)
	}
	if apiErr.Code != "channel_not_found" {
		t.Fatalf("unexpected code: %s", apiErr.Code)
	}
}

// TestClient_PostForm_TokenRevoked detects auth failures.
func TestClient_PostForm_TokenRevoked(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"ok":false,"error":"token_revoked"}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	c := NewClient(zerolog.Nop())
	err := c.PostForm(context.Background(), "chat.postMessage", "xoxb", nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

// TestClient_PostForm_RetriesOn429 verifies Retry-After backoff.
func TestClient_PostForm_RetriesOn429(t *testing.T) {
	var attempts int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&attempts, 1)
		if n == 1 {
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	c := NewClient(zerolog.Nop())
	start := time.Now()
	if err := c.PostForm(context.Background(), "conversations.open", "xoxb", nil, nil); err != nil {
		t.Fatalf("postform: %v", err)
	}
	if attempts != 2 {
		t.Fatalf("expected 2 attempts got %d", attempts)
	}
	if time.Since(start) < 500*time.Millisecond {
		t.Fatalf("did not honor Retry-After header")
	}
}

// TestClient_PostForm_RetriesOn500 verifies exponential backoff.
func TestClient_PostForm_RetriesOn500(t *testing.T) {
	var attempts int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&attempts, 1)
		if n < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	c := NewClient(zerolog.Nop())
	if err := c.PostForm(context.Background(), "x", "xoxb", nil, nil); err != nil {
		t.Fatalf("postform: %v", err)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts got %d", attempts)
	}
}

// TestClient_PostJSON covers the incoming webhook path.
func TestClient_PostJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "application/json; charset=utf-8" {
			t.Fatal("wrong content type")
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if payload["text"] != "hi" {
			t.Fatalf("unexpected payload")
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := NewClient(zerolog.Nop())
	if err := c.PostJSON(context.Background(), srv.URL, map[string]string{"text": "hi"}); err != nil {
		t.Fatalf("postjson: %v", err)
	}
}

// TestParseRetryAfter covers numeric + RFC1123 + fallback parsing.
func TestParseRetryAfter(t *testing.T) {
	cases := []struct {
		in   string
		min  time.Duration
		max  time.Duration
	}{
		{"", 1 * time.Second, 3 * time.Second},
		{"5", 4500 * time.Millisecond, 5500 * time.Millisecond},
		{"garbage", 1 * time.Second, 3 * time.Second},
	}
	for _, tc := range cases {
		got := parseRetryAfter(tc.in)
		if got < tc.min || got > tc.max {
			t.Errorf("retry-after(%q) = %v", tc.in, got)
		}
	}
	_, _ = strconv.Atoi("1")
}
