// Package chaos validates idempotency keys (UUID v7) under duplicate delivery.
// These tests are opt-in (build tag `chaos`) and require a running stack with
// toxiproxy reachable as defined in docker-compose.chaos.yml.
//go:build chaos

package chaos

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestIdempotency_DuplicatePostIsDeduped(t *testing.T) {
	base := os.Getenv("CHAOS_API_BASE")
	token := os.Getenv("CHAOS_TOKEN")
	tenant := os.Getenv("CHAOS_TENANT")
	if base == "" || token == "" {
		t.Skip("CHAOS_API_BASE / CHAOS_TOKEN not set")
	}

	key := uuid.Must(uuid.NewV7()).String()
	body := map[string]any{
		"survey_id": "00000000-0000-0000-0000-000000000001",
		"answers": []map[string]any{
			{"question_id": "q1", "numeric_value": 3},
		},
	}
	raw, _ := json.Marshal(body)

	post := func() (*http.Response, string) {
		req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/api/v1/surveys/responses", base), bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("X-Tenant-ID", tenant)
		req.Header.Set("Idempotency-Key", key)
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("post error: %v", err)
		}
		defer resp.Body.Close()
		b, _ := io.ReadAll(resp.Body)
		return resp, string(b)
	}

	r1, body1 := post()
	if r1.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", r1.StatusCode, body1)
	}
	r2, body2 := post()
	if r2.StatusCode != http.StatusOK && r2.StatusCode != http.StatusCreated {
		t.Fatalf("expected 200/201 (dedup), got %d", r2.StatusCode)
	}
	if body1 != body2 {
		t.Fatalf("expected identical response body on idempotent replay.\nfirst=%s\nsecond=%s", body1, body2)
	}
}
