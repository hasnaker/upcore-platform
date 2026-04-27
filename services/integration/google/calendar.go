package google

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// CalendarEvent is the minimal event envelope we push to Google Calendar.
type CalendarEvent struct {
	Summary     string       `json:"summary"`
	Description string       `json:"description,omitempty"`
	Location    string       `json:"location,omitempty"`
	Start       EventTime    `json:"start"`
	End         EventTime    `json:"end"`
	Attendees   []Attendee   `json:"attendees,omitempty"`
	Reminders   *Reminders   `json:"reminders,omitempty"`
	ConferenceData *ConferenceData `json:"conferenceData,omitempty"`
	ExtendedProperties *ExtendedProps `json:"extendedProperties,omitempty"`
}

// EventTime wraps RFC3339 + timezone.
type EventTime struct {
	DateTime time.Time `json:"dateTime"`
	TimeZone string    `json:"timeZone"`
}

// Attendee is an invitee.
type Attendee struct {
	Email    string `json:"email"`
	Optional bool   `json:"optional,omitempty"`
}

// Reminders disables default reminders and adds popup 15 min before.
type Reminders struct {
	UseDefault bool          `json:"useDefault"`
	Overrides  []ReminderOpt `json:"overrides,omitempty"`
}

// ReminderOpt is one override entry.
type ReminderOpt struct {
	Method  string `json:"method"`  // "popup" or "email"
	Minutes int    `json:"minutes"`
}

// ConferenceData enables a Meet link on the event.
type ConferenceData struct {
	CreateRequest *CreateRequest `json:"createRequest,omitempty"`
}

// CreateRequest asks Google to create a Meet link.
type CreateRequest struct {
	RequestID             string                `json:"requestId"`
	ConferenceSolutionKey ConferenceSolutionKey `json:"conferenceSolutionKey"`
}

// ConferenceSolutionKey picks the conferencing provider.
type ConferenceSolutionKey struct {
	Type string `json:"type"`
}

// ExtendedProps carries private metadata (e.g. intervention id).
type ExtendedProps struct {
	Private map[string]string `json:"private,omitempty"`
}

// CreateEvent inserts an event on the user's primary calendar.
// conferenceDataVersion=1 is required when requesting a Meet link.
func CreateEvent(ctx context.Context, hc *http.Client, accessToken, calendarID string, ev *CalendarEvent, addMeet bool) (string, error) {
	if calendarID == "" {
		calendarID = "primary"
	}
	endpoint := fmt.Sprintf("https://www.googleapis.com/calendar/v3/calendars/%s/events", calendarID)
	if addMeet {
		endpoint += "?conferenceDataVersion=1"
		if ev.ConferenceData == nil {
			ev.ConferenceData = &ConferenceData{
				CreateRequest: &CreateRequest{
					RequestID:             fmt.Sprintf("upcore-%d", time.Now().UnixNano()),
					ConferenceSolutionKey: ConferenceSolutionKey{Type: "hangoutsMeet"},
				},
			}
		}
	}
	body, err := json.Marshal(ev)
	if err != nil {
		return "", err
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	resp, err := hc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("google calendar create %d: %s", resp.StatusCode, string(raw))
	}
	var out struct {
		ID      string `json:"id"`
		HTMLLink string `json:"htmlLink"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

// BuildInterventionCheckIn crafts a calendar event for a 4/8/12-week
// intervention check-in. startAt is caller's chosen slot.
func BuildInterventionCheckIn(interventionID, title, ownerEmail string, startAt time.Time, durationMins int) *CalendarEvent {
	return &CalendarEvent{
		Summary:     "UpCore · " + title + " check-in",
		Description: "UpCore müdahale izleme oturumu. Katılımınız tamamen gönüllüdür.",
		Start:       EventTime{DateTime: startAt, TimeZone: "Europe/Istanbul"},
		End:         EventTime{DateTime: startAt.Add(time.Duration(durationMins) * time.Minute), TimeZone: "Europe/Istanbul"},
		Attendees:   []Attendee{{Email: ownerEmail}},
		Reminders: &Reminders{
			UseDefault: false,
			Overrides: []ReminderOpt{
				{Method: "popup", Minutes: 15},
				{Method: "email", Minutes: 60},
			},
		},
		ExtendedProperties: &ExtendedProps{
			Private: map[string]string{
				"upcore_intervention_id": interventionID,
			},
		},
	}
}
