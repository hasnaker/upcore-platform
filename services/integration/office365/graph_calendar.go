package office365

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Event is the MS Graph Event shape (subset).
type Event struct {
	Subject      string     `json:"subject"`
	Body         *ItemBody  `json:"body,omitempty"`
	Start        DateTimeTZ `json:"start"`
	End          DateTimeTZ `json:"end"`
	Location     *Location  `json:"location,omitempty"`
	Attendees    []Attendee `json:"attendees,omitempty"`
	IsOnlineMeeting bool      `json:"isOnlineMeeting,omitempty"`
	OnlineMeetingProvider string `json:"onlineMeetingProvider,omitempty"` // "teamsForBusiness"
	SingleValueExtendedProperties []ExtProp `json:"singleValueExtendedProperties,omitempty"`
}

// ItemBody is the description body.
type ItemBody struct {
	ContentType string `json:"contentType"` // "text" or "html"
	Content     string `json:"content"`
}

// DateTimeTZ is how Graph represents a timezone-aware moment.
type DateTimeTZ struct {
	DateTime string `json:"dateTime"` // RFC3339 without zone
	TimeZone string `json:"timeZone"`
}

// Location describes where the meeting happens.
type Location struct {
	DisplayName string `json:"displayName"`
}

// Attendee is an invitee.
type Attendee struct {
	EmailAddress EmailAddress `json:"emailAddress"`
	Type         string       `json:"type"` // "required", "optional"
}

// EmailAddress is the tuple {address,name}.
type EmailAddress struct {
	Address string `json:"address"`
	Name    string `json:"name,omitempty"`
}

// ExtProp is a single-value extended property used to stash upcore metadata.
type ExtProp struct {
	ID    string `json:"id"`
	Value string `json:"value"`
}

// CreateEvent posts an event to /me/events (delegated) or
// /users/{userID}/events (application). userID empty → /me/events.
func CreateEvent(ctx context.Context, hc *http.Client, accessToken, userID string, ev *Event) (string, error) {
	path := "/me/events"
	if userID != "" {
		path = "/users/" + userID + "/events"
	}
	endpoint := "https://graph.microsoft.com/v1.0" + path
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
		return "", fmt.Errorf("graph events %d: %s", resp.StatusCode, string(raw))
	}
	var out struct {
		ID             string `json:"id"`
		WebLink        string `json:"webLink"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

// BuildInterventionCheckIn returns an MS Graph Event equivalent to the
// Google CalendarEvent with the same semantics.
func BuildInterventionCheckIn(interventionID, title, ownerEmail string, startAt time.Time, durationMins int) *Event {
	return &Event{
		Subject: "UpCore · " + title + " check-in",
		Body: &ItemBody{
			ContentType: "text",
			Content:     "UpCore müdahale izleme oturumu. Katılımınız tamamen gönüllüdür.",
		},
		Start: DateTimeTZ{DateTime: startAt.Format("2006-01-02T15:04:05"), TimeZone: "Turkey Standard Time"},
		End:   DateTimeTZ{DateTime: startAt.Add(time.Duration(durationMins) * time.Minute).Format("2006-01-02T15:04:05"), TimeZone: "Turkey Standard Time"},
		Attendees: []Attendee{
			{EmailAddress: EmailAddress{Address: ownerEmail}, Type: "required"},
		},
		IsOnlineMeeting:       true,
		OnlineMeetingProvider: "teamsForBusiness",
		SingleValueExtendedProperties: []ExtProp{
			{
				ID:    "String {00020329-0000-0000-C000-000000000046} Name UpCoreInterventionId",
				Value: interventionID,
			},
		},
	}
}

// DomainIsMicrosoft quickly probes the email domain to decide Graph vs Google.
func DomainIsMicrosoft(email string) bool {
	email = strings.ToLower(email)
	return strings.HasSuffix(email, "@outlook.com") ||
		strings.HasSuffix(email, "@hotmail.com") ||
		strings.HasSuffix(email, "@live.com") ||
		strings.Contains(email, ".onmicrosoft.com")
}
