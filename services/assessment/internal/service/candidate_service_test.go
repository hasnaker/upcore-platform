package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/event"
	"github.com/upcore/assessment/internal/repository"
)

func newTestCandidateService() (*CandidateService, *repository.FakeAssessmentRepository, *repository.FakeSessionRepository) {
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	assessRepo := repository.NewFakeAssessmentRepository()
	sessRepo := repository.NewFakeSessionRepository()
	respRepo := repository.NewFakeResponseRepository()

	svc := NewCandidateService(
		assessRepo,
		sessRepo,
		respRepo,
		pub,
		log,
		3,
		2,
	)
	return svc, assessRepo, sessRepo
}

func TestCandidateService_GetPortal_Success(t *testing.T) {
	svc, assessRepo, _ := newTestCandidateService()
	ctx := context.Background()

	a := &domain.Assessment{
		TenantID:       uuid.New(),
		InstrumentCode: "BAT-12-TR",
		Status:         domain.StatusPending,
		CandidateToken: "test-token-123",
		Metadata:       domain.JSONB("{}"),
	}
	require.NoError(t, assessRepo.Create(ctx, a))

	found, sess, err := svc.GetPortal(ctx, "test-token-123")
	require.NoError(t, err)
	assert.Equal(t, a.ID, found.ID)
	assert.Nil(t, sess) // no active session yet
}

func TestCandidateService_GetPortal_InvalidToken(t *testing.T) {
	svc, _, _ := newTestCandidateService()
	ctx := context.Background()

	_, _, err := svc.GetPortal(ctx, "invalid")
	require.ErrorIs(t, err, domain.ErrInvalidToken)
}

func TestCandidateService_GetPortal_Expired(t *testing.T) {
	svc, assessRepo, _ := newTestCandidateService()
	ctx := context.Background()

	past := time.Now().Add(-1 * time.Hour)
	a := &domain.Assessment{
		TenantID:       uuid.New(),
		InstrumentCode: "BAT-12-TR",
		Status:         domain.StatusPending,
		CandidateToken: "expired-token",
		ExpiresAt:      &past,
		Metadata:       domain.JSONB("{}"),
	}
	require.NoError(t, assessRepo.Create(ctx, a))

	_, _, err := svc.GetPortal(ctx, "expired-token")
	require.ErrorIs(t, err, domain.ErrAssessmentExpired)
}

func TestCandidateService_SubmitResponses_Success(t *testing.T) {
	svc, assessRepo, sessRepo := newTestCandidateService()
	ctx := context.Background()

	a := &domain.Assessment{
		TenantID:       uuid.New(),
		InstrumentCode: "BAT-12-TR",
		Status:         domain.StatusInProgress,
		CandidateToken: "submit-token",
		Metadata:       domain.JSONB("{}"),
	}
	require.NoError(t, assessRepo.Create(ctx, a))

	sess := &domain.Session{
		AssessmentID:    a.ID,
		TenantID:        a.TenantID,
		Status:          domain.SessionActive,
		TimeLimitSeconds: 900,
		TotalItems:      12,
		CheatingMetrics: domain.NewCheatingMetrics().ToJSONB(),
	}
	require.NoError(t, sessRepo.Create(ctx, sess))

	n, err := svc.SubmitResponses(ctx, "submit-token", CandidateSubmitRequest{
		SessionID: sess.ID,
		Responses: []ResponseInput{
			{ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 3, TimeSpentSeconds: 5.0},
		},
		FocusLost:  1,
		ElapsedSec: 10,
	})

	require.NoError(t, err)
	assert.Equal(t, 1, n)
}

func TestCandidateService_SubmitResponses_CompletedAssessment(t *testing.T) {
	svc, assessRepo, sessRepo := newTestCandidateService()
	ctx := context.Background()

	a := &domain.Assessment{
		TenantID:       uuid.New(),
		InstrumentCode: "BAT-12-TR",
		Status:         domain.StatusCompleted,
		CandidateToken: "completed-token",
		Metadata:       domain.JSONB("{}"),
	}
	require.NoError(t, assessRepo.Create(ctx, a))

	sess := &domain.Session{
		AssessmentID:    a.ID,
		TenantID:        a.TenantID,
		Status:          domain.SessionActive,
		CheatingMetrics: domain.NewCheatingMetrics().ToJSONB(),
	}
	require.NoError(t, sessRepo.Create(ctx, sess))

	_, err := svc.SubmitResponses(ctx, "completed-token", CandidateSubmitRequest{
		SessionID: sess.ID,
		Responses: []ResponseInput{
			{ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 3, TimeSpentSeconds: 5.0},
		},
	})

	require.ErrorIs(t, err, domain.ErrAssessmentCompleted)
}
