package video

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newDailyStub(t *testing.T, h http.HandlerFunc) *Daily {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return &Daily{APIKey: "tkn", BaseURL: srv.URL, client: srv.Client()}
}

func TestDaily_Name(t *testing.T) {
	if (&Daily{}).Name() != "daily" {
		t.Errorf("Name() must be daily")
	}
}

func TestDaily_CreateRoom_Defaults_AndRecording(t *testing.T) {
	var capturedAuth, capturedPath string
	var body map[string]any

	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		capturedPath = r.URL.Path
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"int-123","url":"https://upcore.daily.co/int-123"}`))
	})

	start := time.Now()
	end := start.Add(90 * time.Minute)
	info, err := d.CreateRoom(context.Background(), RoomRequest{
		Name:            "int-123",
		StartTime:       start,
		EndTime:         end,
		EnableRecording: true,
	})
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	if info.URL != "https://upcore.daily.co/int-123" || info.Provider != "daily" {
		t.Fatalf("unexpected RoomInfo %+v", info)
	}
	if !info.ExpiresAt.Equal(end) {
		t.Errorf("expiry should propagate from EndTime")
	}
	if capturedPath != "/rooms" {
		t.Fatalf("want /rooms path, got %s", capturedPath)
	}
	if capturedAuth != "Bearer tkn" {
		t.Fatalf("want Bearer auth, got %s", capturedAuth)
	}
	props, _ := body["properties"].(map[string]any)
	if props["enable_recording"] != "cloud" {
		t.Errorf("recording should be 'cloud', got %v", props["enable_recording"])
	}
	if int(props["max_participants"].(float64)) != 10 {
		t.Errorf("max_participants default 10, got %v", props["max_participants"])
	}
}

func TestDaily_CreateRoom_RecordingDisabled_OmitsField(t *testing.T) {
	var body map[string]any
	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &body)
		_, _ = w.Write([]byte(`{"name":"x","url":"https://x"}`))
	})
	_, err := d.CreateRoom(context.Background(), RoomRequest{
		Name: "x", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour),
	})
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	props, _ := body["properties"].(map[string]any)
	if _, ok := props["enable_recording"]; ok {
		t.Errorf("enable_recording must be omitted when EnableRecording=false")
	}
}

func TestDaily_CreateRoom_NotConfigured(t *testing.T) {
	d := &Daily{}
	_, err := d.CreateRoom(context.Background(), RoomRequest{Name: "x"})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Errorf("want configuration error, got %v", err)
	}
}

func TestDaily_CreateRoom_UpstreamError(t *testing.T) {
	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"name already taken"}`))
	})
	_, err := d.CreateRoom(context.Background(), RoomRequest{
		Name: "x", StartTime: time.Now(), EndTime: time.Now().Add(time.Hour),
	})
	if err == nil || !strings.Contains(err.Error(), "400") {
		t.Errorf("want 400 error, got %v", err)
	}
}

func TestDaily_DeleteRoom_Success(t *testing.T) {
	var capturedMethod, capturedPath string
	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		capturedMethod = r.Method
		capturedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	})
	if err := d.DeleteRoom(context.Background(), "int-123"); err != nil {
		t.Fatalf("DeleteRoom: %v", err)
	}
	if capturedMethod != http.MethodDelete {
		t.Errorf("want DELETE, got %s", capturedMethod)
	}
	if capturedPath != "/rooms/int-123" {
		t.Errorf("path mismatch: %s", capturedPath)
	}
}

func TestDaily_DeleteRoom_404IsNotError(t *testing.T) {
	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	// Idempotent delete: 404 treated as success (already gone).
	if err := d.DeleteRoom(context.Background(), "gone"); err != nil {
		t.Errorf("404 delete should be ignored, got %v", err)
	}
}

func TestDaily_DeleteRoom_ServerError(t *testing.T) {
	d := newDailyStub(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})
	if err := d.DeleteRoom(context.Background(), "x"); err == nil {
		t.Errorf("500 must propagate")
	}
}

func TestDaily_DeleteRoom_NotConfigured(t *testing.T) {
	d := &Daily{}
	if err := d.DeleteRoom(context.Background(), "x"); err == nil {
		t.Errorf("empty key must error")
	}
}
