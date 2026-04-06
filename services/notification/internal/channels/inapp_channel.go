package channels

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// InAppChannel stores notifications in the notification_inapp table
// for display within the application.
type InAppChannel struct {
	repo repository.InAppRepository
	log  zerolog.Logger
}

// NewInAppChannel constructs an in-app notification channel.
func NewInAppChannel(repo repository.InAppRepository, log zerolog.Logger) *InAppChannel {
	return &InAppChannel{repo: repo, log: log}
}

// Name returns the channel identifier.
func (c *InAppChannel) Name() domain.NotifChannel {
	return domain.ChannelInApp
}

// Send persists the notification as an in-app entry.
func (c *InAppChannel) Send(ctx context.Context, n *domain.Notification) (string, error) {
	if n.UserID == nil {
		return "", fmt.Errorf("%w: in-app requires user_id", domain.ErrMissingRecipient)
	}

	title := ""
	if n.Subject != nil {
		title = *n.Subject
	}
	body := ""
	if n.Body != nil {
		body = *n.Body
	}

	linkURL := ""
	if v, ok := n.Payload["link_url"]; ok {
		if s, ok := v.(string); ok {
			linkURL = s
		}
	}

	category := domain.CategorySystem
	if v, ok := n.Payload["category"]; ok {
		if s, ok := v.(string); ok {
			category = domain.Category(s)
		}
	}

	inapp := &domain.InAppNotification{
		TenantID: n.TenantID,
		UserID:   *n.UserID,
		Title:    title,
		Body:     body,
		LinkURL:  linkURL,
		Category: category,
	}
	if err := c.repo.Create(ctx, inapp); err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrProviderError, err)
	}

	c.log.Debug().
		Str("user_id", n.UserID.String()).
		Str("title", title).
		Msg("in-app notification created")

	return inapp.ID.String(), nil
}
