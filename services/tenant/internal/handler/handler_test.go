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

	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
	"github.com/upcore/tenant/internal/testsupport"
)

type testHarness struct {
	router     http.Handler
	tenantSvc  *service.TenantService
	subSvc     *service.SubscriptionService
	usageSvc   *service.UsageService
	billingSvc *service.BillingService
	publisher  *event.InMemoryPublisher
	planRepo   *testsupport.FakePlanRepo
	tenantRepo *testsupport.FakeTenantRepo
	subRepo    *testsupport.FakeSubscriptionRepo
}

func newHarness() *testHarness {
	pub := event.NewInMemoryPublisher()
	tenants := testsupport.NewFakeTenantRepo()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	log := zerolog.Nop()
	tenantSvc := service.NewTenantService(service.NoopTxRunner{}, tenants, plans, subs, usage, pub, 14, log)
	subSvc := service.NewSubscriptionService(plans, subs, pub, log)
	usageSvc := service.NewUsageService(usage, subs, plans, pub, log)
	billingSvc := service.NewBillingService(subs, plans, tenants, usage, pub, log)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	signupH := NewSignupHandler(tenantSvc, dep)
	tenantH := NewTenantHandler(tenantSvc, dep)
	planH := NewPlanHandler(plans, dep)
	subH := NewSubscriptionHandler(subSvc, dep)
	usageH := NewUsageHandler(usageSvc, dep)
	billingH := NewBillingHandler(billingSvc, "", "", dep)

	r := chi.NewRouter()
	r.Post("/signup", signupH.Post)
	r.Get("/plans", planH.List)
	r.Get("/plans/{id}", planH.Get)
	r.Post("/webhooks/billing", billingH.HandleWebhook)
	r.Group(func(r chi.Router) {
		r.Use(fakeAuthMiddleware)
		r.Get("/tenants/me", tenantH.GetCurrent)
		r.Get("/tenants/{id}", tenantH.Get)
		r.Patch("/tenants/{id}", tenantH.Patch)
		r.Delete("/tenants/{id}", tenantH.Delete)
		r.Get("/subscriptions/current", subH.GetCurrent)
		r.Post("/subscriptions", subH.ChangePlan)
		r.Post("/subscriptions/cancel", subH.Cancel)
		r.Post("/subscriptions/resume", subH.Resume)
		r.Patch("/subscriptions/seats", subH.UpdateSeats)
		r.Get("/usage", usageH.GetCurrent)
	})

	return &testHarness{
		router: r, tenantSvc: tenantSvc, subSvc: subSvc, usageSvc: usageSvc, billingSvc: billingSvc,
		publisher: pub, planRepo: plans, tenantRepo: tenants, subRepo: subs,
	}
}

// fakeAuthMiddleware reads X-Tenant-ID/X-User-ID headers for test routing.
func fakeAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := r.Header.Get("X-Tenant-ID")
		uid := r.Header.Get("X-User-ID")
		if tid == "" || uid == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		tUUID, err := uuid.Parse(tid)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		uUUID, _ := uuid.Parse(uid)
		ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tUUID)
		ctx = context.WithValue(ctx, middleware.CtxUserID, uUUID)
		ctx = context.WithValue(ctx, middleware.CtxRole, "admin")
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func doRequest(h *testHarness, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
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

func TestSignupEndpoint_Success(t *testing.T) {
	h := newHarness()
	body := map[string]string{
		"company_name":     "Acme A.Ş.",
		"company_slug":     "acme",
		"admin_email":      "founder@acme.com",
		"admin_first_name": "Mehmet",
		"admin_last_name":  "Yılmaz",
		"plan_id":          "free",
	}
	rr := doRequest(h, http.MethodPost, "/signup", body, nil)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var res service.SignupResult
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if res.TenantID == uuid.Nil {
		t.Fatal("tenant id zero")
	}
}

func TestSignupEndpoint_ValidationError(t *testing.T) {
	h := newHarness()
	body := map[string]string{
		"company_name": "Acme",
		// missing required fields
	}
	rr := doRequest(h, http.MethodPost, "/signup", body, nil)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestSignupEndpoint_DuplicateSlug(t *testing.T) {
	h := newHarness()
	body := map[string]string{
		"company_name":     "Acme",
		"company_slug":     "acme",
		"admin_email":      "a@b.com",
		"admin_first_name": "M",
		"admin_last_name":  "Y",
		"plan_id":          "free",
	}
	rr1 := doRequest(h, http.MethodPost, "/signup", body, nil)
	if rr1.Code != http.StatusCreated {
		t.Fatalf("first: %d", rr1.Code)
	}
	rr2 := doRequest(h, http.MethodPost, "/signup", body, nil)
	if rr2.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", rr2.Code, rr2.Body.String())
	}
}

func TestListPlansEndpoint(t *testing.T) {
	h := newHarness()
	rr := doRequest(h, http.MethodGet, "/plans", nil, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	var res struct {
		Items []any `json:"items"`
		Count int   `json:"count"`
	}
	_ = json.NewDecoder(rr.Body).Decode(&res)
	if res.Count < 4 {
		t.Fatalf("expected >=4 plans, got %d", res.Count)
	}
}

func TestGetPlanEndpoint(t *testing.T) {
	h := newHarness()
	rr := doRequest(h, http.MethodGet, "/plans/free", nil, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	rr = doRequest(h, http.MethodGet, "/plans/doesnotexist", nil, nil)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rr.Code)
	}
}

func TestGetCurrentTenant_Authenticated(t *testing.T) {
	h := newHarness()
	res, _ := h.tenantSvc.Signup(context.Background(), service.SignupRequest{
		CompanyName: "T", CompanySlug: "t", AdminEmail: "a@b.com",
		AdminFirstName: "x", AdminLastName: "y", PlanID: "free",
	})
	headers := map[string]string{
		"X-Tenant-ID": res.TenantID.String(),
		"X-User-ID":   uuid.NewString(),
	}
	rr := doRequest(h, http.MethodGet, "/tenants/me", nil, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestGetCurrentTenant_Unauthenticated(t *testing.T) {
	h := newHarness()
	rr := doRequest(h, http.MethodGet, "/tenants/me", nil, nil)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestSubscriptionFlow(t *testing.T) {
	h := newHarness()
	ctx := context.Background()
	res, _ := h.tenantSvc.Signup(ctx, service.SignupRequest{
		CompanyName: "T", CompanySlug: "flow", AdminEmail: "a@b.com",
		AdminFirstName: "x", AdminLastName: "y", PlanID: "free",
	})
	headers := map[string]string{
		"X-Tenant-ID": res.TenantID.String(),
		"X-User-ID":   uuid.NewString(),
	}

	// Get current.
	rr := doRequest(h, http.MethodGet, "/subscriptions/current", nil, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("get current: %d body=%s", rr.Code, rr.Body.String())
	}

	// Change plan.
	rr = doRequest(h, http.MethodPost, "/subscriptions", map[string]string{"plan_id": "starter"}, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("change plan: %d body=%s", rr.Code, rr.Body.String())
	}

	// Update seats — starter cap is 100.
	rr = doRequest(h, http.MethodPatch, "/subscriptions/seats", map[string]int{"seats": 50}, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("update seats: %d body=%s", rr.Code, rr.Body.String())
	}

	// Exceed cap.
	rr = doRequest(h, http.MethodPatch, "/subscriptions/seats", map[string]int{"seats": 101}, headers)
	if rr.Code != http.StatusPaymentRequired {
		t.Fatalf("expected 402, got %d", rr.Code)
	}

	// Cancel.
	rr = doRequest(h, http.MethodPost, "/subscriptions/cancel", nil, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("cancel: %d", rr.Code)
	}
}

func TestGetUsageEndpoint(t *testing.T) {
	h := newHarness()
	ctx := context.Background()
	res, _ := h.tenantSvc.Signup(ctx, service.SignupRequest{
		CompanyName: "T", CompanySlug: "usage-co", AdminEmail: "a@b.com",
		AdminFirstName: "x", AdminLastName: "y", PlanID: "free",
	})
	_ = h.usageSvc.IncrementEmployees(ctx, res.TenantID, 3)
	headers := map[string]string{
		"X-Tenant-ID": res.TenantID.String(),
		"X-User-ID":   uuid.NewString(),
	}
	rr := doRequest(h, http.MethodGet, "/usage", nil, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var got map[string]int64
	_ = json.NewDecoder(rr.Body).Decode(&got)
	if got["employees"] != 3 {
		t.Fatalf("employees=%d want 3", got["employees"])
	}
}

func TestBillingWebhook_Accepted(t *testing.T) {
	h := newHarness()
	body := map[string]any{
		"id":   "evt_test",
		"type": "invoice.paid",
		"data": map[string]any{
			"tenant_id": uuid.New().String(),
			"amount_try": 1500,
			"currency": "TRY",
			"external_id": "inv_123",
		},
	}
	rr := doRequest(h, http.MethodPost, "/webhooks/billing", body, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPatchTenant(t *testing.T) {
	h := newHarness()
	ctx := context.Background()
	res, _ := h.tenantSvc.Signup(ctx, service.SignupRequest{
		CompanyName: "OldName", CompanySlug: "patch-test", AdminEmail: "a@b.com",
		AdminFirstName: "x", AdminLastName: "y", PlanID: "free",
	})
	headers := map[string]string{
		"X-Tenant-ID": res.TenantID.String(),
		"X-User-ID":   uuid.NewString(),
	}
	rr := doRequest(h, http.MethodPatch, "/tenants/"+res.TenantID.String(),
		map[string]string{"name": "NewName"}, headers)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestDeleteTenant(t *testing.T) {
	h := newHarness()
	ctx := context.Background()
	res, _ := h.tenantSvc.Signup(ctx, service.SignupRequest{
		CompanyName: "X", CompanySlug: "delete-me", AdminEmail: "a@b.com",
		AdminFirstName: "x", AdminLastName: "y", PlanID: "free",
	})
	headers := map[string]string{
		"X-Tenant-ID": res.TenantID.String(),
		"X-User-ID":   uuid.NewString(),
	}
	rr := doRequest(h, http.MethodDelete, "/tenants/"+res.TenantID.String(), nil, headers)
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}
