package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/service"
)

// ============================================================================
// Shared fake repo copy (to keep handler tests DB-free).
// ============================================================================

type fakeRepo struct {
	camps map[uuid.UUID]*domain.Survey360Campaign
	invs  map[uuid.UUID]*domain.Survey360Invitation
	resps map[uuid.UUID][]domain.Survey360Response
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		camps: map[uuid.UUID]*domain.Survey360Campaign{},
		invs:  map[uuid.UUID]*domain.Survey360Invitation{},
		resps: map[uuid.UUID][]domain.Survey360Response{},
	}
}

func (r *fakeRepo) CreateCampaign(_ context.Context, c *domain.Survey360Campaign) error {
	r.camps[c.ID] = c
	return nil
}
func (r *fakeRepo) UpdateCampaignStatus(_ context.Context, tid, id uuid.UUID, s domain.CampaignStatus) error {
	c, ok := r.camps[id]
	if !ok || c.TenantID != tid {
		return domain.ErrNotFound
	}
	c.Status = s
	now := time.Now().UTC()
	switch s {
	case domain.CampDistributed:
		c.DistributedAt = &now
	case domain.CampComplete:
		c.CompletedAt = &now
	}
	return nil
}
func (r *fakeRepo) GetCampaign(_ context.Context, tid, id uuid.UUID) (*domain.Survey360Campaign, error) {
	c, ok := r.camps[id]
	if !ok || c.TenantID != tid {
		return nil, domain.ErrNotFound
	}
	clone := *c
	return &clone, nil
}
func (r *fakeRepo) ListCampaignsBySubject(_ context.Context, tid, subj uuid.UUID) ([]*domain.Survey360Campaign, error) {
	out := []*domain.Survey360Campaign{}
	for _, c := range r.camps {
		if c.TenantID != tid {
			continue
		}
		if subj != uuid.Nil && c.SubjectUserID != subj {
			continue
		}
		clone := *c
		out = append(out, &clone)
	}
	return out, nil
}
func (r *fakeRepo) AddInvitation(_ context.Context, inv *domain.Survey360Invitation) error {
	for _, e := range r.invs {
		if e.CampaignID == inv.CampaignID && e.ReviewerUserID == inv.ReviewerUserID {
			return domain.ErrConflict
		}
	}
	r.invs[inv.ID] = inv
	return nil
}
func (r *fakeRepo) GetInvitation(_ context.Context, tid, id uuid.UUID) (*domain.Survey360Invitation, error) {
	inv, ok := r.invs[id]
	if !ok || inv.TenantID != tid {
		return nil, domain.ErrNotFound
	}
	clone := *inv
	return &clone, nil
}
func (r *fakeRepo) ListInvitationsByCampaign(_ context.Context, tid, cid uuid.UUID) ([]*domain.Survey360Invitation, error) {
	out := []*domain.Survey360Invitation{}
	for _, inv := range r.invs {
		if inv.TenantID != tid || inv.CampaignID != cid {
			continue
		}
		clone := *inv
		out = append(out, &clone)
	}
	return out, nil
}
func (r *fakeRepo) ListInvitationsByReviewer(_ context.Context, tid, rev uuid.UUID) ([]*domain.Survey360Invitation, error) {
	out := []*domain.Survey360Invitation{}
	for _, inv := range r.invs {
		if inv.TenantID == tid && inv.ReviewerUserID == rev {
			clone := *inv
			out = append(out, &clone)
		}
	}
	return out, nil
}
func (r *fakeRepo) MarkInvitationResponded(_ context.Context, tid, id uuid.UUID) error {
	inv, ok := r.invs[id]
	if !ok || inv.TenantID != tid {
		return domain.ErrNotFound
	}
	if inv.Status == domain.InvResponded {
		return domain.ErrConflict
	}
	inv.Status = domain.InvResponded
	return nil
}
func (r *fakeRepo) AppendResponses(_ context.Context, tid, invID, cid uuid.UUID, items []domain.Survey360Response) error {
	for _, it := range items {
		for _, e := range r.resps[invID] {
			if e.CompetencyCode == it.CompetencyCode {
				return domain.ErrConflict
			}
		}
	}
	r.resps[invID] = append(r.resps[invID], items...)
	return nil
}
func (r *fakeRepo) ListResponsesByCampaign(_ context.Context, tid, cid uuid.UUID) ([]*domain.Survey360Response, map[uuid.UUID]domain.Relation, error) {
	out := []*domain.Survey360Response{}
	relMap := map[uuid.UUID]domain.Relation{}
	for invID, items := range r.resps {
		inv, ok := r.invs[invID]
		if !ok || inv.CampaignID != cid {
			continue
		}
		for i := range items {
			clone := items[i]
			out = append(out, &clone)
		}
	}
	for _, inv := range r.invs {
		if inv.TenantID == tid && inv.CampaignID == cid {
			relMap[inv.ID] = inv.Relation
		}
	}
	return out, relMap, nil
}

// ============================================================================
// Test server helpers
// ============================================================================

func buildTestServer() (*chi.Mux, *fakeRepo) {
	repo := newFakeRepo()
	svc := service.NewSurvey360Service(repo, zerolog.Nop())
	h := NewSurvey360Handler(svc)
	r := chi.NewRouter()
	r.Use(middleware.TenantInjector)
	r.Route("/surveys/360", func(r chi.Router) { h.Register(r) })
	return r, repo
}

func makeReq(t *testing.T, method, path string, body any, tenantID, userID uuid.UUID) *http.Request {
	t.Helper()
	var rdr *bytes.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		rdr = bytes.NewReader(raw)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Content-Type", "application/json")
	if tenantID != uuid.Nil {
		req.Header.Set("X-Tenant-ID", tenantID.String())
	}
	if userID != uuid.Nil {
		req.Header.Set("X-User-ID", userID.String())
	}
	return req
}

func decode[T any](t *testing.T, body *bytes.Buffer) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(body.Bytes(), &v); err != nil {
		t.Fatalf("decode: %v — body: %s", err, body.String())
	}
	return v
}

// ============================================================================
// Tests
// ============================================================================

func TestHandler_CreateCampaign_RequiresAuth(t *testing.T) {
	r, _ := buildTestServer()
	// No tenant/user headers.
	req := makeReq(t, "POST", "/surveys/360/campaigns", map[string]any{}, uuid.Nil, uuid.Nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestHandler_CreateCampaign_Valid(t *testing.T) {
	r, _ := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	subj := uuid.New()
	req := makeReq(t, "POST", "/surveys/360/campaigns", map[string]any{
		"cycle_id":        uuid.New(),
		"subject_user_id": subj,
		"anonymity_mode":  "anonymous",
		"due_date":        time.Now().Add(14 * 24 * time.Hour).Format("2006-01-02"),
	}, tid, actor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d body=%s", w.Code, w.Body.String())
	}
	camp := decode[domain.Survey360Campaign](t, w.Body)
	if camp.SubjectUserID != subj {
		t.Errorf("subject mismatch")
	}
}

func TestHandler_CreateCampaign_InvalidDate(t *testing.T) {
	r, _ := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	req := makeReq(t, "POST", "/surveys/360/campaigns", map[string]any{
		"cycle_id":        uuid.New(),
		"subject_user_id": uuid.New(),
		"anonymity_mode":  "anonymous",
		"due_date":        "not-a-date",
	}, tid, actor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422, got %d", w.Code)
	}
}

func TestHandler_ListCampaigns_Empty(t *testing.T) {
	r, _ := buildTestServer()
	tid := uuid.New()
	req := makeReq(t, "GET", "/surveys/360/campaigns?subject_user_id="+uuid.New().String(), nil, tid, uuid.New())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"items"`) {
		t.Errorf("expected items key")
	}
}

func TestHandler_AddInvitation_BadUUID(t *testing.T) {
	r, _ := buildTestServer()
	req := makeReq(t, "POST", "/surveys/360/campaigns/not-uuid/invitations", map[string]any{}, uuid.New(), uuid.New())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestHandler_AddInvitation_RejectsSelfAsPeer(t *testing.T) {
	r, repo := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	subj := uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: subj, CreatedBy: actor,
		DueDate: time.Now().Add(7 * 24 * time.Hour),
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp

	req := makeReq(t, "POST", "/surveys/360/campaigns/"+camp.ID.String()+"/invitations", map[string]any{
		"reviewer_user_id": subj,
		"relation":         "peer",
	}, tid, actor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422, got %d", w.Code)
	}
}

func TestHandler_DistributeFailsWithoutPeers(t *testing.T) {
	r, repo := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: uuid.New(), CreatedBy: actor,
		DueDate: time.Now().Add(7 * 24 * time.Hour),
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp

	req := makeReq(t, "POST", "/surveys/360/campaigns/"+camp.ID.String()+"/distribute", nil, tid, actor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422 (min peers/manager), got %d body=%s", w.Code, w.Body.String())
	}
}

func TestHandler_DistributeOk(t *testing.T) {
	r, repo := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: uuid.New(), CreatedBy: actor,
		DueDate: time.Now().Add(7 * 24 * time.Hour),
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp
	// 3 peers + 1 manager.
	for i := 0; i < 3; i++ {
		inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: camp.ID, ReviewerUserID: uuid.New(), Relation: domain.RelPeer}
		inv.ApplyDefaults()
		repo.invs[inv.ID] = inv
	}
	m := &domain.Survey360Invitation{TenantID: tid, CampaignID: camp.ID, ReviewerUserID: uuid.New(), Relation: domain.RelManager}
	m.ApplyDefaults()
	repo.invs[m.ID] = m

	req := makeReq(t, "POST", "/surveys/360/campaigns/"+camp.ID.String()+"/distribute", nil, tid, actor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d body=%s", w.Code, w.Body.String())
	}
}

func TestHandler_ReportLocked(t *testing.T) {
	r, repo := buildTestServer()
	tid := uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: uuid.New(), CreatedBy: uuid.New(),
		DueDate: time.Now().Add(7 * 24 * time.Hour),
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp

	req := makeReq(t, "GET", "/surveys/360/campaigns/"+camp.ID.String()+"/report", nil, tid, uuid.New())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	rep := decode[domain.Survey360Report](t, w.Body)
	if rep.Unlocked {
		t.Errorf("expected locked")
	}
	if rep.LockedReason == "" {
		t.Errorf("expected LockedReason populated")
	}
}

func TestHandler_GetInvitation_RejectsWrongReviewer(t *testing.T) {
	r, repo := buildTestServer()
	tid := uuid.New()
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: uuid.New(), ReviewerUserID: uuid.New(), Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	req := makeReq(t, "GET", "/surveys/360/invitations/"+inv.ID.String(), nil, tid, uuid.New() /* not the reviewer */)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", w.Code)
	}
}

func TestHandler_SubmitResponse_IdempotentRejection(t *testing.T) {
	r, repo := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	reviewer := uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: uuid.New(), CreatedBy: actor,
		DueDate: time.Now().Add(7 * 24 * time.Hour),
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: camp.ID, ReviewerUserID: reviewer, Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	submit := func() *httptest.ResponseRecorder {
		req := makeReq(t, "POST", "/surveys/360/invitations/"+inv.ID.String()+"/responses",
			map[string]any{
				"items": []map[string]any{{"competency_code": "X", "competency_name_tr": "X", "score": 3}},
			}, tid, reviewer)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	if w := submit(); w.Code != http.StatusCreated {
		t.Fatalf("first submit want 201, got %d body=%s", w.Code, w.Body.String())
	}
	if w := submit(); w.Code != http.StatusConflict {
		t.Fatalf("second submit want 409, got %d", w.Code)
	}
}

func TestHandler_SubmitResponse_RejectsUnauthenticated(t *testing.T) {
	r, repo := buildTestServer()
	tid := uuid.New()
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: uuid.New(), ReviewerUserID: uuid.New(), Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	req := makeReq(t, "POST", "/surveys/360/invitations/"+inv.ID.String()+"/responses", map[string]any{
		"items": []map[string]any{{"competency_code": "X", "competency_name_tr": "X", "score": 3}},
	}, tid, uuid.Nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestHandler_SubmitResponse_RejectsWrongReviewer(t *testing.T) {
	r, repo := buildTestServer()
	tid := uuid.New()
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: uuid.New(), ReviewerUserID: uuid.New(), Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	req := makeReq(t, "POST", "/surveys/360/invitations/"+inv.ID.String()+"/responses", map[string]any{
		"items": []map[string]any{{"competency_code": "X", "competency_name_tr": "X", "score": 3}},
	}, tid, uuid.New() /* not the assigned reviewer */)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", w.Code)
	}
}

func TestHandler_ListMyInvitations_RequiresReviewer(t *testing.T) {
	r, _ := buildTestServer()
	req := makeReq(t, "GET", "/surveys/360/invitations", nil, uuid.New(), uuid.Nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestHandler_ListMyInvitations_DefaultsToUser(t *testing.T) {
	r, repo := buildTestServer()
	tid := uuid.New()
	reviewer := uuid.New()
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: uuid.New(), ReviewerUserID: reviewer, Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	req := makeReq(t, "GET", "/surveys/360/invitations", nil, tid, reviewer)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), inv.ID.String()) {
		t.Errorf("expected invitation id in body")
	}
}

func TestHandler_ListInvitationsByCampaign_AnonymousHidesReviewer(t *testing.T) {
	r, repo := buildTestServer()
	tid, actor := uuid.New(), uuid.New()
	camp := &domain.Survey360Campaign{
		TenantID: tid, CycleID: uuid.New(), SubjectUserID: uuid.New(),
		CreatedBy: actor, DueDate: time.Now().Add(7 * 24 * time.Hour),
		AnonymityMode: domain.AnonModeAnonymous,
	}
	camp.ApplyDefaults()
	repo.camps[camp.ID] = camp
	revID := uuid.New()
	inv := &domain.Survey360Invitation{TenantID: tid, CampaignID: camp.ID, ReviewerUserID: revID, Relation: domain.RelPeer}
	inv.ApplyDefaults()
	repo.invs[inv.ID] = inv

	// As unrelated user: reviewer_user_id must NOT appear.
	req := makeReq(t, "GET", "/surveys/360/campaigns/"+camp.ID.String()+"/invitations", nil, tid, uuid.New())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	if strings.Contains(w.Body.String(), revID.String()) {
		t.Fatalf("anonymous mode must not leak reviewer_user_id — body: %s", w.Body.String())
	}

	// As the owner (created_by): reviewer_user_id visible (to manage campaign).
	req2 := makeReq(t, "GET", "/surveys/360/campaigns/"+camp.ID.String()+"/invitations", nil, tid, actor)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w2.Code)
	}
	if !strings.Contains(w2.Body.String(), revID.String()) {
		t.Fatalf("owner should see reviewer ids")
	}
}
