package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/upcore/assessment/internal/domain"
)

// SessionState is the Redis-cached state for auto-save and resume.
type SessionState struct {
	SessionID        uuid.UUID `json:"session_id"`
	AssessmentID     uuid.UUID `json:"assessment_id"`
	CurrentItemIndex int       `json:"current_item_index"`
	ElapsedSeconds   int       `json:"elapsed_seconds"`
	TotalItems       int       `json:"total_items"`
	FocusLostCount   int       `json:"focus_lost_count"`
	LastSavedAt      time.Time `json:"last_saved_at"`
}

// SessionStateRepository manages session state in Redis for auto-save and resume.
type SessionStateRepository interface {
	Save(ctx context.Context, state *SessionState) error
	Load(ctx context.Context, sessionID uuid.UUID) (*SessionState, error)
	Delete(ctx context.Context, sessionID uuid.UUID) error
	UpdateProgress(ctx context.Context, sessionID uuid.UUID, itemIndex, elapsedSec, focusLost int) error
}

type sessionStateRepo struct {
	rdb *redis.Client
	ttl time.Duration
}

// NewSessionStateRepository constructs a SessionStateRepository backed by Redis.
func NewSessionStateRepository(rdb *redis.Client, ttl time.Duration) SessionStateRepository {
	return &sessionStateRepo{rdb: rdb, ttl: ttl}
}

// Save persists the session state to Redis.
func (r *sessionStateRepo) Save(ctx context.Context, state *SessionState) error {
	key := sessionStateKey(state.SessionID)
	state.LastSavedAt = time.Now().UTC()

	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("marshal session state: %w", err)
	}

	if err := r.rdb.Set(ctx, key, data, r.ttl).Err(); err != nil {
		return fmt.Errorf("save session state to redis: %w", err)
	}
	return nil
}

// Load retrieves the session state from Redis.
func (r *sessionStateRepo) Load(ctx context.Context, sessionID uuid.UUID) (*SessionState, error) {
	key := sessionStateKey(sessionID)

	data, err := r.rdb.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, domain.ErrSessionNotFound
		}
		return nil, fmt.Errorf("load session state from redis: %w", err)
	}

	var state SessionState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("unmarshal session state: %w", err)
	}

	return &state, nil
}

// Delete removes the session state from Redis.
func (r *sessionStateRepo) Delete(ctx context.Context, sessionID uuid.UUID) error {
	key := sessionStateKey(sessionID)
	return r.rdb.Del(ctx, key).Err()
}

// UpdateProgress updates the progress in Redis (auto-save from client heartbeat).
func (r *sessionStateRepo) UpdateProgress(ctx context.Context, sessionID uuid.UUID, itemIndex, elapsedSec, focusLost int) error {
	state, err := r.Load(ctx, sessionID)
	if err != nil {
		return err
	}

	state.CurrentItemIndex = itemIndex
	state.ElapsedSeconds = elapsedSec
	state.FocusLostCount = focusLost

	return r.Save(ctx, state)
}

func sessionStateKey(sessionID uuid.UUID) string {
	return fmt.Sprintf("assessment:session:%s", sessionID.String())
}

// FakeSessionStateRepository is an in-memory fake for testing.
type FakeSessionStateRepository struct {
	data map[uuid.UUID]*SessionState
}

// NewFakeSessionStateRepository creates a fake session state repo.
func NewFakeSessionStateRepository() *FakeSessionStateRepository {
	return &FakeSessionStateRepository{data: make(map[uuid.UUID]*SessionState)}
}

func (f *FakeSessionStateRepository) Save(_ context.Context, state *SessionState) error {
	state.LastSavedAt = time.Now().UTC()
	f.data[state.SessionID] = state
	return nil
}

func (f *FakeSessionStateRepository) Load(_ context.Context, sessionID uuid.UUID) (*SessionState, error) {
	s, ok := f.data[sessionID]
	if !ok {
		return nil, domain.ErrSessionNotFound
	}
	return s, nil
}

func (f *FakeSessionStateRepository) Delete(_ context.Context, sessionID uuid.UUID) error {
	delete(f.data, sessionID)
	return nil
}

func (f *FakeSessionStateRepository) UpdateProgress(_ context.Context, sessionID uuid.UUID, itemIndex, elapsedSec, focusLost int) error {
	s, ok := f.data[sessionID]
	if !ok {
		return domain.ErrSessionNotFound
	}
	s.CurrentItemIndex = itemIndex
	s.ElapsedSeconds = elapsedSec
	s.FocusLostCount = focusLost
	s.LastSavedAt = time.Now().UTC()
	return nil
}
