package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

func setupAppService(t *testing.T) (
	*ApplicationService,
	*RequisitionService,
	*CandidateService,
	*PipelineService,
	uuid.UUID,
	*event.InMemoryPublisher,
) {
	t.Helper()
	reqRepo := repository.NewFakeRequisitionRepo()
	candRepo := repository.NewFakeCandidateRepo()
	appRepo := repository.NewFakeApplicationRepo()
	evtRepo := repository.NewFakeEventRepo()
	stageRepo := repository.NewFakeStageRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	tenantID := uuid.New()

	reqSvc := NewRequisitionService(reqRepo, pub, log)
	candSvc := NewCandidateService(candRepo, pub, log)
	appSvc := NewApplicationService(appRepo, reqRepo, candRepo, evtRepo, pub, log)
	pipelineSvc := NewPipelineService(appRepo, evtRepo, stageRepo, pub, log)

	return appSvc, reqSvc, candSvc, pipelineSvc, tenantID, pub
}

func createTestReqAndCandidate(t *testing.T, reqSvc *RequisitionService, candSvc *CandidateService, tenantID uuid.UUID) (uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	// Create and open requisition.
	req, err := reqSvc.Create(ctx, tenantID, CreateRequisitionRequest{
		Title: "Test Position", Description: "desc", Headcount: 1,
	})
	require.NoError(t, err)
	_, err = reqSvc.Open(ctx, tenantID, req.ID)
	require.NoError(t, err)

	// Create candidate.
	cand, err := candSvc.Create(ctx, tenantID, CreateCandidateRequest{
		Email: "test" + uuid.New().String()[:8] + "@example.com",
		FirstName: "Test", LastName: "Candidate",
		GDPRConsent: true,
	})
	require.NoError(t, err)

	return req.ID, cand.ID
}

func TestApplicationService_Submit(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, pub := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)
	assert.Equal(t, domain.StageApplied, app.CurrentStage)
	assert.Equal(t, candID, app.CandidateID)
	assert.Equal(t, reqID, app.RequisitionID)
	assert.True(t, pub.Count(event.TopicApplicationSubmitted) >= 1)
}

func TestApplicationService_SubmitDuplicate(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	_, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	_, err = appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	assert.ErrorIs(t, err, domain.ErrDuplicateApplication)
}

func TestApplicationService_SubmitToClosedRequisition(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()

	// Create req but don't open it.
	req, err := reqSvc.Create(ctx, tenantID, CreateRequisitionRequest{
		Title: "Closed", Description: "d", Headcount: 1,
	})
	require.NoError(t, err)

	cand, err := candSvc.Create(ctx, tenantID, CreateCandidateRequest{
		Email: "closed@example.com", FirstName: "C", LastName: "D", GDPRConsent: true,
	})
	require.NoError(t, err)

	_, err = appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: cand.ID, RequisitionID: req.ID,
	})
	assert.ErrorIs(t, err, domain.ErrRequisitionNotOpen)
}

func TestApplicationService_Score(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	scored, err := appSvc.Score(ctx, tenantID, app.ID, 85.5, uuid.New())
	require.NoError(t, err)
	require.NotNil(t, scored.Score)
	assert.Equal(t, 85.5, *scored.Score)
}

func TestApplicationService_ScoreInvalid(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	_, err = appSvc.Score(ctx, tenantID, app.ID, 150, uuid.New())
	assert.ErrorIs(t, err, domain.ErrInvalidScore)
}

func TestApplicationService_Reject(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, pub := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	rejected, err := appSvc.Reject(ctx, tenantID, app.ID, "not a fit", uuid.New())
	require.NoError(t, err)
	assert.Equal(t, domain.StageRejected, rejected.CurrentStage)
	assert.True(t, pub.Count(event.TopicApplicationRejected) >= 1)
}

func TestApplicationService_Withdraw(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	withdrawn, err := appSvc.Withdraw(ctx, tenantID, app.ID)
	require.NoError(t, err)
	assert.Equal(t, domain.StageWithdrawn, withdrawn.CurrentStage)
}

func TestPipelineService_FullPipeline(t *testing.T) {
	appSvc, reqSvc, candSvc, pipelineSvc, tenantID, pub := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)
	actorID := uuid.New()

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	stages := []domain.Stage{
		domain.StageScreened, domain.StageAssessed,
		domain.StageInterviewed, domain.StageOffered, domain.StageHired,
	}
	for _, stage := range stages {
		app, err = pipelineSvc.MoveToStage(ctx, tenantID, app.ID, stage, actorID, "")
		require.NoError(t, err, "transition to %s failed", stage)
		assert.Equal(t, stage, app.CurrentStage)
	}

	// Verify hired event.
	assert.True(t, pub.Count(event.TopicApplicationHired) >= 1)
	assert.True(t, pub.Count(event.TopicApplicationStageChanged) >= 5)
}

func TestPipelineService_InvalidTransition(t *testing.T) {
	appSvc, reqSvc, candSvc, pipelineSvc, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	// Skip screened -> assessed (invalid: applied -> assessed).
	_, err = pipelineSvc.MoveToStage(ctx, tenantID, app.ID, domain.StageAssessed, uuid.New(), "")
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrInvalidTransition)
}

func TestPipelineService_BulkMove(t *testing.T) {
	appSvc, reqSvc, candSvc, pipelineSvc, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, _ := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	var appIDs []uuid.UUID
	for i := 0; i < 3; i++ {
		cand, err := candSvc.Create(ctx, tenantID, CreateCandidateRequest{
			Email:       "bulk" + uuid.New().String()[:8] + "@example.com",
			FirstName:   "Bulk", LastName: "Test",
			GDPRConsent: true,
		})
		require.NoError(t, err)
		app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
			CandidateID: cand.ID, RequisitionID: reqID,
		})
		require.NoError(t, err)
		appIDs = append(appIDs, app.ID)
	}

	moved, errs := pipelineSvc.BulkMove(ctx, tenantID, appIDs, domain.StageScreened, uuid.New(), "")
	assert.Equal(t, 3, moved)
	assert.Empty(t, errs)
}

func TestPipelineService_KanbanBoard(t *testing.T) {
	appSvc, reqSvc, candSvc, pipelineSvc, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	_, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	board, err := pipelineSvc.GetBoard(ctx, tenantID, reqID)
	require.NoError(t, err)
	assert.Equal(t, reqID, board.RequisitionID)
	assert.Len(t, board.Stages, 8) // 8 system stages

	// Check applied column has 1 application.
	for _, col := range board.Stages {
		if col.Stage == "applied" {
			assert.Equal(t, 1, col.Count)
		}
	}
}

func TestApplicationService_AddNote(t *testing.T) {
	appSvc, reqSvc, candSvc, _, tenantID, _ := setupAppService(t)
	ctx := context.Background()
	reqID, candID := createTestReqAndCandidate(t, reqSvc, candSvc, tenantID)

	app, err := appSvc.Submit(ctx, tenantID, SubmitApplicationRequest{
		CandidateID: candID, RequisitionID: reqID,
	})
	require.NoError(t, err)

	err = appSvc.AddNote(ctx, tenantID, app.ID, "Great first impression", uuid.New())
	require.NoError(t, err)

	events, err := appSvc.ListEvents(ctx, tenantID, app.ID)
	require.NoError(t, err)
	assert.True(t, len(events) >= 2) // submit event + note
}
