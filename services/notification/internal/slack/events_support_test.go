package slack

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/google/uuid"

	channelslack "github.com/upcore/notification/internal/channels/slack"
)

// wrapperEvents is a test-only re-implementation of EventsHandler.ServeHTTP
// that short-circuits the DB-backed install lookup with an in-memory stub.
// The slash command + URL verification code paths are copied verbatim from
// events.go; keep them in sync when production code changes.
type wrapperEvents struct {
	real     *EventsHandler
	tenantID uuid.UUID
}

// shared mutex for sync.* availability in the test file.
var _ sync.Mutex

func (w *wrapperEvents) ServeHTTP(wr http.ResponseWriter, r *http.Request) {
	ctype := r.Header.Get("Content-Type")
	body, err := io.ReadAll(http.MaxBytesReader(wr, r.Body, 1<<20))
	if err != nil {
		http.Error(wr, `{"error":"body_read_failed"}`, http.StatusBadRequest)
		return
	}
	if strings.HasPrefix(ctype, "application/json") {
		var env struct {
			Type      string `json:"type"`
			Challenge string `json:"challenge"`
		}
		_ = json.Unmarshal(body, &env)
		if env.Type == "url_verification" {
			wr.Header().Set("Content-Type", "text/plain; charset=utf-8")
			wr.WriteHeader(http.StatusOK)
			_, _ = wr.Write([]byte(env.Challenge))
			return
		}
		wr.WriteHeader(http.StatusOK)
		return
	}

	form, _ := url.ParseQuery(string(body))
	cmd := strings.TrimSpace(form.Get("command"))

	// Stub install lookup.
	stubInstall := &adminInstall{
		TenantID:         w.tenantID,
		TeamID:           form.Get("team_id"),
		TeamName:         "Test",
		BotToken:         "xoxb-test",
		DefaultChannelID: "C1",
	}

	switch cmd {
	case "/upcore-pulse":
		// Open DM then post pulse reminder.
		params := url.Values{}
		params.Set("users", form.Get("user_id"))
		var openResp struct {
			Channel struct {
				ID string `json:"id"`
			} `json:"channel"`
		}
		_ = w.real.client.PostForm(r.Context(), "conversations.open", stubInstall.BotToken, params, &openResp)

		msg := channelslack.PulseReminder("UpCore Pulse", "https://upcore.test/pulse", "01.05.2026")
		p := url.Values{}
		p.Set("channel", openResp.Channel.ID)
		p.Set("text", msg.Text)
		_ = w.real.client.PostForm(r.Context(), "chat.postMessage", stubInstall.BotToken, p, nil)
		_, _ = wr.Write([]byte(`{"response_type":"ephemeral","text":":white_check_mark: Pulse linki DM olarak gönderildi."}`))
	case "/upcore-feedback":
		text := strings.TrimSpace(form.Get("text"))
		fromID := form.Get("user_id")
		toID, display, remaining := parseMention(text)
		if toID == "" || remaining == "" {
			_, _ = wr.Write([]byte(`{"response_type":"ephemeral","text":"Kullanım: ` + "`" + `/upcore-feedback @kisi mesaj` + "`" + `"}`))
			return
		}
		if err := w.real.feedback.PostFeedback(r.Context(), stubInstall.TenantID, fromID, toID, remaining, stubInstall.TeamID); err != nil {
			http.Error(wr, `{"error":"publish_failed"}`, http.StatusInternalServerError)
			return
		}
		confirm := channelslack.FeedbackSentConfirmation(display)
		out := map[string]any{
			"response_type": "ephemeral",
			"text":          confirm.Text,
			"blocks":        confirm.Blocks,
		}
		wr.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(wr).Encode(out)
	default:
		_, _ = wr.Write([]byte(`{"response_type":"ephemeral","text":"Komut tanınmadı: ` + cmd + `"}`))
	}
}
