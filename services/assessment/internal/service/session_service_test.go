package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/repository"
)

func TestSessionStateService_SaveAndLoad(t *testing.T) {
	stateRepo := repository.NewFakeSessionStateRepository()
	sessRepo := repository.NewFakeSessionRepository()
	log := zerolog.Nop()

	svc := NewSessionStateService(stateRepo, sessRepo, log)

	sessionID := uuid.New()
	assessmentID := uuid.New()

	// Manually seed the state repo.
	state := &repository.SessionState{
		SessionID:        sessionID,
		AssessmentID:     assessmentID,
		CurrentItemIndex: 0,
		ElapsedSeconds:   0,
		TotalItems:       12,
		FocusLostCount:   0,
	}
	require.NoError(t, stateRepo.Save(context.Background(), state))

	// Save progress.
	err := svc.SaveProgress(context.Background(), sessionID, 5, 120, 2)
	require.NoError(t, err)

	// Load state.
	loaded, err := svc.LoadState(context.Background(), sessionID)
	require.NoError(t, err)
	assert.Equal(t, 5, loaded.CurrentItemIndex)
	assert.Equal(t, 120, loaded.ElapsedSeconds)
	assert.Equal(t, 2, loaded.FocusLostCount)
}

func TestSessionStateService_LoadFromDB(t *testing.T) {
	stateRepo := repository.NewFakeSessionStateRepository()
	sessRepo := repository.NewFakeSessionRepository()
	log := zerolog.Nop()

	svc := NewSessionStateService(stateRepo, sessRepo, log)

	// Create a session in the DB repo.
	sess := &domain.Session{
		ID:               uuid.New(),
		AssessmentID:     uuid.New(),
		TenantID:         uuid.New(),
		Status:           domain.SessionActive,
		CurrentItemIndex: 3,
		ElapsedSeconds:   60,
		TotalItems:       12,
		CheatingMetrics:  domain.NewCheatingMetrics().ToJSONB(),
	}
	require.NoError(t, sessRepo.Create(context.Background(), sess))

	// Load should fall back to DB.
	loaded, err := svc.LoadState(context.Background(), sess.ID)
	require.NoError(t, err)
	assert.Equal(t, sess.ID, loaded.SessionID)
	assert.Equal(t, 3, loaded.CurrentItemIndex)
	assert.Equal(t, 60, loaded.ElapsedSeconds)
}

func TestSessionStateService_Cleanup(t *testing.T) {
	stateRepo := repository.NewFakeSessionStateRepository()
	sessRepo := repository.NewFakeSessionRepository()
	log := zerolog.Nop()

	svc := NewSessionStateService(stateRepo, sessRepo, log)

	sessionID := uuid.New()
	state := &repository.SessionState{
		SessionID:    sessionID,
		AssessmentID: uuid.New(),
	}
	require.NoError(t, stateRepo.Save(context.Background(), state))

	require.NoError(t, svc.CleanupState(context.Background(), sessionID))

	_, err := stateRepo.Load(context.Background(), sessionID)
	assert.ErrorIs(t, err, domain.ErrSessionNotFound)
}
