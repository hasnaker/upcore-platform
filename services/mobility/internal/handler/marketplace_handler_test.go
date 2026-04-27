package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/rs/zerolog"

	"github.com/upcore/mobility/internal/domain"
	"github.com/upcore/mobility/internal/repository"
)

// fakeMarketRepo implements repository.MarketplaceRepository for handler tests.
// Only the surface the tests exercise is populated; other methods panic if
// accidentally invoked (keeps the test focused).
type fakeMarketRepo struct {
	opp         *repository.InternalOpportunity
	skills      []string
	getSkillsFn func(empID uuid.UUID) ([]string, error)
	applied     *repository.InternalApplication
	applyInsert bool
	applyErr    error
	apps        []*repository.InternalApplication
	auditCalls  []string
	statusErr   error
	withdrawOK  bool
}

func (f *fakeMarketRepo) CreateOpportunity(_ context.Context, _ *repository.InternalOpportunity) error {
	return nil
}
func (f *fakeMarketRepo) UpdateOpportunityStatus(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}
func (f *fakeMarketRepo) ListOpen(_ context.Context, _ uuid.UUID, _ string) ([]*repository.InternalOpportunity, error) {
	return []*repository.InternalOpportunity{f.opp}, nil
}
func (f *fakeMarketRepo) ListOpenPaged(_ context.Context, _ uuid.UUID, _ string, _ repository.KeysetPage) ([]*repository.InternalOpportunity, error) {
	return []*repository.InternalOpportunity{f.opp}, nil
}
func (f *fakeMarketRepo) GetOpportunity(_ context.Context, _, id uuid.UUID) (*repository.InternalOpportunity, error) {
	if f.opp != nil && f.opp.ID == id {
		return f.opp, nil
	}
	return nil, domain.ErrNotFound
}
func (f *fakeMarketRepo) Apply(_ context.Context, a *repository.InternalApplication) (bool, error) {
	f.applied = a
	return f.applyInsert, f.applyErr
}
func (f *fakeMarketRepo) GetApplication(_ context.Context, _, id uuid.UUID) (*repository.InternalApplication, error) {
	for _, a := range f.apps {
		if a.ID == id {
			return a, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (f *fakeMarketRepo) FindApplicationByEmployee(_ context.Context, _, oppID, empID uuid.UUID) (*repository.InternalApplication, error) {
	for _, a := range f.apps {
		if a.OpportunityID == oppID && a.EmployeeID == empID {
			return a, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (f *fakeMarketRepo) ListApplicationsForOpp(_ context.Context, _, _ uuid.UUID) ([]*repository.InternalApplication, error) {
	return f.apps, nil
}
func (f *fakeMarketRepo) ListApplicationsForEmployee(_ context.Context, _, _ uuid.UUID) ([]*repository.InternalApplication, error) {
	return f.apps, nil
}
func (f *fakeMarketRepo) ListApplicationsForEmployeePaged(_ context.Context, _, _ uuid.UUID, _ repository.KeysetPage) ([]*repository.InternalApplication, error) {
	return f.apps, nil
}
func (f *fakeMarketRepo) UpdateApplicationStatus(_ context.Context, _, id uuid.UUID, status string, _ *string) error {
	if f.statusErr != nil {
		return f.statusErr
	}
	for _, a := range f.apps {
		if a.ID == id {
			a.Status = status
			return nil
		}
	}
	return nil
}
func (f *fakeMarketRepo) WithdrawApplication(_ context.Context, _, _, _ uuid.UUID) (bool, error) {
	return f.withdrawOK, nil
}
func (f *fakeMarketRepo) GetEmployeeSkills(_ context.Context, _, empID uuid.UUID) ([]string, error) {
	if f.getSkillsFn != nil {
		return f.getSkillsFn(empID)
	}
	return f.skills, nil
}
func (f *fakeMarketRepo) UpsertEmbedding(_ context.Context, _ *repository.TalentEmbedding) error {
	return nil
}
func (f *fakeMarketRepo) GetEmbedding(_ context.Context, _, _ uuid.UUID) (*repository.TalentEmbedding, error) {
	return nil, domain.ErrNotFound
}
func (f *fakeMarketRepo) InsertAuditEvent(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _, action, _ string, _ uuid.UUID, _ []byte) error {
	f.auditCalls = append(f.auditCalls, action)
	return nil
}

// newRouterWithContext wires a chi router + request context exactly like the
// production middleware would, so handlers can read tenant/user/role via the
// same helpers.
func newRouterWithContext(tenantID, userID uuid.UUID, role string, mount func(chi.Router)) http.Handler {
	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ctx := req.Context()
			ctx = context.WithValue(ctx, domain.CtxTenantID, tenantID)
			if userID != uuid.Nil {
				ctx = context.WithValue(ctx, domain.CtxUserID, userID)
			}
			if role != "" {
				ctx = context.WithValue(ctx, domain.CtxRole, role)
			}
			next.ServeHTTP(w, req.WithContext(ctx))
		})
	})
	mount(r)
	return r
}

type fitResponse struct {
	Score          float64  `json:"score"`
	MissingSkills  []string `json:"missing_skills"`
	EmployeeSkills []string `json:"employee_skills"`
}

func doFit(t *testing.T, repo *fakeMarketRepo, oppID, empID uuid.UUID) (int, fitResponse) {
	t.Helper()
	h := NewMarketplaceHandler(repo, zerolog.Nop())
	router := newRouterWithContext(uuid.New(), uuid.New(), "hr", func(r chi.Router) {
		h.Register(r)
	})
	req := httptest.NewRequest(http.MethodGet, "/marketplace/opportunities/"+oppID.String()+"/fit/"+empID.String(), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	var out fitResponse
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestFitScore_HighMatch(t *testing.T) {
	oppID, empID := uuid.New(), uuid.New()
	repo := &fakeMarketRepo{
		opp: &repository.InternalOpportunity{
			ID: oppID, TenantID: uuid.New(),
			RequiredSkills:  pq.StringArray{"react", "typescript", "saas"},
			PreferredSkills: pq.StringArray{"tailwind"},
		},
		// Exact superset match: every required + preferred skill is in the
		// employee profile and nothing else dilutes Jaccard.
		skills: []string{"React", "TypeScript", "SaaS", "Tailwind"},
	}
	code, out := doFit(t, repo, oppID, empID)
	if code != http.StatusOK {
		t.Fatalf("status=%d body=%+v", code, out)
	}
	// Perfect coverage: every required + preferred skill present → 1.0.
	if out.Score < 0.99 {
		t.Fatalf("expected perfect coverage score ≈ 1.0, got %.3f", out.Score)
	}
	if len(out.MissingSkills) != 0 {
		t.Fatalf("high match should have no missing skills, got %v", out.MissingSkills)
	}
}

func TestFitScore_MediumMatch(t *testing.T) {
	oppID, empID := uuid.New(), uuid.New()
	repo := &fakeMarketRepo{
		opp: &repository.InternalOpportunity{
			ID: oppID,
			RequiredSkills:  pq.StringArray{"go", "postgres", "kubernetes", "grpc"},
			PreferredSkills: pq.StringArray{"prometheus"},
		},
		skills: []string{"Go", "Postgres"},
	}
	code, out := doFit(t, repo, oppID, empID)
	if code != http.StatusOK {
		t.Fatalf("status=%d", code)
	}
	if out.Score < 0.2 || out.Score > 0.6 {
		t.Fatalf("expected medium score ~0.35, got %.3f", out.Score)
	}
	if len(out.MissingSkills) != 2 {
		t.Fatalf("expected 2 missing (kubernetes,grpc), got %v", out.MissingSkills)
	}
}

func TestFitScore_LowMatch_NoEmbedding(t *testing.T) {
	oppID, empID := uuid.New(), uuid.New()
	repo := &fakeMarketRepo{
		opp: &repository.InternalOpportunity{
			ID: oppID,
			RequiredSkills:  pq.StringArray{"python", "pytorch", "mlops"},
			PreferredSkills: pq.StringArray{"llm", "rag"},
		},
		skills: []string{}, // new hire, no profile
	}
	code, out := doFit(t, repo, oppID, empID)
	if code != http.StatusOK {
		t.Fatalf("status=%d", code)
	}
	if out.Score != 0 {
		t.Fatalf("expected zero match for empty profile, got %.3f", out.Score)
	}
	if len(out.MissingSkills) != 3 {
		t.Fatalf("expected all required to be missing, got %v", out.MissingSkills)
	}
}

func TestApply_DuplicateReturns409(t *testing.T) {
	oppID, empID := uuid.New(), uuid.New()
	existing := &repository.InternalApplication{
		ID: uuid.New(), OpportunityID: oppID, EmployeeID: empID, Status: "applied",
	}
	repo := &fakeMarketRepo{
		opp: &repository.InternalOpportunity{
			ID: oppID, Status: "open",
			RequiredSkills: pq.StringArray{"react"},
		},
		applyInsert: false,
		apps:        []*repository.InternalApplication{existing},
	}
	h := NewMarketplaceHandler(repo, zerolog.Nop())
	router := newRouterWithContext(uuid.New(), empID, "employee", func(r chi.Router) {
		h.Register(r)
	})
	body := `{"employee_id":"` + empID.String() + `","candidate_skills":["react"]}`
	req := httptest.NewRequest(http.MethodPost,
		"/marketplace/opportunities/"+oppID.String()+"/apply",
		strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 conflict, got %d — body=%s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "already_applied") {
		t.Fatalf("expected already_applied code, body=%s", w.Body.String())
	}
}

func TestListApplicationsForOpp_ConfidentialMasking(t *testing.T) {
	oppID := uuid.New()
	empA, empB := uuid.New(), uuid.New()
	appA := &repository.InternalApplication{
		ID: uuid.New(), OpportunityID: oppID, EmployeeID: empA,
		Status: "applied", Confidential: true,
	}
	appB := &repository.InternalApplication{
		ID: uuid.New(), OpportunityID: oppID, EmployeeID: empB,
		Status: "interview", Confidential: true,
	}
	repo := &fakeMarketRepo{
		opp:  &repository.InternalOpportunity{ID: oppID},
		apps: []*repository.InternalApplication{appA, appB},
	}
	h := NewMarketplaceHandler(repo, zerolog.Nop())
	router := newRouterWithContext(uuid.New(), uuid.New(), "hr", func(r chi.Router) {
		h.Register(r)
	})
	req := httptest.NewRequest(http.MethodGet,
		"/marketplace/opportunities/"+oppID.String()+"/applications", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	var body struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(body.Items) != 2 {
		t.Fatalf("expected 2 items got %d", len(body.Items))
	}
	// applied+confidential → masked
	if body.Items[0]["employee_id"] != nil {
		t.Errorf("confidential pre-interview should hide employee_id, got %v", body.Items[0]["employee_id"])
	}
	alias, _ := body.Items[0]["applicant_alias"].(string)
	if !strings.HasPrefix(alias, "Gizli aday #") {
		t.Errorf("expected Gizli aday alias, got %q", alias)
	}
	// interview → revealed
	if body.Items[1]["employee_id"] == nil {
		t.Errorf("interview status should reveal employee_id")
	}
}
