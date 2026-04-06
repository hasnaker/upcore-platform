package repository

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/ats/internal/domain"
)

// ---- FakeRequisitionRepo ----

// FakeRequisitionRepo is an in-memory RequisitionRepository for tests.
type FakeRequisitionRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Requisition
}

// NewFakeRequisitionRepo creates an empty fake requisition repo.
func NewFakeRequisitionRepo() *FakeRequisitionRepo {
	return &FakeRequisitionRepo{byID: map[uuid.UUID]*domain.Requisition{}}
}

func (f *FakeRequisitionRepo) Create(_ context.Context, r *domain.Requisition) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	r.ApplyDefaults()
	now := time.Now().UTC()
	if r.CreatedAt.IsZero() {
		r.CreatedAt = now
	}
	r.UpdatedAt = now
	cp := *r
	f.byID[r.ID] = &cp
	return nil
}

func (f *FakeRequisitionRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Requisition, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	r, ok := f.byID[id]
	if !ok || r.TenantID != tenantID {
		return nil, domain.ErrRequisitionNotFound
	}
	cp := *r
	return &cp, nil
}

func (f *FakeRequisitionRepo) Update(_ context.Context, r *domain.Requisition) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[r.ID]; !ok {
		return domain.ErrRequisitionNotFound
	}
	r.UpdatedAt = time.Now().UTC()
	cp := *r
	f.byID[r.ID] = &cp
	return nil
}

func (f *FakeRequisitionRepo) List(_ context.Context, flt RequisitionFilter) ([]*domain.Requisition, int, error) {
	if flt.Limit <= 0 {
		flt.Limit = 50
	}
	if flt.Page <= 0 {
		flt.Page = 1
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	all := []*domain.Requisition{}
	for _, r := range f.byID {
		if r.TenantID != flt.TenantID {
			continue
		}
		if flt.Status != "" && string(r.Status) != flt.Status {
			continue
		}
		if flt.HiringManagerID != nil && (r.HiringManagerID == nil || *r.HiringManagerID != *flt.HiringManagerID) {
			continue
		}
		if q := strings.TrimSpace(strings.ToLower(flt.Search)); q != "" {
			hay := strings.ToLower(r.Title + " " + r.Description)
			if !strings.Contains(hay, q) {
				continue
			}
		}
		cp := *r
		all = append(all, &cp)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	total := len(all)
	start := (flt.Page - 1) * flt.Limit
	if start >= total {
		return []*domain.Requisition{}, total, nil
	}
	end := start + flt.Limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

func (f *FakeRequisitionRepo) CountByStatus(_ context.Context, tenantID uuid.UUID) (map[domain.ReqStatus]int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := map[domain.ReqStatus]int{}
	for _, r := range f.byID {
		if r.TenantID == tenantID {
			out[r.Status]++
		}
	}
	return out, nil
}

// ---- FakeCandidateRepo ----

// FakeCandidateRepo is an in-memory CandidateRepository for tests.
type FakeCandidateRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Candidate
}

// NewFakeCandidateRepo creates an empty fake candidate repo.
func NewFakeCandidateRepo() *FakeCandidateRepo {
	return &FakeCandidateRepo{byID: map[uuid.UUID]*domain.Candidate{}}
}

func (f *FakeCandidateRepo) Create(_ context.Context, c *domain.Candidate) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.ApplyDefaults()
	// Check duplicate email per tenant.
	for _, existing := range f.byID {
		if existing.DeletedAt != nil || existing.TenantID != c.TenantID {
			continue
		}
		if strings.EqualFold(existing.Email, c.Email) {
			return domain.ErrDuplicateEmail
		}
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	cp := *c
	f.byID[c.ID] = &cp
	return nil
}

func (f *FakeCandidateRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Candidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.byID[id]
	if !ok || c.DeletedAt != nil || c.TenantID != tenantID {
		return nil, domain.ErrCandidateNotFound
	}
	cp := *c
	return &cp, nil
}

func (f *FakeCandidateRepo) GetByEmail(_ context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, c := range f.byID {
		if c.DeletedAt == nil && c.TenantID == tenantID && strings.EqualFold(c.Email, email) {
			cp := *c
			return &cp, nil
		}
	}
	return nil, domain.ErrCandidateNotFound
}

func (f *FakeCandidateRepo) Update(_ context.Context, c *domain.Candidate) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[c.ID]; !ok {
		return domain.ErrCandidateNotFound
	}
	c.UpdatedAt = time.Now().UTC()
	cp := *c
	f.byID[c.ID] = &cp
	return nil
}

func (f *FakeCandidateRepo) HardDelete(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.byID[id]
	if !ok || c.TenantID != tenantID {
		return domain.ErrCandidateNotFound
	}
	delete(f.byID, id)
	return nil
}

func (f *FakeCandidateRepo) List(_ context.Context, flt CandidateFilter) ([]*domain.Candidate, int, error) {
	if flt.Limit <= 0 {
		flt.Limit = 50
	}
	if flt.Page <= 0 {
		flt.Page = 1
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	all := []*domain.Candidate{}
	for _, c := range f.byID {
		if c.DeletedAt != nil || c.TenantID != flt.TenantID {
			continue
		}
		if flt.Source != "" && string(c.Source) != flt.Source {
			continue
		}
		if q := strings.TrimSpace(strings.ToLower(flt.Search)); q != "" {
			hay := strings.ToLower(c.FirstName + " " + c.LastName + " " + c.Email)
			if !strings.Contains(hay, q) {
				continue
			}
		}
		cp := *c
		all = append(all, &cp)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	total := len(all)
	start := (flt.Page - 1) * flt.Limit
	if start >= total {
		return []*domain.Candidate{}, total, nil
	}
	end := start + flt.Limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

func (f *FakeCandidateRepo) Search(_ context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Candidate, error) {
	if limit <= 0 {
		limit = 20
	}
	q = strings.ToLower(strings.TrimSpace(q))
	if q == "" {
		return []*domain.Candidate{}, nil
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Candidate{}
	for _, c := range f.byID {
		if c.DeletedAt != nil || c.TenantID != tenantID {
			continue
		}
		hay := strings.ToLower(c.FirstName + " " + c.LastName + " " + c.Email)
		if strings.Contains(hay, q) {
			cp := *c
			out = append(out, &cp)
		}
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (f *FakeCandidateRepo) Dedupe(_ context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, c := range f.byID {
		if c.DeletedAt == nil && c.TenantID == tenantID && strings.EqualFold(c.Email, email) {
			cp := *c
			return &cp, nil
		}
	}
	return nil, nil
}

// ---- FakeApplicationRepo ----

// FakeApplicationRepo is an in-memory ApplicationRepository for tests.
type FakeApplicationRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Application
}

// NewFakeApplicationRepo creates an empty fake application repo.
func NewFakeApplicationRepo() *FakeApplicationRepo {
	return &FakeApplicationRepo{byID: map[uuid.UUID]*domain.Application{}}
}

func (f *FakeApplicationRepo) Create(_ context.Context, a *domain.Application) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	// Check duplicate application.
	for _, existing := range f.byID {
		if existing.TenantID == a.TenantID &&
			existing.CandidateID == a.CandidateID &&
			existing.RequisitionID == a.RequisitionID {
			return domain.ErrDuplicateApplication
		}
	}
	now := time.Now().UTC()
	if a.AppliedAt.IsZero() {
		a.AppliedAt = now
	}
	if a.StageEnteredAt.IsZero() {
		a.StageEnteredAt = now
	}
	a.UpdatedAt = now
	if a.CurrentStage == "" {
		a.CurrentStage = domain.StageApplied
	}
	cp := *a
	f.byID[a.ID] = &cp
	return nil
}

func (f *FakeApplicationRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Application, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok || a.TenantID != tenantID {
		return nil, domain.ErrApplicationNotFound
	}
	cp := *a
	return &cp, nil
}

func (f *FakeApplicationRepo) GetByCandidateRequisition(_ context.Context, candidateID, requisitionID uuid.UUID) (*domain.Application, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, a := range f.byID {
		if a.CandidateID == candidateID && a.RequisitionID == requisitionID {
			cp := *a
			return &cp, nil
		}
	}
	return nil, domain.ErrApplicationNotFound
}

func (f *FakeApplicationRepo) Update(_ context.Context, a *domain.Application) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[a.ID]; !ok {
		return domain.ErrApplicationNotFound
	}
	a.UpdatedAt = time.Now().UTC()
	cp := *a
	f.byID[a.ID] = &cp
	return nil
}

func (f *FakeApplicationRepo) UpdateStage(_ context.Context, id uuid.UUID, stage domain.Stage, rejectionReason *string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return domain.ErrApplicationNotFound
	}
	a.CurrentStage = stage
	a.StageEnteredAt = time.Now().UTC()
	a.UpdatedAt = a.StageEnteredAt
	a.RejectionReason = rejectionReason
	return nil
}

func (f *FakeApplicationRepo) UpdateScore(_ context.Context, id uuid.UUID, score float64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.byID[id]
	if !ok {
		return domain.ErrApplicationNotFound
	}
	a.Score = &score
	a.UpdatedAt = time.Now().UTC()
	return nil
}

func (f *FakeApplicationRepo) List(_ context.Context, flt ApplicationFilter) ([]*domain.Application, int, error) {
	if flt.Limit <= 0 {
		flt.Limit = 50
	}
	if flt.Page <= 0 {
		flt.Page = 1
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	all := []*domain.Application{}
	for _, a := range f.byID {
		if a.TenantID != flt.TenantID {
			continue
		}
		if flt.RequisitionID != nil && a.RequisitionID != *flt.RequisitionID {
			continue
		}
		if flt.CandidateID != nil && a.CandidateID != *flt.CandidateID {
			continue
		}
		if flt.Stage != "" && string(a.CurrentStage) != flt.Stage {
			continue
		}
		cp := *a
		all = append(all, &cp)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].AppliedAt.After(all[j].AppliedAt)
	})
	total := len(all)
	start := (flt.Page - 1) * flt.Limit
	if start >= total {
		return []*domain.Application{}, total, nil
	}
	end := start + flt.Limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

func (f *FakeApplicationRepo) ListByRequisition(_ context.Context, reqID uuid.UUID, stage *domain.Stage) ([]*domain.Application, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Application{}
	for _, a := range f.byID {
		if a.RequisitionID != reqID {
			continue
		}
		if stage != nil && a.CurrentStage != *stage {
			continue
		}
		cp := *a
		out = append(out, &cp)
	}
	return out, nil
}

func (f *FakeApplicationRepo) ListByCandidate(_ context.Context, candidateID uuid.UUID) ([]*domain.Application, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Application{}
	for _, a := range f.byID {
		if a.CandidateID == candidateID {
			cp := *a
			out = append(out, &cp)
		}
	}
	return out, nil
}

func (f *FakeApplicationRepo) CountByStage(_ context.Context, reqID uuid.UUID) (map[domain.Stage]int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := map[domain.Stage]int{}
	for _, a := range f.byID {
		if a.RequisitionID == reqID {
			out[a.CurrentStage]++
		}
	}
	return out, nil
}

func (f *FakeApplicationRepo) GetTimeInStageStats(_ context.Context, _ uuid.UUID) ([]StageTimeStat, error) {
	return []StageTimeStat{}, nil
}

// ---- FakeEventRepo ----

// FakeEventRepo is an in-memory EventRepository for tests.
type FakeEventRepo struct {
	mu     sync.Mutex
	events []*domain.ApplicationEvent
}

// NewFakeEventRepo creates an empty fake event repo.
func NewFakeEventRepo() *FakeEventRepo {
	return &FakeEventRepo{events: []*domain.ApplicationEvent{}}
}

func (f *FakeEventRepo) Append(_ context.Context, evt *domain.ApplicationEvent) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if evt.ID == uuid.Nil {
		evt.ID = uuid.New()
	}
	if evt.CreatedAt.IsZero() {
		evt.CreatedAt = time.Now().UTC()
	}
	if len(evt.Payload) == 0 {
		evt.Payload = domain.JSONB("{}")
	}
	cp := *evt
	f.events = append(f.events, &cp)
	return nil
}

func (f *FakeEventRepo) ListByApplication(_ context.Context, applicationID uuid.UUID) ([]*domain.ApplicationEvent, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.ApplicationEvent{}
	for _, e := range f.events {
		if e.ApplicationID == applicationID {
			cp := *e
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

// ---- FakeInterviewRepo ----

// FakeInterviewRepo is an in-memory InterviewRepository for tests.
type FakeInterviewRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Interview
}

// NewFakeInterviewRepo creates an empty fake interview repo.
func NewFakeInterviewRepo() *FakeInterviewRepo {
	return &FakeInterviewRepo{byID: map[uuid.UUID]*domain.Interview{}}
}

func (f *FakeInterviewRepo) Create(_ context.Context, i *domain.Interview) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	i.ApplyDefaults()
	now := time.Now().UTC()
	if i.CreatedAt.IsZero() {
		i.CreatedAt = now
	}
	i.UpdatedAt = now
	cp := *i
	f.byID[i.ID] = &cp
	return nil
}

func (f *FakeInterviewRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Interview, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	i, ok := f.byID[id]
	if !ok || i.TenantID != tenantID {
		return nil, domain.ErrInterviewNotFound
	}
	cp := *i
	return &cp, nil
}

func (f *FakeInterviewRepo) Update(_ context.Context, i *domain.Interview) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[i.ID]; !ok {
		return domain.ErrInterviewNotFound
	}
	i.UpdatedAt = time.Now().UTC()
	cp := *i
	f.byID[i.ID] = &cp
	return nil
}

func (f *FakeInterviewRepo) ListByApplication(_ context.Context, applicationID uuid.UUID) ([]*domain.Interview, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Interview{}
	for _, i := range f.byID {
		if i.ApplicationID == applicationID {
			cp := *i
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(a, b int) bool {
		return out[a].ScheduledAt.Before(out[b].ScheduledAt)
	})
	return out, nil
}

func (f *FakeInterviewRepo) ListForInterviewer(_ context.Context, tenantID, interviewerID uuid.UUID, from, to time.Time) ([]*domain.Interview, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Interview{}
	iid := interviewerID.String()
	for _, i := range f.byID {
		if i.TenantID != tenantID {
			continue
		}
		if i.ScheduledAt.Before(from) || i.ScheduledAt.After(to) {
			continue
		}
		found := false
		for _, s := range i.InterviewerIDs {
			if s == iid {
				found = true
				break
			}
		}
		if !found {
			continue
		}
		cp := *i
		out = append(out, &cp)
	}
	return out, nil
}

// ---- FakeOfferRepo ----

// FakeOfferRepo is an in-memory OfferRepository for tests.
type FakeOfferRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Offer
}

// NewFakeOfferRepo creates an empty fake offer repo.
func NewFakeOfferRepo() *FakeOfferRepo {
	return &FakeOfferRepo{byID: map[uuid.UUID]*domain.Offer{}}
}

func (f *FakeOfferRepo) Create(_ context.Context, o *domain.Offer) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	o.ApplyDefaults()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	cp := *o
	f.byID[o.ID] = &cp
	return nil
}

func (f *FakeOfferRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Offer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	o, ok := f.byID[id]
	if !ok || o.TenantID != tenantID {
		return nil, domain.ErrOfferNotFound
	}
	cp := *o
	return &cp, nil
}

func (f *FakeOfferRepo) Update(_ context.Context, o *domain.Offer) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[o.ID]; !ok {
		return domain.ErrOfferNotFound
	}
	cp := *o
	f.byID[o.ID] = &cp
	return nil
}

func (f *FakeOfferRepo) ListByApplication(_ context.Context, applicationID uuid.UUID) ([]*domain.Offer, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Offer{}
	for _, o := range f.byID {
		if o.ApplicationID == applicationID {
			cp := *o
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out, nil
}

func (f *FakeOfferRepo) ExpireOverdue(_ context.Context) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	now := time.Now().UTC()
	for _, o := range f.byID {
		if o.Status == domain.OfferSent && o.ExpiryDate.Before(now) {
			o.Status = domain.OfferExpired
			o.RespondedAt = &now
			n++
		}
	}
	return n, nil
}

// ---- FakeStageRepo ----

// FakeStageRepo is an in-memory StageRepository for tests.
type FakeStageRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.PipelineStage
}

// NewFakeStageRepo creates an empty fake stage repo.
func NewFakeStageRepo() *FakeStageRepo {
	return &FakeStageRepo{byID: map[uuid.UUID]*domain.PipelineStage{}}
}

func (f *FakeStageRepo) Create(_ context.Context, s *domain.PipelineStage) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	cp := *s
	f.byID[s.ID] = &cp
	return nil
}

func (f *FakeStageRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.PipelineStage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.byID[id]
	if !ok || s.TenantID != tenantID {
		return nil, domain.ErrStageNotFound
	}
	cp := *s
	return &cp, nil
}

func (f *FakeStageRepo) Update(_ context.Context, s *domain.PipelineStage) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	existing, ok := f.byID[s.ID]
	if !ok {
		return domain.ErrStageNotFound
	}
	if existing.IsSystem {
		return domain.ErrStageNotFound // cannot update system stages
	}
	cp := *s
	f.byID[s.ID] = &cp
	return nil
}

func (f *FakeStageRepo) ListByTenant(_ context.Context, tenantID uuid.UUID) ([]*domain.PipelineStage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.PipelineStage{}
	for _, s := range f.byID {
		if s.TenantID == tenantID {
			cp := *s
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].OrderIndex < out[j].OrderIndex
	})
	return out, nil
}

func (f *FakeStageRepo) Reorder(_ context.Context, tenantID uuid.UUID, order []uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i, id := range order {
		if s, ok := f.byID[id]; ok && s.TenantID == tenantID {
			s.OrderIndex = i
		}
	}
	return nil
}

func (f *FakeStageRepo) SeedDefaults(_ context.Context, tenantID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	// Check if already seeded.
	for _, s := range f.byID {
		if s.TenantID == tenantID {
			return nil
		}
	}
	for _, ss := range domain.SystemStages {
		s := &domain.PipelineStage{
			ID:         uuid.New(),
			TenantID:   tenantID,
			Name:       ss.Name,
			OrderIndex: ss.Order,
			IsSystem:   true,
			IsTerminal: ss.IsTerminal,
		}
		f.byID[s.ID] = s
	}
	return nil
}

// ---- helper for tests ----

// MustMarshalJSON marshals v to a JSON byte slice, panicking on error.
func MustMarshalJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}
