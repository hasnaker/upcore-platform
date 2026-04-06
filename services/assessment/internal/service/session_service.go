package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/repository"
)

// SessionStateService manages session state in Redis for auto-save and resume.
// It wraps the repository.SessionStateRepository with additional business logic.
type SessionStateService struct {
	stateRepo repository.SessionStateRepository
	sessions  repository.SessionRepository
	log       zerolog.Logger
}

// NewSessionStateService constructs the session state service.
func NewSessionStateService(
	stateRepo repository.SessionStateRepository,
	sessions repository.SessionRepository,
	log zerolog.Logger,
) *SessionStateService {
	return &SessionStateService{
		stateRepo: stateRepo,
		sessions:  sessions,
		log:       log,
	}
}

// SaveProgress persists the session progress to Redis and syncs back to DB.
func (s *SessionStateService) SaveProgress(ctx context.Context, sessionID uuid.UUID, itemIndex, elapsedSec, focusLost int) error {
	// Save to Redis.
	if err := s.stateRepo.UpdateProgress(ctx, sessionID, itemIndex, elapsedSec, focusLost); err != nil {
		// If Redis had no state, initialise it.
		state := &repository.SessionState{
			SessionID:        sessionID,
			CurrentItemIndex: itemIndex,
			ElapsedSeconds:   elapsedSec,
			FocusLostCount:   focusLost,
		}
		if err := s.stateRepo.Save(ctx, state); err != nil {
			return err
		}
	}

	// Sync progress back to DB (best-effort).
	sess, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		s.log.Warn().Err(err).Msg("sync session progress: get session failed")
		return nil
	}
	if sess.Status != domain.SessionActive {
		return nil
	}
	sess.CurrentItemIndex = itemIndex
	sess.ElapsedSeconds = elapsedSec

	metrics := domain.ParseCheatingMetrics(sess.CheatingMetrics)
	metrics.FocusLostCount = focusLost
	sess.CheatingMetrics = metrics.ToJSONB()

	if err := s.sessions.Update(ctx, sess); err != nil {
		s.log.Warn().Err(err).Msg("sync session progress: update failed")
	}
	return nil
}

// LoadState retrieves the cached session state from Redis, falling back to DB.
func (s *SessionStateService) LoadState(ctx context.Context, sessionID uuid.UUID) (*repository.SessionState, error) {
	state, err := s.stateRepo.Load(ctx, sessionID)
	if err == nil {
		return state, nil
	}

	// Rebuild from DB.
	sess, dbErr := s.sessions.GetByID(ctx, sessionID)
	if dbErr != nil {
		return nil, dbErr
	}

	metrics := domain.ParseCheatingMetrics(sess.CheatingMetrics)
	state = &repository.SessionState{
		SessionID:        sess.ID,
		AssessmentID:     sess.AssessmentID,
		CurrentItemIndex: sess.CurrentItemIndex,
		ElapsedSeconds:   sess.ElapsedSeconds,
		TotalItems:       sess.TotalItems,
		FocusLostCount:   metrics.FocusLostCount,
		LastSavedAt:      time.Now().UTC(),
	}

	// Re-cache in Redis (best-effort).
	if err := s.stateRepo.Save(ctx, state); err != nil {
		s.log.Warn().Err(err).Msg("re-cache session state failed")
	}

	return state, nil
}

// CleanupState removes the session state from Redis.
func (s *SessionStateService) CleanupState(ctx context.Context, sessionID uuid.UUID) error {
	return s.stateRepo.Delete(ctx, sessionID)
}
