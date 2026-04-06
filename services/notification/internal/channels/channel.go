// Package channels defines the channel driver interface and implementations
// for delivering notifications across different channels.
package channels

import (
	"context"

	"github.com/upcore/notification/internal/domain"
)

// Channel is the interface that all notification delivery backends must implement.
type Channel interface {
	// Send delivers a notification via this channel and returns the provider's
	// message ID on success. The notification's Body, Subject, RecipientEmail,
	// and RecipientPhone fields are expected to be pre-rendered.
	Send(ctx context.Context, n *domain.Notification) (providerID string, err error)

	// Name returns the channel identifier.
	Name() domain.NotifChannel
}
