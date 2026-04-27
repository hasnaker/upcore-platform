// Package video provides video interview room providers (Daily.co primary,
// Zoom/Teams future). Kick-off happens when interview.scheduled event is
// consumed; video_room_url persisted on interviews row (migration 039).
package video

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Provider abstracts room creation + deletion.
type Provider interface {
	Name() string
	CreateRoom(ctx context.Context, req RoomRequest) (*RoomInfo, error)
	DeleteRoom(ctx context.Context, roomName string) error
}

// RoomRequest is the cross-provider room spec.
type RoomRequest struct {
	Name       string    // unique room ID, e.g. "interview-<uuid>"
	StartTime  time.Time // earliest allowed join
	EndTime    time.Time // auto-close
	MaxParticipants int  // default 10
	EnableRecording bool
}

// RoomInfo is the result: join URL + recording URL (when recording enabled).
type RoomInfo struct {
	URL          string
	Name         string
	Provider     string
	RecordingURL string
	ExpiresAt    time.Time
}

// Daily implements Provider via Daily.co REST API.
// Docs: https://docs.daily.co/reference/rest-api
type Daily struct {
	APIKey  string
	BaseURL string
	client  *http.Client
}

// NewDaily reads DAILY_API_KEY.
func NewDaily() *Daily {
	return &Daily{
		APIKey:  os.Getenv("DAILY_API_KEY"),
		BaseURL: "https://api.daily.co/v1",
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// Name returns provider code.
func (*Daily) Name() string { return "daily" }

// CreateRoom creates a Daily room with the given parameters.
func (d *Daily) CreateRoom(ctx context.Context, req RoomRequest) (*RoomInfo, error) {
	if d.APIKey == "" {
		return nil, fmt.Errorf("daily not configured (DAILY_API_KEY)")
	}
	if req.MaxParticipants <= 0 {
		req.MaxParticipants = 10
	}
	body := map[string]any{
		"name": req.Name,
		"properties": map[string]any{
			"nbf":                req.StartTime.Unix(),
			"exp":                req.EndTime.Unix(),
			"max_participants":   req.MaxParticipants,
			"enable_chat":        true,
			"enable_screenshare": true,
			"enable_recording":   "cloud", // Daily Pro plan gerekli
			"eject_at_room_exp":  true,
		},
	}
	if !req.EnableRecording {
		delete(body["properties"].(map[string]any), "enable_recording")
	}
	payload, _ := json.Marshal(body)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, d.BaseURL+"/rooms", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", "Bearer "+d.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("daily http: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("daily create room %d: %s", resp.StatusCode, string(raw))
	}

	var out struct {
		Name string `json:"name"`
		URL  string `json:"url"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return &RoomInfo{
		URL:       out.URL,
		Name:      out.Name,
		Provider:  "daily",
		ExpiresAt: req.EndTime,
	}, nil
}

// DeleteRoom removes a room (called after interview completes).
func (d *Daily) DeleteRoom(ctx context.Context, roomName string) error {
	if d.APIKey == "" {
		return fmt.Errorf("daily not configured")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, d.BaseURL+"/rooms/"+roomName, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+d.APIKey)
	resp, err := d.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 && resp.StatusCode != 404 {
		return fmt.Errorf("daily delete %d", resp.StatusCode)
	}
	return nil
}
