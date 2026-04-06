package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// PreferenceService contains the business logic for notification preferences.
type PreferenceService struct {
	repo repository.PreferenceRepository
	log  zerolog.Logger
}

// NewPreferenceService constructs a PreferenceService.
func NewPreferenceService(repo repository.PreferenceRepository, log zerolog.Logger) *PreferenceService {
	return &PreferenceService{repo: repo, log: log}
}

// GetAll returns all preferences for a user.
func (s *PreferenceService) GetAll(ctx context.Context, tenantID, userID uuid.UUID) ([]*domain.Preference, error) {
	return s.repo.ListByUser(ctx, tenantID, userID)
}

// Update upserts a single preference. Critical categories cannot be opted out.
func (s *PreferenceService) Update(ctx context.Context, p *domain.Preference) error {
	if p.Category.IsCritical() && !p.OptIn {
		return domain.ErrValidation
	}
	return s.repo.Set(ctx, p)
}

// BulkUpdate upserts multiple preferences.
func (s *PreferenceService) BulkUpdate(ctx context.Context, prefs []*domain.Preference) error {
	for _, p := range prefs {
		if p.Category.IsCritical() && !p.OptIn {
			s.log.Warn().
				Str("category", string(p.Category)).
				Msg("skipping opt-out of critical category")
			continue
		}
	}
	return s.repo.BulkSet(ctx, prefs)
}

// OptOut opts a user out of a specific category across all channels.
func (s *PreferenceService) OptOut(ctx context.Context, tenantID, userID uuid.UUID, category domain.Category) error {
	if category.IsCritical() {
		return domain.ErrValidation
	}

	allChannels := []domain.NotifChannel{
		domain.ChannelEmail, domain.ChannelSMS, domain.ChannelPush,
		domain.ChannelInApp, domain.ChannelSlack, domain.ChannelTeams,
	}
	for _, ch := range allChannels {
		p := &domain.Preference{
			TenantID: tenantID,
			UserID:   userID,
			Category: category,
			Channel:  ch,
			OptIn:    false,
		}
		if err := s.repo.Set(ctx, p); err != nil {
			return err
		}
	}
	return nil
}

// OptIn opts a user into a specific category across all channels.
func (s *PreferenceService) OptIn(ctx context.Context, tenantID, userID uuid.UUID, category domain.Category) error {
	allChannels := []domain.NotifChannel{
		domain.ChannelEmail, domain.ChannelSMS, domain.ChannelPush,
		domain.ChannelInApp, domain.ChannelSlack, domain.ChannelTeams,
	}
	for _, ch := range allChannels {
		p := &domain.Preference{
			TenantID: tenantID,
			UserID:   userID,
			Category: category,
			Channel:  ch,
			OptIn:    true,
		}
		if err := s.repo.Set(ctx, p); err != nil {
			return err
		}
	}
	return nil
}

// SetQuietHours sets quiet hours for a user on all channels.
func (s *PreferenceService) SetQuietHours(ctx context.Context, tenantID, userID uuid.UUID, start, end, tz string) error {
	prefs, err := s.repo.ListByUser(ctx, tenantID, userID)
	if err != nil {
		return err
	}
	for _, p := range prefs {
		p.QuietHours = domain.QuietHours{Start: start, End: end, Timezone: tz}
		if err := s.repo.Set(ctx, p); err != nil {
			return err
		}
	}
	return nil
}
