package slack

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

// InstallationLookup abstracts the installation repository required by the
// outbound driver. Keeping it narrow avoids a circular import with the
// notification repository package.
type InstallationLookup interface {
	// GetActiveForTenant returns the non-revoked installation plus the
	// decrypted bot token (and optional incoming webhook URL) for the
	// given tenant. Returns domain.ErrNotFound when no install exists.
	GetActiveForTenant(ctx context.Context, tenantID uuid.UUID) (*Installation, error)
	// ResolveSlackUserID maps an internal user to a Slack user ID in the
	// tenant's workspace. Returns empty string when the mapping is unknown.
	ResolveSlackUserID(ctx context.Context, tenantID, userID uuid.UUID, email string) (string, error)
	// UpsertSlackUserMap persists a newly-discovered mapping.
	UpsertSlackUserMap(ctx context.Context, tenantID, userID uuid.UUID, teamID, slackUserID, email string) error
}

// Installation is the minimal data needed to post messages.
type Installation struct {
	ID                    uuid.UUID
	TenantID              uuid.UUID
	TeamID                string
	TeamName              string
	BotToken              string
	IncomingWebhookURL    string
	IncomingWebhookChan   string
	IncomingWebhookChanID string
	DefaultChannelID      string
	AllowDMInterventions  bool
}

// Channel implements the notification channels.Channel interface for Slack.
// It supports three delivery modes, chosen in priority order from the
// notification payload:
//
//  1. Direct Message to an internal user (payload.slack_user_id OR
//     notification.UserID + resolvable e-mail).
//  2. Named channel (payload.slack_channel_id) via chat.postMessage.
//  3. Tenant default channel (Installation.DefaultChannelID).
//  4. Incoming webhook (Installation.IncomingWebhookURL) as last resort.
type Channel struct {
	client *Client
	repo   InstallationLookup
	log    zerolog.Logger
}

// NewChannel builds a new Slack outbound channel driver.
func NewChannel(client *Client, repo InstallationLookup, log zerolog.Logger) *Channel {
	return &Channel{client: client, repo: repo, log: log}
}

// Name implements channels.Channel.
func (c *Channel) Name() domain.NotifChannel { return domain.ChannelSlack }

// Send implements channels.Channel.
func (c *Channel) Send(ctx context.Context, n *domain.Notification) (string, error) {
	install, err := c.repo.GetActiveForTenant(ctx, n.TenantID)
	if err != nil {
		return "", fmt.Errorf("%w: slack install lookup: %v", domain.ErrProviderError, err)
	}
	if install == nil {
		return "", fmt.Errorf("%w: slack not installed for tenant", domain.ErrChannelUnavailable)
	}

	message, err := c.buildMessage(n)
	if err != nil {
		return "", err
	}

	// Resolve destination.
	channel, err := c.resolveTarget(ctx, install, n)
	if err != nil {
		return "", err
	}
	message.Channel = channel

	// Intervention DMs require KVKK opt-in at the tenant level.
	if isInterventionPayload(n) && !install.AllowDMInterventions {
		return "", fmt.Errorf("%w: intervention DMs disabled by tenant (KVKK)", domain.ErrOptedOut)
	}

	if channel == "" && install.IncomingWebhookURL != "" {
		// Fallback to legacy incoming-webhook URL for channel-wide posts.
		if err := c.client.PostJSON(ctx, install.IncomingWebhookURL, message); err != nil {
			return "", fmt.Errorf("%w: slack webhook: %v", domain.ErrProviderError, err)
		}
		return "webhook-" + time.Now().UTC().Format("20060102T150405Z"), nil
	}

	params := url.Values{}
	params.Set("channel", channel)
	params.Set("text", message.Text)
	if len(message.Blocks) > 0 {
		blob, err := marshalBlocks(message.Blocks)
		if err != nil {
			return "", fmt.Errorf("marshal slack blocks: %w", err)
		}
		params.Set("blocks", blob)
	}

	var resp struct {
		Channel string `json:"channel"`
		TS      string `json:"ts"`
	}
	if err := c.client.PostForm(ctx, "chat.postMessage", install.BotToken, params, &resp); err != nil {
		if errors.Is(err, ErrTokenRevoked) {
			c.log.Warn().Str("tenant", install.TenantID.String()).
				Msg("slack token revoked — installation stale")
			return "", fmt.Errorf("%w: token revoked", domain.ErrProviderError)
		}
		return "", fmt.Errorf("%w: chat.postMessage: %v", domain.ErrProviderError, err)
	}
	return resp.TS, nil
}

// resolveTarget picks the delivery destination.
func (c *Channel) resolveTarget(ctx context.Context, install *Installation, n *domain.Notification) (string, error) {
	// Explicit override in payload.
	if v, ok := n.Payload["slack_channel_id"]; ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return s, nil
		}
	}
	if v, ok := n.Payload["slack_user_id"]; ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return s, nil
		}
	}

	// Try to resolve internal user → slack user.
	if n.UserID != nil {
		slackUID, err := c.repo.ResolveSlackUserID(ctx, n.TenantID, *n.UserID, n.RecipientEmail)
		if err == nil && slackUID != "" {
			return slackUID, nil
		}
		// Attempt live lookup by e-mail via users.lookupByEmail.
		if strings.TrimSpace(n.RecipientEmail) != "" {
			if uid := c.lookupUserByEmail(ctx, install, n.RecipientEmail); uid != "" {
				_ = c.repo.UpsertSlackUserMap(ctx, n.TenantID, *n.UserID, install.TeamID, uid, n.RecipientEmail)
				return uid, nil
			}
		}
	}

	if install.DefaultChannelID != "" {
		return install.DefaultChannelID, nil
	}
	if install.IncomingWebhookChanID != "" {
		return install.IncomingWebhookChanID, nil
	}
	// Trigger the webhook fallback path.
	return "", nil
}

// lookupUserByEmail calls users.lookupByEmail on Slack. Returns empty when not found.
func (c *Channel) lookupUserByEmail(ctx context.Context, install *Installation, email string) string {
	params := url.Values{}
	params.Set("email", email)
	var resp struct {
		User struct {
			ID string `json:"id"`
		} `json:"user"`
	}
	if err := c.client.PostForm(ctx, "users.lookupByEmail", install.BotToken, params, &resp); err != nil {
		c.log.Debug().Err(err).Str("email", email).Msg("slack users.lookupByEmail miss")
		return ""
	}
	return resp.User.ID
}

// buildMessage picks a Block Kit template based on the template_key in the
// notification. Unknown templates fall back to a plain title + body message
// derived from Subject/Body.
func (c *Channel) buildMessage(n *domain.Notification) (*Message, error) {
	key := ""
	if n.TemplateKey != nil {
		key = *n.TemplateKey
	}
	title := ""
	if n.Subject != nil {
		title = *n.Subject
	}
	body := ""
	if n.Body != nil {
		body = *n.Body
	}

	switch key {
	case "welcome", "tenant_user_invited":
		firstName, _ := n.Payload["first_name"].(string)
		company, _ := n.Payload["company_name"].(string)
		link, _ := n.Payload["login_url"].(string)
		return WelcomeMessage(firstName, company, link), nil
	case "intervention_consent_request", "intervention_assigned":
		it, _ := n.Payload["intervention_type"].(string)
		desc, _ := n.Payload["description"].(string)
		link, _ := n.Payload["consent_link"].(string)
		return InterventionDM(it, desc, link), nil
	case "pulse_reminder":
		pulse, _ := n.Payload["pulse_title"].(string)
		link, _ := n.Payload["pulse_url"].(string)
		due, _ := n.Payload["due_date"].(string)
		return PulseReminder(pulse, link, due), nil
	}

	if title == "" && body == "" {
		return nil, fmt.Errorf("%w: empty slack message", domain.ErrValidation)
	}
	if title == "" {
		title = "UpCore bildirimi"
	}
	return PlainDM(title, body), nil
}

func isInterventionPayload(n *domain.Notification) bool {
	if n.TemplateKey == nil {
		return false
	}
	k := *n.TemplateKey
	return k == "intervention_consent_request" || k == "intervention_assigned"
}
