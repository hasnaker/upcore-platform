package service

import (
	"context"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/survey/internal/config"
	"github.com/upcore/survey/internal/event"
	"github.com/upcore/survey/internal/repository"
)

// ReminderWorker sends reminders for non-responders at configured cadence.
// Reminder cadence: T+3d, T+7d, T+12d (max 3 reminders).
type ReminderWorker struct {
	invitations   repository.InvitationRepository
	distributions repository.DistributionRepository
	publisher     event.Publisher
	cfg           *config.Config
	log           zerolog.Logger
}

// NewReminderWorker constructs a ReminderWorker.
func NewReminderWorker(
	invitations repository.InvitationRepository,
	distributions repository.DistributionRepository,
	publisher event.Publisher,
	cfg *config.Config,
	log zerolog.Logger,
) *ReminderWorker {
	return &ReminderWorker{
		invitations:   invitations,
		distributions: distributions,
		publisher:     publisher,
		cfg:           cfg,
		log:           log.With().Str("component", "reminder_worker").Logger(),
	}
}

const maxReminders = 3

// Run starts the reminder polling loop. Blocks until ctx is cancelled.
func (w *ReminderWorker) Run(ctx context.Context) error {
	// Check every hour for reminders to send.
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	w.log.Info().Msg("reminder worker started")

	for {
		select {
		case <-ctx.Done():
			w.log.Info().Msg("reminder worker stopping")
			return ctx.Err()
		case <-ticker.C:
			w.findAndSendReminders(ctx)
		}
	}
}

func (w *ReminderWorker) findAndSendReminders(ctx context.Context) {
	now := time.Now().UTC()
	cadence := w.cfg.ReminderCadence
	if cadence == 0 {
		cadence = 72 * time.Hour // default 3 days
	}

	pending, err := w.invitations.ListNeedingReminder(ctx, now, cadence, maxReminders)
	if err != nil {
		w.log.Error().Err(err).Msg("list needing reminder")
		return
	}

	if len(pending) == 0 {
		return
	}

	w.log.Info().Int("count", len(pending)).Msg("sending reminders")

	for _, inv := range pending {
		// Publish reminder event to notification service
		_ = w.publisher.Publish(ctx, event.TopicReminderDue, map[string]any{
			"invitation_id": inv.ID,
			"tenant_id":     inv.TenantID,
			"employee_id":   inv.EmployeeID,
			"survey_id":     inv.SurveyID,
			"reminder_num":  inv.RemindersSent + 1,
		})

		if err := w.invitations.IncrementReminderCount(ctx, inv.ID, now); err != nil {
			w.log.Error().Err(err).
				Str("invitation_id", inv.ID.String()).
				Msg("increment reminder count failed")
			continue
		}
	}
}
