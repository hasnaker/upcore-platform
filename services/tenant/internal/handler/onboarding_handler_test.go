package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
	"github.com/upcore/tenant/internal/testsupport"
)

type onboardingHarness struct {
	router http.Handler
	svc    *service.OnboardingService
	pub    *event.InMemoryPublisher
}

func newOnboardingHarness() *onboardingHarness {
	pub := event.NewInMemoryPublisher()
	drafts := testsupport.NewFakeOnboardingDraftRepo()
	tenants := testsupport.NewFakeTenantRepo()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	log := zerolog.Nop()
	svc := service.NewOnboardingService(service.NoopTxRunner{}, drafts, tenants, plans, subs, usage, pub, 14, log)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	h := NewOnboardingHandler(svc, dep)

	r := chi.NewRouter()
	r.Route("/", func(r chi.Router) {
		h.Register(r)
	})
	return &onboardingHarness{router: r, svc: svc, pub: pub}
}

func doOnboardingRequest(h *onboardingHarness, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	var buf io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)
	return rr
}

func TestOnboardingHandlerGetProgress_Unauthorized(t *testing.T) {
	h := newOnboardingHarness()
	rr := doOnboardingRequest(h, http.MethodGet, "/onboarding/progress", nil, nil)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestOnboardingHandlerGetProgress_CreatesDraft(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "user_abc", "X-Clerk-Email": "a@b.com"}
	rr := doOnboardingRequest(h, http.MethodGet, "/onboarding/progress", nil, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var d domain.OnboardingDraft
	if err := json.Unmarshal(rr.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	if d.ClerkUserID != "user_abc" {
		t.Fatalf("clerk_user_id=%s", d.ClerkUserID)
	}
	if d.CurrentStep != 1 {
		t.Fatalf("step=%d", d.CurrentStep)
	}
}

func TestOnboardingHandlerSaveStep_Step1_Success(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "user_x", "X-Clerk-Email": "x@y.com"}
	payload := map[string]any{
		"company": map[string]any{
			"name":    "Acme A.Ş.",
			"slug":    "acme",
			"country": "TR",
			"locale":  "tr-TR",
		},
	}
	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/1", payload, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var d domain.OnboardingDraft
	if err := json.Unmarshal(rr.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	if d.Data.Company == nil || d.Data.Company.Slug != "acme" {
		t.Fatalf("company not persisted: %+v", d.Data.Company)
	}
}

func TestOnboardingHandlerSaveStep_InvalidStep(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "user_x"}
	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/xyz", map[string]any{}, headers)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestOnboardingHandlerSaveStep_ValidationErrorReturns422(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "user_x"}
	// Missing company.name / slug.
	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/1",
		map[string]any{"company": map[string]any{}}, headers)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var resp ErrorResponse
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Error != "validation_error" {
		t.Fatalf("error=%s", resp.Error)
	}
}

func TestOnboardingHandlerCommit_FullFlow(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "user_commit", "X-Clerk-Email": "c@d.com"}
	// Step 1
	_ = doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/1", map[string]any{
		"company": map[string]any{"name": "Foo", "slug": "foo-co", "country": "TR", "locale": "tr-TR"},
	}, headers)
	// Step 2
	_ = doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/2", map[string]any{
		"admin": map[string]any{"email": "admin@foo.com", "first_name": "A", "last_name": "B", "two_fa_ack": true},
	}, headers)
	// Step 3
	_ = doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/3", map[string]any{
		"plan": map[string]any{"plan_id": "starter", "modules": []string{"core_hris"}},
	}, headers)

	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/commit", map[string]any{}, headers)
	if rr.Code != http.StatusCreated {
		t.Fatalf("commit status=%d body=%s", rr.Code, rr.Body.String())
	}
	var res service.CommitResult
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatal(err)
	}
	if res.Slug != "foo-co" {
		t.Fatalf("slug=%s", res.Slug)
	}
	if res.TenantID == uuid.Nil {
		t.Fatal("tenant_id empty")
	}
}

func TestOnboardingHandlerAbandon_Idempotent(t *testing.T) {
	h := newOnboardingHarness()
	headers := map[string]string{"X-Clerk-User-ID": "nobody"}
	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/abandon", nil, headers)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestOnboardingHandlerFunnel_ReturnsAggregate(t *testing.T) {
	h := newOnboardingHarness()
	// Prime some drafts.
	_ = doOnboardingRequest(h, http.MethodGet, "/onboarding/progress", nil, map[string]string{"X-Clerk-User-ID": "a"})
	_ = doOnboardingRequest(h, http.MethodGet, "/onboarding/progress", nil, map[string]string{"X-Clerk-User-ID": "b"})

	req := httptest.NewRequest(http.MethodGet, "/admin/onboarding/funnel?days=30", nil)
	// Add tenant ctx so middleware won't fail — but our harness doesn't add
	// admin middleware in front of the funnel route, so it should pass.
	ctx := context.WithValue(req.Context(), middleware.CtxTenantID, uuid.New())
	req = req.WithContext(ctx)
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["total"] == nil {
		t.Fatalf("missing total: %v", payload)
	}
}

func TestOnboardingHandlerUnauthorizedWithoutUserID(t *testing.T) {
	h := newOnboardingHarness()
	rr := doOnboardingRequest(h, http.MethodPost, "/onboarding/progress/1",
		map[string]any{"company": map[string]any{"name": "x", "slug": "x-co"}}, nil)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d", rr.Code)
	}
}
