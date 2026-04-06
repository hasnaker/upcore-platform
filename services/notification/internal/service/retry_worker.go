package service

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// RetryWorker retries failed notifications with exponential backoff.
// Backoff schedule: 1m, 5m, 30m, 2h, 8h.
type RetryWorker struct {
	notifRepo  repository.NotificationRepository
	dispatcher *Dispatcher
	maxRetries int
	log        zerolog.Logger
}

// NewRetryWorker constructs a RetryWorker.
func NewRetryWorker(
	notifRepo repository.NotificationRepository,
	dispatcher *Dispatcher,
	maxRetries int,
	log zerolog.Logger,
) *RetryWorker {
	if maxRetries <= 0 {
		maxRetries = 5
	}
	return &RetryWorker{
		notifRepo:  notifRepo,
		dispatcher: dispatcher,
		maxRetries: maxRetries,
		log:        log,
	}
}

// Run starts the retry processing loop. It periodically checks for failed
// notifications that are eligible for retry.
func (w *RetryWorker) Run(ctx context.Context) error {
	w.log.Info().
		Int("max_retries", w.maxRetries).
		Msg("retry worker started")

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.log.Info().Msg("retry worker stopped")
			return ctx.Err()
		case <-ticker.C:
			w.processRetries(ctx)
		}
	}
}

// processRetries finds failed notifications and retries them.
func (w *RetryWorker) processRetries(ctx context.Context) {
	items, err := w.notifRepo.ListForRetry(ctx, w.maxRetries, 50)
	if err != nil {
		w.log.Error().Err(err).Msg("list for retry failed")
		return
	}
	if len(items) == 0 {
		return
	}

	w.log.Info().Int("count", len(items)).Msg("processing retries")

	for _, n := range items {
		if err := w.retryNotification(ctx, n); err != nil {
			w.log.Error().
				Err(err).
				Str("id", n.ID.String()).
				Int("attempt", n.RetryCount+1).
				Msg("retry failed")
		}
	}
}

// retryNotification checks the backoff delay and re-dispatches.
func (w *RetryWorker) retryNotification(ctx context.Context, n *domain.Notification) error {
	// Check if enough time has elapsed since last failure.
	delay := domain.BackoffDelay(n.RetryCount)
	if n.FailedAt != nil && time.Since(*n.FailedAt) < delay {
		return nil // Not yet time to retry.
	}

	w.log.Info().
		Str("id", n.ID.String()).
		Int("attempt", n.RetryCount+1).
		Dur("backoff", delay).
		Msg("retrying notification")

	// Find the channel driver and re-dispatch.
	ch, ok := w.dispatcher.channels[n.Channel]
	if !ok {
		return domain.ErrChannelUnavailable
	}

	providerID, err := ch.Send(ctx, n)
	if err != nil {
		// Mark as failed again (increments retry_count).
		_ = w.notifRepo.MarkFailed(ctx, n.ID, err.Error())
		return err
	}

	// Success -- mark as sent.
	return w.notifRepo.MarkSent(ctx, n.ID, providerID)
}
