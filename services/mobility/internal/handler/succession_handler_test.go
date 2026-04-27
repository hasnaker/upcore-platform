package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
	"github.com/upcore/mobility/internal/middleware"
	"github.com/upcore/mobility/internal/repository"
	"github.com/upcore/mobility/internal/service"
)

// ----------------------------------------------------------------------------
// In-memory fake repository that satisfies service.SuccessionRepository.
// ----------------------------------------------------------------------------

type fakeSuccessionRepo struct {
	mu             sync.Mutex
	plans          map[uuid.UUID]*domain.SuccessionPlan
	candidates     map[uuid.UUID]*domain.SuccessionCandidate
	criticalItems  []repository.CriticalPositionRow
	addCandidateCh chan *domain.SuccessionCandidate
}

func newFakeRepo() *fakeSuccessionRepo {
	return &fakeSuccessionRepo{
		plans:      map[uuid.UUID]*domain.SuccessionPlan{},
		candidates: map[uuid.UUID]*domain.SuccessionCandidate{},
	}
}

func (f *fakeSuccessionRepo) UpsertPlan(_ context.Context, p *domain.SuccessionPlan) (*domain.SuccessionPlan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	f.plans[p.ID] = p
	return p, nil
}

func (f *fakeSuccessionRepo) ListPlans(_ context.Context, tenantID uuid.UUID) ([]domain.SuccessionPlan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []domain.SuccessionPlan{}
	for _, p := range f.plans {
		if p.TenantID == tenantID {
			out = append(out, *p)
		}
	}
	return out, nil
}

func (f *fakeSuccessionRepo) GetPlanByID(_ context.Context, tenantID, planID uuid.UUID) (*domain.SuccessionPlan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.plans[planID]
	if !ok || p.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (f *fakeSuccessionRepo) CandidatesForPlan(_ context.Context, planID uuid.UUID) ([]domain.SuccessionCandidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []domain.SuccessionCandidate{}
	for _, c := range f.candidates {
		if c.PlanID == planID {
			out = append(out, *c)
		}
	}
	return out, nil
}

func (f *fakeSuccessionRepo) AddCandidate(_ context.Context, c *domain.SuccessionCandidate) (*domain.SuccessionCandidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	// Simulate (plan_id, candidate_employee_id) uniqueness.
	for _, ex := range f.candidates {
		if ex.PlanID == c.PlanID && ex.CandidateEmployeeID == c.CandidateEmployeeID {
			return nil, errorsFromDB("duplicate key value violates unique constraint on succession_candidates")
		}
	}
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	f.candidates[c.ID] = c
	return c, nil
}

func (f *fakeSuccessionRepo) CandidateCount(_ context.Context, planID uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, c := range f.candidates {
		if c.PlanID == planID {
			n++
		}
	}
	return n, nil
}

func (f *fakeSuccessionRepo) CandidateDistinctPlanCount(_ context.Context, tenantID, empID uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	seen := map[uuid.UUID]struct{}{}
	for _, c := range f.candidates {
		if c.CandidateEmployeeID != empID {
			continue
		}
		p, ok := f.plans[c.PlanID]
		if !ok || p.TenantID != tenantID {
			continue
		}
		seen[c.PlanID] = struct{}{}
	}
	return len(seen), nil
}

func (f *fakeSuccessionRepo) UpdateCandidateReadiness(_ context.Context, id uuid.UUID, readiness string, fitScore *float64, gapsTR *string, rank *int) (*domain.SuccessionCandidate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.candidates[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	c.Readiness = readiness
	if fitScore != nil {
		c.FitScore = *fitScore
	}
	if gapsTR != nil {
		c.GapsTR = *gapsTR
	}
	if rank != nil {
		c.Rank = *rank
	}
	cp := *c
	return &cp, nil
}

func (f *fakeSuccessionRepo) RemoveCandidate(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.candidates[id]
	if !ok {
		return domain.ErrNotFound
	}
	p, ok := f.plans[c.PlanID]
	if !ok || p.TenantID != tenantID {
		return domain.ErrNotFound
	}
	delete(f.candidates, id)
	return nil
}

func (f *fakeSuccessionRepo) ListCriticalPositions(_ context.Context, tenantID uuid.UUID) ([]repository.CriticalPositionRow, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_ = tenantID
	return f.criticalItems, nil
}

// dbErr mimics a pgx/sqlx error wrapper so handler mapping fires.
type dbErr struct{ s string }

func (e *dbErr) Error() string { return e.s }

func errorsFromDB(s string) error { return &dbErr{s: s} }

// ----------------------------------------------------------------------------
// Test setup.
// ----------------------------------------------------------------------------

func setupSuccessionRouter(t *testing.T, repo *fakeSuccessionRepo, poolMax int, tenantID uuid.UUID) http.Handler {
	t.Helper()
	svc := service.NewSuccessionService(repo, poolMax, zerolog.Nop())
	h := NewSuccessionHandler(svc, zerolog.Nop())

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := context.WithValue(req.Context(), domain.CtxTenantID, tenantID)
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	r.Route("/api/v1/mobility/succession-plans", func(r chi.Router) {
		r.Post("/", h.UpsertPlan)
		r.Get("/", h.ListPlans)
		r.Get("/critical", h.ListCriticalPositions)
		r.Get("/{planId}", h.GetPlan)
		r.Get("/{planId}/candidates", h.Candidates)
		r.Post("/{planId}/candidates", h.AddCandidate)
		r.Patch("/{planId}/candidates/{candidateId}", h.UpdateReadiness)
		r.Delete("/{planId}/candidates/{candidateId}", h.RemoveCandidate)
	})

	// sanity: middleware symbol kept to avoid unused import.
	_ = middleware.TenantID
	return r
}

func doJSON(t *testing.T, router http.Handler, method, url string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// ----------------------------------------------------------------------------
// Tests.
// ----------------------------------------------------------------------------

func TestSuccession_AddCandidate_Succeeds(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID, PositionID: uuid.New()}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	empID := uuid.New()
	w := doJSON(t, router, http.MethodPost, "/api/v1/mobility/succession-plans/"+planID.String()+"/candidates", map[string]any{
		"candidate_employee_id": empID.String(),
		"readiness":             "ready_1y",
		"fit_score":             82.5,
		"rank":                  1,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("status: want 201, got %d — body=%s", w.Code, w.Body.String())
	}
	var out domain.SuccessionCandidate
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.CandidateEmployeeID != empID {
		t.Errorf("employee id mismatch: %v", out.CandidateEmployeeID)
	}
	if out.Readiness != "ready_1y" {
		t.Errorf("readiness: %v", out.Readiness)
	}
}

func TestSuccession_AddCandidate_RejectsInvalidReadiness(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID, PositionID: uuid.New()}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodPost, "/api/v1/mobility/succession-plans/"+planID.String()+"/candidates", map[string]any{
		"candidate_employee_id": uuid.New().String(),
		"readiness":             "in_5_years",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "invalid_readiness") {
		t.Errorf("expected invalid_readiness code, got: %s", w.Body.String())
	}
}

func TestSuccession_AddCandidate_PoolFull(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	// pre-seed 2 candidates — poolMax = 2
	repo.candidates[uuid.New()] = &domain.SuccessionCandidate{ID: uuid.New(), PlanID: planID, CandidateEmployeeID: uuid.New(), Readiness: "ready_1y"}
	repo.candidates[uuid.New()] = &domain.SuccessionCandidate{ID: uuid.New(), PlanID: planID, CandidateEmployeeID: uuid.New(), Readiness: "ready_1y"}

	router := setupSuccessionRouter(t, repo, 2, tenantID)

	w := doJSON(t, router, http.MethodPost, "/api/v1/mobility/succession-plans/"+planID.String()+"/candidates", map[string]any{
		"candidate_employee_id": uuid.New().String(),
		"readiness":             "ready_now",
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("want 409, got %d — body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "pool_full") {
		t.Errorf("want pool_full, got %s", w.Body.String())
	}
}

func TestSuccession_AddCandidate_EnforcesMax3PoolsPerCandidate(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	empID := uuid.New()

	// 3 existing plans, candidate already a candidate on all 3.
	plan1, plan2, plan3, plan4 := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	for _, pid := range []uuid.UUID{plan1, plan2, plan3, plan4} {
		repo.plans[pid] = &domain.SuccessionPlan{ID: pid, TenantID: tenantID, PositionID: uuid.New()}
	}
	for _, pid := range []uuid.UUID{plan1, plan2, plan3} {
		cid := uuid.New()
		repo.candidates[cid] = &domain.SuccessionCandidate{ID: cid, PlanID: pid, CandidateEmployeeID: empID, Readiness: "ready_1y"}
	}

	router := setupSuccessionRouter(t, repo, 10, tenantID)

	// Attempt to add to a 4th plan → should fail with max_pools_per_candidate.
	w := doJSON(t, router, http.MethodPost, "/api/v1/mobility/succession-plans/"+plan4.String()+"/candidates", map[string]any{
		"candidate_employee_id": empID.String(),
		"readiness":             "ready_1y",
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("want 409, got %d — body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "max_pools_per_candidate") {
		t.Errorf("want max_pools_per_candidate, got %s", w.Body.String())
	}
}

func TestSuccession_UpdateReadiness(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	cid := uuid.New()
	repo.candidates[cid] = &domain.SuccessionCandidate{ID: cid, PlanID: planID, CandidateEmployeeID: uuid.New(), Readiness: "ready_2y"}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodPatch,
		"/api/v1/mobility/succession-plans/"+planID.String()+"/candidates/"+cid.String(),
		map[string]any{"readiness": "ready_now", "fit_score": 91.0})
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d — body=%s", w.Code, w.Body.String())
	}
	if repo.candidates[cid].Readiness != "ready_now" {
		t.Errorf("readiness not updated, got %s", repo.candidates[cid].Readiness)
	}
	if repo.candidates[cid].FitScore != 91.0 {
		t.Errorf("fit_score not updated, got %v", repo.candidates[cid].FitScore)
	}
}

func TestSuccession_UpdateReadiness_RejectsBadValue(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID, cid := uuid.New(), uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	repo.candidates[cid] = &domain.SuccessionCandidate{ID: cid, PlanID: planID}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodPatch,
		"/api/v1/mobility/succession-plans/"+planID.String()+"/candidates/"+cid.String(),
		map[string]any{"readiness": "SOMEDAY"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", w.Code)
	}
}

func TestSuccession_RemoveCandidate(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID, cid := uuid.New(), uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	repo.candidates[cid] = &domain.SuccessionCandidate{ID: cid, PlanID: planID, CandidateEmployeeID: uuid.New()}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodDelete,
		"/api/v1/mobility/succession-plans/"+planID.String()+"/candidates/"+cid.String(), nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("want 204, got %d — body=%s", w.Code, w.Body.String())
	}
	if _, ok := repo.candidates[cid]; ok {
		t.Errorf("candidate not removed")
	}
}

func TestSuccession_RemoveCandidate_NotFound(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodDelete,
		"/api/v1/mobility/succession-plans/"+planID.String()+"/candidates/"+uuid.New().String(), nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", w.Code)
	}
}

func TestSuccession_ListCandidates(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	// 2 candidates
	for i := 0; i < 2; i++ {
		cid := uuid.New()
		repo.candidates[cid] = &domain.SuccessionCandidate{ID: cid, PlanID: planID, CandidateEmployeeID: uuid.New(), Readiness: "ready_1y"}
	}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/mobility/succession-plans/"+planID.String()+"/candidates", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	var body struct {
		Candidates []domain.SuccessionCandidate `json:"candidates"`
		Total      int                          `json:"total"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	if body.Total != 2 || len(body.Candidates) != 2 {
		t.Errorf("want 2 candidates, got %+v", body)
	}
}

func TestSuccession_AddCandidate_DuplicateFails(t *testing.T) {
	tenantID := uuid.New()
	repo := newFakeRepo()
	planID := uuid.New()
	repo.plans[planID] = &domain.SuccessionPlan{ID: planID, TenantID: tenantID}
	empID := uuid.New()
	// Pre-existing candidate on the same plan with the same employee.
	pre := uuid.New()
	repo.candidates[pre] = &domain.SuccessionCandidate{ID: pre, PlanID: planID, CandidateEmployeeID: empID, Readiness: "ready_1y"}

	router := setupSuccessionRouter(t, repo, 5, tenantID)

	w := doJSON(t, router, http.MethodPost, "/api/v1/mobility/succession-plans/"+planID.String()+"/candidates", map[string]any{
		"candidate_employee_id": empID.String(),
		"readiness":             "ready_1y",
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("want 409, got %d — body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "duplicate_candidate") {
		t.Errorf("want duplicate_candidate, got %s", w.Body.String())
	}
}
