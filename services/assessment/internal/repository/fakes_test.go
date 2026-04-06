package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/assessment/internal/domain"
)

func TestFakeAssessmentRepository_CRUD(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeAssessmentRepository()
	tenantID := uuid.New()

	a := &domain.Assessment{
		TenantID:       tenantID,
		InstrumentCode: "BAT-12-TR",
		Status:         domain.StatusPending,
		CandidateToken: "token1",
		Metadata:       domain.JSONB("{}"),
	}
	require.NoError(t, repo.Create(ctx, a))
	assert.NotEqual(t, uuid.Nil, a.ID)

	// GetByID
	found, err := repo.GetByID(ctx, a.ID)
	require.NoError(t, err)
	assert.Equal(t, a.ID, found.ID)

	// GetByToken
	found, err = repo.GetByToken(ctx, "token1")
	require.NoError(t, err)
	assert.Equal(t, a.ID, found.ID)

	// Update
	a.Status = domain.StatusInProgress
	require.NoError(t, repo.Update(ctx, a))

	// List
	items, total, err := repo.List(ctx, ListFilter{TenantID: tenantID})
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, items, 1)

	// SoftDelete
	require.NoError(t, repo.SoftDelete(ctx, a.ID))
	_, err = repo.GetByID(ctx, a.ID)
	assert.ErrorIs(t, err, domain.ErrAssessmentNotFound)
}

func TestFakeAssessmentRepository_List_Filter(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeAssessmentRepository()
	tenantID := uuid.New()

	for i, code := range []string{"BAT-12-TR", "COPSOQ", "BAT-12-TR"} {
		a := &domain.Assessment{
			TenantID:       tenantID,
			InstrumentCode: code,
			Status:         domain.StatusPending,
			CandidateToken: uuid.NewString(),
			Metadata:       domain.JSONB("{}"),
		}
		_ = i
		require.NoError(t, repo.Create(ctx, a))
	}

	items, total, err := repo.List(ctx, ListFilter{TenantID: tenantID, InstrumentCode: "BAT-12-TR"})
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, items, 2)

	items, total, err = repo.List(ctx, ListFilter{TenantID: tenantID, Status: "pending"})
	require.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, items, 3)
}

func TestFakeSessionRepository_CRUD(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeSessionRepository()
	assessmentID := uuid.New()

	s := &domain.Session{
		AssessmentID:    assessmentID,
		TenantID:        uuid.New(),
		Status:          domain.SessionActive,
		TimeLimitSeconds: 900,
		TotalItems:      12,
		CheatingMetrics: domain.JSONB("{}"),
	}
	require.NoError(t, repo.Create(ctx, s))
	assert.NotEqual(t, uuid.Nil, s.ID)

	found, err := repo.GetByID(ctx, s.ID)
	require.NoError(t, err)
	assert.Equal(t, s.ID, found.ID)

	active, err := repo.GetActiveByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Equal(t, s.ID, active.ID)

	sessions, err := repo.ListByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Len(t, sessions, 1)

	s.Status = domain.SessionCompleted
	require.NoError(t, repo.Update(ctx, s))

	_, err = repo.GetActiveByAssessment(ctx, assessmentID)
	assert.ErrorIs(t, err, domain.ErrSessionNotFound)
}

func TestFakeResponseRepository_CRUD(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeResponseRepository()
	assessmentID := uuid.New()
	sessionID := uuid.New()

	r := &domain.Response{
		SessionID:        sessionID,
		AssessmentID:     assessmentID,
		TenantID:         uuid.New(),
		ItemCode:         "bat_1",
		ItemIndex:        0,
		ResponseValue:    3,
		TimeSpentSeconds: 5.0,
	}
	require.NoError(t, repo.Create(ctx, r))

	responses, err := repo.ListByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Len(t, responses, 1)

	responses, err = repo.ListBySession(ctx, sessionID)
	require.NoError(t, err)
	assert.Len(t, responses, 1)

	count, err := repo.CountByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestFakeResponseRepository_BulkCreate(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeResponseRepository()
	assessmentID := uuid.New()

	responses := []*domain.Response{
		{SessionID: uuid.New(), AssessmentID: assessmentID, TenantID: uuid.New(), ItemCode: "bat_1", ItemIndex: 0, ResponseValue: 1},
		{SessionID: uuid.New(), AssessmentID: assessmentID, TenantID: uuid.New(), ItemCode: "bat_2", ItemIndex: 1, ResponseValue: 2},
	}

	n, err := repo.BulkCreate(ctx, responses)
	require.NoError(t, err)
	assert.Equal(t, 2, n)
}

func TestFakeScoreRepository_CRUD(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeScoreRepository()
	assessmentID := uuid.New()

	score := &domain.Score{
		AssessmentID: assessmentID,
		TenantID:     uuid.New(),
		ScaleCode:    "EX",
		ScaleName:    "Exhaustion",
		RawScore:     25.0,
		Metadata:     domain.JSONB("{}"),
	}
	require.NoError(t, repo.Create(ctx, score))

	scores, err := repo.ListByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Len(t, scores, 1)

	require.NoError(t, repo.DeleteByAssessment(ctx, assessmentID))

	scores, err = repo.ListByAssessment(ctx, assessmentID)
	require.NoError(t, err)
	assert.Len(t, scores, 0)
}

func TestFakeSessionStateRepository_CRUD(t *testing.T) {
	ctx := context.Background()
	repo := NewFakeSessionStateRepository()
	sessionID := uuid.New()

	state := &SessionState{
		SessionID:        sessionID,
		AssessmentID:     uuid.New(),
		CurrentItemIndex: 5,
		ElapsedSeconds:   120,
		TotalItems:       12,
		FocusLostCount:   1,
	}
	require.NoError(t, repo.Save(ctx, state))

	loaded, err := repo.Load(ctx, sessionID)
	require.NoError(t, err)
	assert.Equal(t, 5, loaded.CurrentItemIndex)
	assert.Equal(t, 120, loaded.ElapsedSeconds)

	require.NoError(t, repo.UpdateProgress(ctx, sessionID, 8, 200, 3))
	loaded, err = repo.Load(ctx, sessionID)
	require.NoError(t, err)
	assert.Equal(t, 8, loaded.CurrentItemIndex)
	assert.Equal(t, 200, loaded.ElapsedSeconds)
	assert.Equal(t, 3, loaded.FocusLostCount)

	require.NoError(t, repo.Delete(ctx, sessionID))
	_, err = repo.Load(ctx, sessionID)
	assert.ErrorIs(t, err, domain.ErrSessionNotFound)
}
