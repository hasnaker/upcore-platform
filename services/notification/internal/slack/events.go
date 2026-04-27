package slack

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"

	channelslack "github.com/upcore/notification/internal/channels/slack"
)

// FeedbackPoster publishes feedback events to the continuous-feedback service.
// We publish to app.event_outbox; the performance service consumes.
type FeedbackPoster interface {
	PostFeedback(ctx context.Context, tenantID uuid.UUID, fromSlackUserID, toSlackUserID, message, teamID string) error
}

// EventsHandler processes Slack slash commands + Events API URL verification.
// Slash commands are always form-encoded and mount to POST /events (Slack
// calls the same URL for interactions and events; we multiplex on content
// type + payload).
type EventsHandler struct {
	repo          *Repository
	client        *channelslack.Client
	feedback      FeedbackPoster
	db            *sqlx.DB
	publicBaseURL string
	log           zerolog.Logger
}

// NewEventsHandler builds the events/slash command handler.
func NewEventsHandler(
	repo *Repository,
	client *channelslack.Client,
	feedback FeedbackPoster,
	db *sqlx.DB,
	publicBaseURL string,
	log zerolog.Logger,
) *EventsHandler {
	return &EventsHandler{
		repo:          repo,
		client:        client,
		feedback:      feedback,
		db:            db,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
		log:           log,
	}
}

// ServeHTTP handles POST /api/v1/integrations/slack/events.
// The request signature has already been verified by the signature middleware.
func (h *EventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctype := r.Header.Get("Content-Type")
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		http.Error(w, `{"error":"body_read_failed"}`, http.StatusBadRequest)
		return
	}

	// URL verification comes as application/json with type=url_verification.
	if strings.HasPrefix(ctype, "application/json") {
		var env struct {
			Type      string `json:"type"`
			Challenge string `json:"challenge"`
			Event     struct {
				Type string `json:"type"`
			} `json:"event"`
			TeamID string `json:"team_id"`
		}
		if err := json.Unmarshal(body, &env); err != nil {
			http.Error(w, `{"error":"bad_json"}`, http.StatusBadRequest)
			return
		}
		if env.Type == "url_verification" {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(env.Challenge))
			return
		}
		// app_uninstalled / tokens_revoked → auto-revoke
		if env.Type == "event_callback" && (env.Event.Type == "app_uninstalled" || env.Event.Type == "tokens_revoked") {
			if err := h.handleWorkspaceUninstall(r.Context(), env.TeamID); err != nil {
				h.log.Error().Err(err).Str("team", env.TeamID).Msg("event-driven revoke failed")
			}
			w.WriteHeader(http.StatusOK)
			return
		}
		// Unknown event; ack to prevent retries.
		w.WriteHeader(http.StatusOK)
		return
	}

	// Slash commands POST application/x-www-form-urlencoded.
	form, err := url.ParseQuery(string(body))
	if err != nil {
		http.Error(w, `{"error":"bad_form"}`, http.StatusBadRequest)
		return
	}

	cmd := strings.TrimSpace(form.Get("command"))
	switch cmd {
	case "/upcore-pulse":
		h.handlePulseCommand(w, r.Context(), form)
		return
	case "/upcore-feedback":
		h.handleFeedbackCommand(w, r.Context(), form)
		return
	}

	h.respondEphemeral(w, "Komut tanınmadı: "+cmd)
}

// handlePulseCommand opens a DM to the invoker with this week's pulse link.
func (h *EventsHandler) handlePulseCommand(w http.ResponseWriter, ctx context.Context, form url.Values) {
	teamID := form.Get("team_id")
	slackUserID := form.Get("user_id")
	inst, err := h.lookupInstallByTeam(ctx, teamID)
	if err != nil || inst == nil {
		h.respondEphemeral(w, ":warning: Bu workspace için UpCore kurulumu aktif değil.")
		return
	}

	pulseURL := h.publicBaseURL + "/pulse?via=slack&team=" + url.QueryEscape(teamID) + "&sid=" + url.QueryEscape(slackUserID)
	msg := channelslack.PulseReminder("UpCore Pulse", pulseURL, time.Now().UTC().AddDate(0, 0, 7).Format("02.01.2006"))

	// Open an IM channel to the invoking user first (conversations.open).
	imChan, err := h.openIM(ctx, inst.BotToken, slackUserID)
	if err != nil {
		h.log.Warn().Err(err).Msg("conversations.open failed; falling back to ephemeral")
		h.respondEphemeral(w, "Pulse linkine buradan ulaşabilirsin: "+pulseURL)
		return
	}

	params := url.Values{}
	params.Set("channel", imChan)
	params.Set("text", msg.Text)
	if blocks, err := json.Marshal(msg.Blocks); err == nil {
		params.Set("blocks", string(blocks))
	}
	if err := h.client.PostForm(ctx, "chat.postMessage", inst.BotToken, params, nil); err != nil {
		h.log.Error().Err(err).Msg("pulse DM post failed")
		h.respondEphemeral(w, ":warning: Mesaj gönderilemedi.")
		return
	}
	h.respondEphemeral(w, ":white_check_mark: Pulse linki DM olarak gönderildi.")
}

// handleFeedbackCommand parses `/upcore-feedback @user mesaj` and publishes the
// feedback event. Text has the shape "<@U0ABCDEF|name> mesaj..." (Slack expands mentions).
func (h *EventsHandler) handleFeedbackCommand(w http.ResponseWriter, ctx context.Context, form url.Values) {
	teamID := form.Get("team_id")
	fromSlackUserID := form.Get("user_id")
	text := strings.TrimSpace(form.Get("text"))

	inst, err := h.lookupInstallByTeam(ctx, teamID)
	if err != nil || inst == nil {
		h.respondEphemeral(w, ":warning: Bu workspace için UpCore kurulumu aktif değil.")
		return
	}

	if text == "" {
		h.respondEphemeral(w, "Kullanım: `/upcore-feedback @kisi mesaj`")
		return
	}

	toSlackUser, toDisplay, remaining := parseMention(text)
	if toSlackUser == "" || remaining == "" {
		h.respondEphemeral(w, "Kullanım: `/upcore-feedback @kisi mesaj`. Mesaj kısmı boş olamaz.")
		return
	}

	if err := h.feedback.PostFeedback(ctx, inst.TenantID, fromSlackUserID, toSlackUser, remaining, teamID); err != nil {
		h.log.Error().Err(err).Msg("slack feedback publish failed")
		h.respondEphemeral(w, ":warning: Geri bildirim iletilemedi. Teknik ekip bilgilendirildi.")
		return
	}

	confirm := channelslack.FeedbackSentConfirmation(toDisplay)
	resp := map[string]any{
		"response_type": "ephemeral",
		"text":          confirm.Text,
		"blocks":        confirm.Blocks,
	}
	writeJSON(w, http.StatusOK, resp)
}

// handleWorkspaceUninstall is called when Slack notifies us that the app was
// removed from a workspace (app_uninstalled / tokens_revoked). We revoke all
// installs for that team_id across tenants (usually 1).
func (h *EventsHandler) handleWorkspaceUninstall(ctx context.Context, teamID string) error {
	if strings.TrimSpace(teamID) == "" {
		return nil
	}
	_, err := h.db.ExecContext(ctx,
		`UPDATE slack_installations SET revoked_at = NOW(), updated_at = NOW() WHERE team_id = $1 AND revoked_at IS NULL`,
		teamID)
	return err
}

// lookupInstallByTeam loads the installation for a given Slack team_id. This
// path is used for slash commands where we don't yet know the tenant.
func (h *EventsHandler) lookupInstallByTeam(ctx context.Context, teamID string) (*adminInstall, error) {
	const q = `
SELECT tenant_id, team_id, team_name,
       pgp_sym_decrypt(bot_token_encrypted, $2)::text AS bot_token,
       COALESCE(default_channel_id, '')  AS default_channel_id
  FROM slack_installations
 WHERE team_id = $1 AND revoked_at IS NULL
 ORDER BY installed_at DESC
 LIMIT 1`
	var row struct {
		TenantID   uuid.UUID `db:"tenant_id"`
		TeamID     string    `db:"team_id"`
		TeamName   string    `db:"team_name"`
		BotToken   string    `db:"bot_token"`
		DefaultCh  string    `db:"default_channel_id"`
	}
	if err := h.db.GetContext(ctx, &row, q, teamID, h.repo.keyString()); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("lookup install by team: %w", err)
	}
	return &adminInstall{
		TenantID:         row.TenantID,
		TeamID:           row.TeamID,
		TeamName:         row.TeamName,
		BotToken:         row.BotToken,
		DefaultChannelID: row.DefaultCh,
	}, nil
}

type adminInstall struct {
	TenantID         uuid.UUID
	TeamID           string
	TeamName         string
	BotToken         string
	DefaultChannelID string
}

func (h *EventsHandler) openIM(ctx context.Context, botToken, userID string) (string, error) {
	params := url.Values{}
	params.Set("users", userID)
	var resp struct {
		Channel struct {
			ID string `json:"id"`
		} `json:"channel"`
	}
	if err := h.client.PostForm(ctx, "conversations.open", botToken, params, &resp); err != nil {
		return "", err
	}
	return resp.Channel.ID, nil
}

// respondEphemeral writes an ephemeral slash-command reply (text only).
func (h *EventsHandler) respondEphemeral(w http.ResponseWriter, text string) {
	writeJSON(w, http.StatusOK, map[string]any{
		"response_type": "ephemeral",
		"text":          text,
	})
}

// parseMention extracts a single leading user mention "<@Uabc12345|name> ..." from the
// slash command text. Returns the slack user ID, display name (if present)
// and the trailing message body.
func parseMention(text string) (userID, display, remaining string) {
	text = strings.TrimSpace(text)
	if !strings.HasPrefix(text, "<@") {
		return "", "", ""
	}
	end := strings.Index(text, ">")
	if end < 0 {
		return "", "", ""
	}
	inner := text[2:end] // e.g. U01234567|name or just U01234567
	rest := strings.TrimSpace(text[end+1:])
	if idx := strings.Index(inner, "|"); idx >= 0 {
		return inner[:idx], inner[idx+1:], rest
	}
	return inner, inner, rest
}
