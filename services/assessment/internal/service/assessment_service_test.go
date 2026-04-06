package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/assessment/internal/config"
	"github.com/upcore/assessment/internal/domain"
	"github.com/upcore/assessment/internal/event"
	"github.com/upcore/assessment/internal/repository"
	"github.com/upcore/assessment/internal/scoring"
)

func newTestService() (*AssessmentService, *event.InMemoryPublisher) {
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	scorerClient := scoring.NewNopClient(log)

	cfg := &config.Config{
		MaxFocusLostCount:     3,
		MinTimePerQuestionSec: 2,
	}

	svc := NewAssessmentService(
		repository.NewFakeAssessmentRepository(),
		repository.NewFakeSessionRepository(),
		repository.NewFakeResponseRepository(),
		repository.NewFakeScoreRepository(),
		repository.NewFakeSessionStateRepository(),
		scorerClient,
		pub,
		cfg,
		log,
	)
	return svc, pub
}

func TestAssessmentService_Create_Success(t *testing.T) {
	svc, pub := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	userID := uuid.New()
	empID := uuid.New()

	a, err := svc.Create(ctx, tenantID, userID, CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	require.NoError(t, err)
	require.NotNil(t, a)
	assert.Equal(t, tenantID, a.TenantID)
	assert.Equal(t, "BAT-12-TR", a.InstrumentCode)
	assert.Equal(t, domain.StatusPending, a.Status)
	assert.NotEmpty(t, a.CandidateToken)
	assert.Equal(t, &empID, a.EmployeeID)
	assert.Equal(t, 1, pub.Count(event.TopicAssessmentCreated))
}

func TestAssessmentService_Create_InvalidInstrument(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	empID := uuid.New()

	_, err := svc.Create(ctx, uuid.New(), uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "INVALID",
	})

	require.ErrorIs(t, err, domain.ErrInvalidInstrument)
}

func TestAssessmentService_Create_MissingTarget(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()

	_, err := svc.Create(ctx, uuid.New(), uuid.New(), CreateAssessmentRequest{
		InstrumentCode: "BAT-12-TR",
	})

	require.Error(t, err)
	var ve *domain.ValidationError
	assert.ErrorAs(t, err, &ve)
}

func TestAssessmentService_Create_WithExpiry(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	empID := uuid.New()
	exp := time.Now().Add(48 * time.Hour).UTC().Format(time.RFC3339)

	a, err := svc.Create(ctx, uuid.New(), uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "COPSOQ",
		ExpiresAt:      exp,
	})

	require.NoError(t, err)
	require.NotNil(t, a.ExpiresAt)
}

func TestAssessmentService_Get_NotFound(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()

	_, err := svc.Get(ctx, uuid.New(), uuid.New())
	require.ErrorIs(t, err, domain.ErrAssessmentNotFound)
}

func TestAssessmentService_Get_WrongTenant(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, err := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})
	require.NoError(t, err)

	_, err = svc.Get(ctx, uuid.New(), a.ID) // wrong tenant
	require.ErrorIs(t, err, domain.ErrAssessmentNotFound)
}

func TestAssessmentService_StartSession_Success(t *testing.T) {
	svc, pub := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, err := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})
	require.NoError(t, err)

	sess, err := svc.StartSession(ctx, a.ID, StartSessionRequest{
		BrowserFingerprint: "fp123",
		UserAgent:          "TestBrowser/1.0",
	})

	require.NoError(t, err)
	require.NotNil(t, sess)
	assert.Equal(t, domain.SessionActive, sess.Status)
	assert.Equal(t, 12, sess.TotalItems)
	assert.Equal(t, 15*60, sess.TimeLimitSeconds)
	assert.Equal(t, 1, pub.Count(event.TopicAssessmentStarted))
}

func TestAssessmentService_StartSession_Duplicate(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, _ := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	_, err := svc.StartSession(ctx, a.ID, StartSessionRequest{})
	require.NoError(t, err)

	_, err = svc.StartSession(ctx, a.ID, StartSessionRequest{})
	require.ErrorIs(t, err, domain.ErrSessionActive)
}

func TestAssessmentService_SubmitResponses_Success(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, _ := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	sess, _ := svc.StartSession(ctx, a.ID, StartSessionRequest{})

	n, err := svc.SubmitResponses(ctx, a.ID, SubmitResponsesRequest{
		SessionID: sess.ID,
		Responses: []ResponseInput{
			{ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 3, TimeSpentSeconds: 5.0},
			{ItemCode: "bat_2", ItemIndex: 1, ResponseValue: 4, TimeSpentSeconds: 4.0},
		},
		FocusLost:  1,
		ElapsedSec: 15,
	})

	require.NoError(t, err)
	assert.Equal(t, 2, n)
}

func TestAssessmentService_Complete_TriggersScoring(t *testing.T) {
	svc, pub := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, _ := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	sess, _ := svc.StartSession(ctx, a.ID, StartSessionRequest{})

	_, _ = svc.SubmitResponses(ctx, a.ID, SubmitResponsesRequest{
		SessionID: sess.ID,
		Responses: []ResponseInput{
			{ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 3, TimeSpentSeconds: 5.0},
		},
	})

	result, err := svc.Complete(ctx, tenantID, a.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.StatusCompleted, result.Status)
	assert.Equal(t, 1, pub.Count(event.TopicAssessmentCompleted))

	// Wait a moment for async scoring goroutine.
	time.Sleep(100 * time.Millisecond)

	// Verify scored event was published.
	assert.Equal(t, 1, pub.Count(event.TopicAssessmentScored))
}

func TestAssessmentService_Complete_AlreadyCompleted(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, _ := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	_, _ = svc.StartSession(ctx, a.ID, StartSessionRequest{})
	_, _ = svc.Complete(ctx, tenantID, a.ID)
	_, err := svc.Complete(ctx, tenantID, a.ID)
	require.ErrorIs(t, err, domain.ErrAssessmentCompleted)
}

func TestAssessmentService_GetByToken_Success(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	empID := uuid.New()

	a, err := svc.Create(ctx, uuid.New(), uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})
	require.NoError(t, err)

	found, err := svc.GetByToken(ctx, a.CandidateToken)
	require.NoError(t, err)
	assert.Equal(t, a.ID, found.ID)
}

func TestAssessmentService_GetByToken_InvalidToken(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()

	_, err := svc.GetByToken(ctx, "nonexistent-token")
	require.ErrorIs(t, err, domain.ErrInvalidToken)
}

func TestAssessmentService_TriggerReport_NotReady(t *testing.T) {
	svc, _ := newTestService()
	ctx := context.Background()
	tenantID := uuid.New()
	empID := uuid.New()

	a, _ := svc.Create(ctx, tenantID, uuid.New(), CreateAssessmentRequest{
		EmployeeID:     &empID,
		InstrumentCode: "BAT-12-TR",
	})

	err := svc.TriggerReport(ctx, tenantID, a.ID)
	require.Error(t, err)
}
