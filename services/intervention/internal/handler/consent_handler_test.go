package handler_test

import (
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

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/handler"
	"github.com/upcore/intervention/internal/middleware"
	"github.com/upcore/intervention/internal/service"
)

// -------------------- local test doubles (mirrored from service pkg) --------------------

type hfakeConsentRepo struct {
	logs []*domain.ConsentLog
}

func (f *hfakeConsentRepo) Create(_ context.Context, c *domain.ConsentLog) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	cp := *c
	f.logs = append(f.logs, &cp)
	return nil
}
func (f *hfakeConsentRepo) ListByEmployee(_ context.Context, tid, eid uuid.UUID) ([]*domain.ConsentLog, error) {
	out := []*domain.ConsentLog{}
	for _, l := range f.logs {
		if l.TenantID == tid && l.EmployeeID == eid {
			out = append(out, l)
		}
	}
	return out, nil
}
func (f *hfakeConsentRepo) ListByAssignment(_ context.Context, tid, aid uuid.UUID) ([]*domain.ConsentLog, error) {
	out := []*domain.ConsentLog{}
	for _, l := range f.logs {
		if l.TenantID == tid && l.AssignmentID == aid {
			out = append(out, l)
		}
	}
	return out, nil
}
func (f *hfakeConsentRepo) LatestByAssignment(_ context.Context, _, _ uuid.UUID) (*domain.ConsentLog, error) {
	if len(f.logs) == 0 {
		return nil, domain.ErrNotFound
	}
	return f.logs[len(f.logs)-1], nil
}

type hfakeAssignRepo struct {
	items map[uuid.UUID]*domain.Assignment
}

func newHFakeAssignRepo() *hfakeAssignRepo {
	return &hfakeAssignRepo{items: map[uuid.UUID]*domain.Assignment{}}
}
func (r *hfakeAssignRepo) Create(_ context.Context, a *domain.Assignment) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	if a.AssignedAt.IsZero() {
		a.AssignedAt = time.Now().UTC()
	}
	cp := *a
	r.items[a.ID] = &cp
	return nil
}
func (r *hfakeAssignRepo) GetByID(_ context.Context, tid, id uuid.UUID) (*domain.Assignment, error) {
	a, ok := r.items[id]
	if !ok || a.TenantID != tid {
		return nil, domain.ErrAssignmentNotFound
	}
	cp := *a
	return &cp, nil
}
func (r *hfakeAssignRepo) Update(_ context.Context, a *domain.Assignment) error {
	_, ok := r.items[a.ID]
	if !ok {
		return domain.ErrAssignmentNotFound
	}
	cp := *a
	r.items[a.ID] = &cp
	return nil
}
func (r *hfakeAssignRepo) ListByEmployee(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *hfakeAssignRepo) ListByIntervention(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *hfakeAssignRepo) ListByStatus(_ context.Context, _ uuid.UUID, _ domain.AssignmentStatus, _, _ int) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (r *hfakeAssignRepo) List(_ context.Context, _ domain.AssignmentFilter) ([]*domain.Assignment, int, error) {
	return nil, 0, nil
}
func (r *hfakeAssignRepo) ListPendingConsent(_ context.Context, _, _ uuid.UUID) ([]*domain.Assignment, error) {
	return nil, nil
}
func (r *hfakeAssignRepo) BulkCreate(_ context.Context, items []*domain.Assignment) (int, error) {
	for _, a := range items {
		_ = r.Create(context.Background(), a)
	}
	return len(items), nil
}
func (r *hfakeAssignRepo) Cancel(_ context.Context, tid, id uuid.UUID, reason string) error {
	a, ok := r.items[id]
	if !ok || a.TenantID != tid {
		return domain.ErrAssignmentNotFound
	}
	if domain.IsTerminalStatus(a.Status) {
		return domain.ErrAssignmentTerminal
	}
	a.Status = domain.AssignmentStatusCancelled
	now := time.Now().UTC()
	a.CancelledAt = &now
	n := reason
	a.Notes = &n
	return nil
}

type hfakeCatalog struct {
	item *domain.Intervention
}

func (r *hfakeCatalog) Create(context.Context, *domain.Intervention) error { return nil }
func (r *hfakeCatalog) GetByID(_ context.Context, _ uuid.UUID) (*domain.Intervention, error) {
	if r.item == nil {
		return nil, domain.ErrInterventionNotFound
	}
	return r.item, nil
}
func (r *hfakeCatalog) GetByCode(context.Context, uuid.UUID, string) (*domain.Intervention, error) {
	return nil, domain.ErrInterventionNotFound
}
func (r *hfakeCatalog) Update(context.Context, *domain.Intervention) error { return nil }
func (r *hfakeCatalog) List(context.Context, domain.CatalogFilter) ([]*domain.Intervention, int, error) {
	return nil, 0, nil
}
func (r *hfakeCatalog) ListByCategory(context.Context, uuid.UUID, domain.Category) ([]*domain.Intervention, error) {
	return nil, nil
}
func (r *hfakeCatalog) ListByDimension(context.Context, uuid.UUID, string) ([]*domain.Intervention, error) {
	return nil, nil
}
func (r *hfakeCatalog) ListActive(context.Context, uuid.UUID) ([]*domain.Intervention, error) {
	return nil, nil
}
func (r *hfakeCatalog) Search(context.Context, uuid.UUID, string, int) ([]*domain.Intervention, error) {
	return nil, nil
}

// -------------------- helpers --------------------

func newTestServer(t *testing.T) (*hfakeAssignRepo, *hfakeConsentRepo, *handler.ConsentHandler, uuid.UUID, uuid.UUID) {
	t.Helper()
	tid := uuid.New()
	empID := uuid.New()
	intervID := uuid.New()

	consentRepo := &hfakeConsentRepo{}
	assignRepo := newHFakeAssignRepo()
	catalog := &hfakeCatalog{item: &domain.Intervention{
		ID:            intervID,
		Code:          "COACH_01",
		TitleTR:       "Koçluk",
		DescriptionTR: "4 hafta",
		Category:      domain.CategoryCoaching,
		EvidenceTier:  domain.EvidenceTierA,
		DeliveryMode:  domain.DeliveryMode1on1,
		Active:        true,
	}}
	pub := event.NewInMemoryPublisher()
	svc := service.NewConsentService(consentRepo, assignRepo, catalog, pub, zerolog.Nop())
	h := handler.NewConsentHandler(svc, zerolog.Nop(), 72*time.Hour)

	a := &domain.Assignment{
		TenantID:       tid,
		InterventionID: intervID,
		EmployeeID:     empID,
		Status:         domain.AssignmentStatusAssigned,
	}
	if err := assignRepo.Create(context.Background(), a); err != nil {
		t.Fatalf("seed: %v", err)
	}
	return assignRepo, consentRepo, h, tid, empID
}

func withAuth(r *http.Request, tid, uid uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tid)
	ctx = context.WithValue(ctx, middleware.CtxUserID, uid)
	return r.WithContext(ctx)
}

func withRouteParam(r *http.Request, key, val string) *http.Request {
	rc := chi.NewRouteContext()
	rc.URLParams.Add(key, val)
	ctx := context.WithValue(r.Context(), chi.RouteCtxKey, rc)
	return r.WithContext(ctx)
}

// -------------------- tests --------------------

func TestHandler_Consent_MissingAuth(t *testing.T) {
	_, _, h, _, _ := newTestServer(t)
	body := strings.NewReader(`{"action":"granted"}`)
	r := httptest.NewRequest(http.MethodPost, "/consent", body)
	r = withRouteParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.HandleConsent(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", w.Code)
	}
}

func TestHandler_Consent_InvalidUUID(t *testing.T) {
	_, _, h, tid, uid := newTestServer(t)
	r := httptest.NewRequest(http.MethodPost, "/consent", strings.NewReader(`{"action":"granted"}`))
	r = withRouteParam(r, "id", "not-a-uuid")
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.HandleConsent(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

func TestHandler_Consent_UnknownAction(t *testing.T) {
	assignRepo, _, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id := range assignRepo.items {
		aID = id
	}
	r := httptest.NewRequest(http.MethodPost, "/consent", strings.NewReader(`{"action":"accept"}`))
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.HandleConsent(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d — body=%s", w.Code, w.Body.String())
	}
}

func TestHandler_Consent_Granted_PersistsIPAndUA(t *testing.T) {
	assignRepo, consentRepo, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id, a := range assignRepo.items {
		a.EmployeeID = uid
		aID = id
	}
	r := httptest.NewRequest(http.MethodPost, "/consent", strings.NewReader(`{"action":"granted"}`))
	r.Header.Set("User-Agent", "Mozilla/5.0 UpCoreTest")
	r.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.HandleConsent(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d — %s", w.Code, w.Body.String())
	}
	if len(consentRepo.logs) != 1 {
		t.Fatalf("expected 1 log, got %d", len(consentRepo.logs))
	}
	if consentRepo.logs[0].ActorIP != "203.0.113.7" {
		t.Errorf("expected XFF IP, got %s", consentRepo.logs[0].ActorIP)
	}
	if consentRepo.logs[0].UserAgent != "Mozilla/5.0 UpCoreTest" {
		t.Errorf("UA not captured: %s", consentRepo.logs[0].UserAgent)
	}
}

func TestHandler_Consent_DeclinedPersistsReason(t *testing.T) {
	assignRepo, consentRepo, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id, a := range assignRepo.items {
		a.EmployeeID = uid
		aID = id
	}
	r := httptest.NewRequest(http.MethodPost, "/consent",
		strings.NewReader(`{"action":"declined","reason":"  yoğun dönem  "}`))
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.HandleConsent(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	if consentRepo.logs[0].Reason == nil || *consentRepo.logs[0].Reason != "yoğun dönem" {
		t.Errorf("reason trimmed: %+v", consentRepo.logs[0].Reason)
	}
}

func TestHandler_Remind_TooSoon(t *testing.T) {
	assignRepo, _, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id := range assignRepo.items {
		aID = id
	}
	r := httptest.NewRequest(http.MethodPost, "/remind", nil)
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.Remind(w, r)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422, got %d — %s", w.Code, w.Body.String())
	}
}

func TestHandler_Remind_Aged_OK(t *testing.T) {
	assignRepo, _, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id, a := range assignRepo.items {
		a.AssignedAt = time.Now().Add(-100 * time.Hour)
		aID = id
	}
	r := httptest.NewRequest(http.MethodPost, "/remind", nil)
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.Remind(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d — %s", w.Code, w.Body.String())
	}
}

func TestHandler_ListByAssignment(t *testing.T) {
	assignRepo, _, h, tid, uid := newTestServer(t)
	var aID uuid.UUID
	for id, a := range assignRepo.items {
		a.EmployeeID = uid
		aID = id
	}
	// Grant first to create a log entry.
	grant := httptest.NewRequest(http.MethodPost, "/consent", strings.NewReader(`{"action":"granted"}`))
	grant = withRouteParam(grant, "id", aID.String())
	grant = withAuth(grant, tid, uid)
	h.HandleConsent(httptest.NewRecorder(), grant)

	r := httptest.NewRequest(http.MethodGet, "/history", nil)
	r = withRouteParam(r, "id", aID.String())
	r = withAuth(r, tid, uid)
	w := httptest.NewRecorder()
	h.ListByAssignment(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	var body struct {
		Items []domain.ConsentLog `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body.Items) != 1 {
		t.Errorf("want 1 item, got %d", len(body.Items))
	}
}
