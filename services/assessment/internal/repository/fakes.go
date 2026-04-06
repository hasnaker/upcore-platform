package repository

import (
	"context"
	"sync"

	"github.com/google/uuid"

	"github.com/upcore/assessment/internal/domain"
)

// FakeAssessmentRepository is an in-memory fake for testing.
type FakeAssessmentRepository struct {
	mu   sync.Mutex
	data map[uuid.UUID]*domain.Assessment
}

// NewFakeAssessmentRepository creates a fake assessment repo.
func NewFakeAssessmentRepository() *FakeAssessmentRepository {
	return &FakeAssessmentRepository{data: make(map[uuid.UUID]*domain.Assessment)}
}

func (f *FakeAssessmentRepository) Create(_ context.Context, a *domain.Assessment) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	f.data[a.ID] = a
	return nil
}

func (f *FakeAssessmentRepository) GetByID(_ context.Context, id uuid.UUID) (*domain.Assessment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.data[id]
	if !ok || a.DeletedAt != nil {
		return nil, domain.ErrAssessmentNotFound
	}
	return a, nil
}

func (f *FakeAssessmentRepository) GetByToken(_ context.Context, token string) (*domain.Assessment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, a := range f.data {
		if a.CandidateToken == token && a.DeletedAt == nil {
			return a, nil
		}
	}
	return nil, domain.ErrAssessmentNotFound
}

func (f *FakeAssessmentRepository) Update(_ context.Context, a *domain.Assessment) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.data[a.ID]; !ok {
		return domain.ErrAssessmentNotFound
	}
	f.data[a.ID] = a
	return nil
}

func (f *FakeAssessmentRepository) SoftDelete(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.data[id]; !ok {
		return domain.ErrAssessmentNotFound
	}
	delete(f.data, id)
	return nil
}

func (f *FakeAssessmentRepository) List(_ context.Context, filter ListFilter) ([]*domain.Assessment, int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []*domain.Assessment
	for _, a := range f.data {
		if a.TenantID != filter.TenantID || a.DeletedAt != nil {
			continue
		}
		if filter.Status != "" && string(a.Status) != filter.Status {
			continue
		}
		if filter.InstrumentCode != "" && a.InstrumentCode != filter.InstrumentCode {
			continue
		}
		result = append(result, a)
	}
	return result, len(result), nil
}

// FakeSessionRepository is an in-memory fake for testing.
type FakeSessionRepository struct {
	mu   sync.Mutex
	data map[uuid.UUID]*domain.Session
}

// NewFakeSessionRepository creates a fake session repo.
func NewFakeSessionRepository() *FakeSessionRepository {
	return &FakeSessionRepository{data: make(map[uuid.UUID]*domain.Session)}
}

func (f *FakeSessionRepository) Create(_ context.Context, s *domain.Session) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	f.data[s.ID] = s
	return nil
}

func (f *FakeSessionRepository) GetByID(_ context.Context, id uuid.UUID) (*domain.Session, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.data[id]
	if !ok {
		return nil, domain.ErrSessionNotFound
	}
	return s, nil
}

func (f *FakeSessionRepository) GetActiveByAssessment(_ context.Context, assessmentID uuid.UUID) (*domain.Session, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, s := range f.data {
		if s.AssessmentID == assessmentID && s.Status == domain.SessionActive {
			return s, nil
		}
	}
	return nil, domain.ErrSessionNotFound
}

func (f *FakeSessionRepository) ListByAssessment(_ context.Context, assessmentID uuid.UUID) ([]*domain.Session, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []*domain.Session
	for _, s := range f.data {
		if s.AssessmentID == assessmentID {
			result = append(result, s)
		}
	}
	if result == nil {
		result = []*domain.Session{}
	}
	return result, nil
}

func (f *FakeSessionRepository) Update(_ context.Context, s *domain.Session) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.data[s.ID]; !ok {
		return domain.ErrSessionNotFound
	}
	f.data[s.ID] = s
	return nil
}

// FakeResponseRepository is an in-memory fake for testing.
type FakeResponseRepository struct {
	mu   sync.Mutex
	data []*domain.Response
}

// NewFakeResponseRepository creates a fake response repo.
func NewFakeResponseRepository() *FakeResponseRepository {
	return &FakeResponseRepository{data: make([]*domain.Response, 0)}
}

func (f *FakeResponseRepository) Create(_ context.Context, r *domain.Response) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	f.data = append(f.data, r)
	return nil
}

func (f *FakeResponseRepository) BulkCreate(ctx context.Context, responses []*domain.Response) (int, error) {
	n := 0
	for _, r := range responses {
		if err := f.Create(ctx, r); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

func (f *FakeResponseRepository) ListByAssessment(_ context.Context, assessmentID uuid.UUID) ([]*domain.Response, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []*domain.Response
	for _, r := range f.data {
		if r.AssessmentID == assessmentID {
			result = append(result, r)
		}
	}
	if result == nil {
		result = []*domain.Response{}
	}
	return result, nil
}

func (f *FakeResponseRepository) ListBySession(_ context.Context, sessionID uuid.UUID) ([]*domain.Response, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []*domain.Response
	for _, r := range f.data {
		if r.SessionID == sessionID {
			result = append(result, r)
		}
	}
	if result == nil {
		result = []*domain.Response{}
	}
	return result, nil
}

func (f *FakeResponseRepository) CountByAssessment(_ context.Context, assessmentID uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, r := range f.data {
		if r.AssessmentID == assessmentID {
			n++
		}
	}
	return n, nil
}

// FakeScoreRepository is an in-memory fake for testing.
type FakeScoreRepository struct {
	mu   sync.Mutex
	data []*domain.Score
}

// NewFakeScoreRepository creates a fake score repo.
func NewFakeScoreRepository() *FakeScoreRepository {
	return &FakeScoreRepository{data: make([]*domain.Score, 0)}
}

func (f *FakeScoreRepository) Create(_ context.Context, s *domain.Score) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	f.data = append(f.data, s)
	return nil
}

func (f *FakeScoreRepository) BulkCreate(ctx context.Context, scores []*domain.Score) (int, error) {
	n := 0
	for _, s := range scores {
		if err := f.Create(ctx, s); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

func (f *FakeScoreRepository) ListByAssessment(_ context.Context, assessmentID uuid.UUID) ([]*domain.Score, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []*domain.Score
	for _, s := range f.data {
		if s.AssessmentID == assessmentID {
			result = append(result, s)
		}
	}
	if result == nil {
		result = []*domain.Score{}
	}
	return result, nil
}

func (f *FakeScoreRepository) DeleteByAssessment(_ context.Context, assessmentID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	var remaining []*domain.Score
	for _, s := range f.data {
		if s.AssessmentID != assessmentID {
			remaining = append(remaining, s)
		}
	}
	f.data = remaining
	return nil
}
