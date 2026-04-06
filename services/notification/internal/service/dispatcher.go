package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/channels"
	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/event"
	"github.com/upcore/notification/internal/repository"
)

// SendRequest is the input for sending a single notification.
type SendRequest struct {
	TemplateCode    string              `json:"template_code"`
	RecipientUserID *uuid.UUID          `json:"recipient_user_id,omitempty"`
	RecipientEmail  string              `json:"recipient_email,omitempty"`
	RecipientPhone  string              `json:"recipient_phone,omitempty"`
	Channel         domain.NotifChannel `json:"channel"`
	Variables       map[string]any      `json:"variables,omitempty"`
	Priority        domain.Priority     `json:"priority,omitempty"`
	CorrelationID   string              `json:"correlation_id,omitempty"`
	Category        domain.Category     `json:"category,omitempty"`
}

// BulkSendRequest is the input for sending to multiple recipients.
type BulkSendRequest struct {
	TemplateCode string `json:"template_code"`
	Recipients   []struct {
		UserID    uuid.UUID      `json:"user_id"`
		Variables map[string]any `json:"variables,omitempty"`
	} `json:"recipients"`
	Channel  domain.NotifChannel `json:"channel"`
	Priority domain.Priority     `json:"priority,omitempty"`
	Category domain.Category     `json:"category,omitempty"`
}

// Dispatcher is the core send pipeline. It applies preferences, renders
// templates, routes to the correct channel driver, and persists results.
type Dispatcher struct {
	notifRepo    repository.NotificationRepository
	prefRepo     repository.PreferenceRepository
	suppRepo     repository.SuppressionRepository
	tmplSvc      *TemplateService
	publisher    event.Publisher
	channels     map[domain.NotifChannel]channels.Channel
	bounceSuppAt int
	log          zerolog.Logger
}

// NewDispatcher constructs a Dispatcher.
func NewDispatcher(
	notifRepo repository.NotificationRepository,
	prefRepo repository.PreferenceRepository,
	suppRepo repository.SuppressionRepository,
	tmplSvc *TemplateService,
	publisher event.Publisher,
	chans []channels.Channel,
	bounceSuppAt int,
	log zerolog.Logger,
) *Dispatcher {
	chanMap := make(map[domain.NotifChannel]channels.Channel, len(chans))
	for _, c := range chans {
		chanMap[c.Name()] = c
	}
	return &Dispatcher{
		notifRepo:    notifRepo,
		prefRepo:     prefRepo,
		suppRepo:     suppRepo,
		tmplSvc:      tmplSvc,
		publisher:    publisher,
		channels:     chanMap,
		bounceSuppAt: bounceSuppAt,
		log:          log,
	}
}

// Send delivers a single notification through the full pipeline.
func (d *Dispatcher) Send(ctx context.Context, tenantID uuid.UUID, req *SendRequest) (*domain.Notification, error) {
	// Check preferences.
	if req.RecipientUserID != nil {
		canSend, err := d.checkPrefs(ctx, tenantID, *req.RecipientUserID, req.Channel, req.Category)
		if err != nil {
			d.log.Warn().Err(err).Msg("check preferences failed, proceeding")
		} else if !canSend {
			return nil, domain.ErrOptedOut
		}
	}

	// Check suppression for email channel.
	if req.Channel == domain.ChannelEmail && req.RecipientEmail != "" {
		suppressed, err := d.checkSuppression(ctx, req.RecipientEmail)
		if err != nil {
			d.log.Warn().Err(err).Msg("check suppression failed, proceeding")
		} else if suppressed {
			return nil, domain.ErrEmailSuppressed
		}
	}

	// Render template.
	locale := "tr-TR"
	if v, ok := req.Variables["locale"]; ok {
		if s, ok := v.(string); ok {
			locale = s
		}
	}
	rendered, err := d.tmplSvc.Render(ctx, &tenantID, req.TemplateCode, locale, req.Variables)
	if err != nil {
		return nil, err
	}

	// Build notification record.
	priority := req.Priority
	if priority == "" {
		priority = domain.PriorityNormal
	}

	n := &domain.Notification{
		TenantID:       tenantID,
		UserID:         req.RecipientUserID,
		Channel:        req.Channel,
		TemplateKey:    &req.TemplateCode,
		Subject:        &rendered.Subject,
		Body:           &rendered.Body,
		Payload:        req.Variables,
		Priority:       priority,
		Status:         domain.StatusQueued,
		RecipientEmail: req.RecipientEmail,
		RecipientPhone: req.RecipientPhone,
	}

	if err := d.notifRepo.Create(ctx, n); err != nil {
		return nil, fmt.Errorf("persist notification: %w", err)
	}

	// Dispatch to channel driver.
	if err := d.dispatch(ctx, n); err != nil {
		d.log.Error().Err(err).Str("id", n.ID.String()).Msg("dispatch failed")
		_ = d.notifRepo.MarkFailed(ctx, n.ID, err.Error())
		_ = d.publisher.Publish(ctx, event.TopicNotifFailed, map[string]any{
			"notification_id": n.ID,
			"reason":          err.Error(),
			"retry_count":     n.RetryCount,
		})
		return n, nil // Return the notification even on failure.
	}

	return n, nil
}

// SendBulk sends to multiple recipients.
func (d *Dispatcher) SendBulk(ctx context.Context, tenantID uuid.UUID, req *BulkSendRequest) (int, error) {
	created := 0
	for _, r := range req.Recipients {
		uid := r.UserID
		single := &SendRequest{
			TemplateCode:    req.TemplateCode,
			RecipientUserID: &uid,
			Channel:         req.Channel,
			Variables:       r.Variables,
			Priority:        req.Priority,
			Category:        req.Category,
		}
		if _, err := d.Send(ctx, tenantID, single); err != nil {
			d.log.Warn().Err(err).
				Str("user_id", r.UserID.String()).
				Msg("bulk send failed for recipient")
			continue
		}
		created++
	}
	return created, nil
}

// dispatch routes a notification to the appropriate channel driver.
func (d *Dispatcher) dispatch(ctx context.Context, n *domain.Notification) error {
	ch, ok := d.channels[n.Channel]
	if !ok {
		return fmt.Errorf("%w: %s", domain.ErrChannelUnavailable, n.Channel)
	}

	providerID, err := ch.Send(ctx, n)
	if err != nil {
		return err
	}

	// Mark as sent.
	if err := d.notifRepo.MarkSent(ctx, n.ID, providerID); err != nil {
		d.log.Error().Err(err).Msg("mark sent failed")
	}

	_ = d.publisher.Publish(ctx, event.TopicNotifSent, map[string]any{
		"notification_id":     n.ID,
		"channel":             n.Channel,
		"provider_message_id": providerID,
		"sent_at":             time.Now().UTC(),
	})

	return nil
}

// checkPrefs verifies that the recipient has opted in for this channel/category.
func (d *Dispatcher) checkPrefs(ctx context.Context, tenantID, userID uuid.UUID, channel domain.NotifChannel, category domain.Category) (bool, error) {
	if category.IsCritical() {
		return true, nil
	}

	pref, err := d.prefRepo.Get(ctx, tenantID, userID, channel, category)
	if err != nil {
		// No preference means default opt-in.
		return true, nil
	}

	return pref.CanSendNow(time.Now().UTC()), nil
}

// checkSuppression verifies the email is not on the suppression list.
func (d *Dispatcher) checkSuppression(ctx context.Context, email string) (bool, error) {
	return d.suppRepo.IsSuppressed(ctx, email)
}
