package service

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/repository"
)

// DigestWorker aggregates queued notifications by user for digest mode.
// It runs on a cron interval (hourly/daily/weekly) and combines same-user
// notifications into a single digest email.
type DigestWorker struct {
	notifRepo repository.NotificationRepository
	prefRepo  repository.PreferenceRepository
	log       zerolog.Logger
}

// NewDigestWorker constructs a DigestWorker.
func NewDigestWorker(
	notifRepo repository.NotificationRepository,
	prefRepo repository.PreferenceRepository,
	log zerolog.Logger,
) *DigestWorker {
	return &DigestWorker{
		notifRepo: notifRepo,
		prefRepo:  prefRepo,
		log:       log,
	}
}

// Run starts the digest processing loop. It checks for users with digest
// preferences and aggregates their queued notifications.
func (w *DigestWorker) Run(ctx context.Context) error {
	w.log.Info().Msg("digest worker started")

	// Run hourly checks. The worker inspects preferences to determine
	// which users have hourly/daily/weekly digest frequencies.
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.log.Info().Msg("digest worker stopped")
			return ctx.Err()
		case <-ticker.C:
			w.processDigests(ctx)
		}
	}
}

// processDigests is a placeholder for the full digest aggregation logic.
// In production:
// 1. Query users with digest_frequency = hourly/daily/weekly
// 2. Aggregate their pending notifications per category
// 3. Render a single digest template with all items
// 4. Dispatch the digest email
// 5. Mark individual notifications as "digested"
func (w *DigestWorker) processDigests(ctx context.Context) {
	w.log.Debug().Msg("processing digest cycle")

	// Digest implementation would query notification_preferences for users
	// with digest_frequency != 'instant' and aggregate their queued
	// notifications into a single digest email per period.
	//
	// For hourly digests: collect all notifications from the last hour.
	// For daily digests: collect all from the last 24 hours.
	// For weekly digests: collect all from the last 7 days.
	//
	// This is a placeholder; full implementation requires additional
	// repository methods for querying queued notifications by user.
}
