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

// adminHarness wires the admin tenants handler with platform-admin middleware
// in front so tests exercise the 403 path as well as the happy path.
type adminHarness struct {
	router    http.Handler
	tenantSvc *service.TenantService
	publisher *event.InMemoryPublisher
	tenants   *testsupport.FakeTenantRepo
	subs      *testsupport.FakeSubscriptionRepo
	usage     *testsupport.FakeUsageRepo
	plans     *testsupport.FakePlanRepo
}

func newAdminHarness() *adminHarness {
	pub := event.NewInMemoryPublisher()
	plans := testsupport.NewFakePlanRepo()
	subs := testsupport.NewFakeSubscriptionRepo()
	usage := testsupport.NewFakeUsageRepo()
	tenants := testsupport.NewFakeTenantRepo().WithSubs(subs).WithUsage(usage)
	log := zerolog.Nop()
	svc := service.NewTenantService(service.NoopTxRunner{}, tenants, plans, subs, usage, pub, 14, log)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	h := NewAdminTenantsHandler(svc, dep)

	r := chi.NewRouter()
	r.Group(func(r chi.Router) {
		r.Use(adminAuthForTests)
		r.Use(middleware.RequirePlatformAdmin)
		r.Route("/admin", h.Register)
	})

	return &adminHarness{
		router:    r,
		tenantSvc: svc,
		publisher: pub,
		tenants:   tenants,
		subs:      subs,
		usage:     usage,
		plans:     plans,
	}
}

// adminAuthForTests mirrors the gateway-populated middleware: it parses
// X-Tenant-ID/X-User-ID/X-User-Role headers into context values so the
// downstream RequirePlatformAdmin middleware has a role to check.
func adminAuthForTests(next http.Handler) http.Handler {
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
		role := r.Header.Get("X-User-Role")
		ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tUUID)
		ctx = context.WithValue(ctx, middleware.CtxUserID, uUUID)
		ctx = context.WithValue(ctx, middleware.CtxRole, role)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func adminHeaders(role string) map[string]string {
	return map[string]string{
		"X-Tenant-ID": uuid.NewString(),
		"X-User-ID":   uuid.NewString(),
		"X-User-Role": role,
	}
}

func adminRequest(h *adminHarness, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
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

// Seeds n tenants with deterministic slugs "acme-{i}" using default plan.
func seedTenants(t *testing.T, h *adminHarness, n int) []uuid.UUID {
	t.Helper()
	ctx := context.Background()
	ids := make([]uuid.UUID, 0, n)
	for i := 0; i < n; i++ {
		slug := "co-" + uuid.NewString()[:8]
		res, err := h.tenantSvc.Signup(ctx, service.SignupRequest{
			CompanyName:    "Acme " + slug,
			CompanySlug:    slug,
			AdminEmail:     "a" + uuid.NewString()[:6] + "@acme.com",
			AdminFirstName: "A", AdminLastName: "B",
			PlanID: "free",
		})
		if err != nil {
			t.Fatalf("seed signup: %v", err)
		}
		ids = append(ids, res.TenantID)
	}
	return ids
}

// ---------------------------------------------------------------------------
// GET /admin/tenants
// ---------------------------------------------------------------------------

func TestAdminListTenants_Happy(t *testing.T) {
	h := newAdminHarness()
	seedTenants(t, h, 3)

	rr := adminRequest(h, http.MethodGet, "/admin/tenants", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var out service.AdminListResult
	if err := json.NewDecoder(rr.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Total != 3 {
		t.Fatalf("total=%d want 3", out.Total)
	}
	if len(out.Items) != 3 {
		t.Fatalf("items len=%d want 3", len(out.Items))
	}
	// Plan + seats populated via FakeSubs.
	for _, row := range out.Items {
		if row.PlanID == nil || *row.PlanID != "free" {
			t.Errorf("plan_id not wired for %s: %+v", row.ID, row.PlanID)
		}
		if row.Status != domain.TenantStatusTrial {
			t.Errorf("status=%s want trial", row.Status)
		}
	}
}

func TestAdminListTenants_Forbidden(t *testing.T) {
	h := newAdminHarness()
	rr := adminRequest(h, http.MethodGet, "/admin/tenants", nil, adminHeaders("tenant-admin"))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-platform-admin, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAdminListTenants_Pagination(t *testing.T) {
	h := newAdminHarness()
	seedTenants(t, h, 5)

	rr := adminRequest(h, http.MethodGet, "/admin/tenants?page=1&page_size=2", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var out service.AdminListResult
	_ = json.NewDecoder(rr.Body).Decode(&out)
	if len(out.Items) != 2 {
		t.Fatalf("page size = %d want 2", len(out.Items))
	}
	if out.Total != 5 {
		t.Fatalf("total=%d want 5", out.Total)
	}
	if !out.HasMore {
		t.Fatalf("expected has_more true")
	}
}

func TestAdminListTenants_StatusFilter(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 3)
	// Suspend the first one.
	if _, err := h.tenantSvc.ChangeStatus(context.Background(), ids[0], domain.TenantStatusSuspended, "non-payment"); err != nil {
		t.Fatalf("suspend: %v", err)
	}

	rr := adminRequest(h, http.MethodGet, "/admin/tenants?status=suspended", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	var out service.AdminListResult
	_ = json.NewDecoder(rr.Body).Decode(&out)
	if out.Total != 1 {
		t.Fatalf("expected 1 suspended, got %d", out.Total)
	}
	if out.Items[0].Status != domain.TenantStatusSuspended {
		t.Fatalf("wrong status: %s", out.Items[0].Status)
	}
}

func TestAdminListTenants_SearchFilter(t *testing.T) {
	h := newAdminHarness()
	ctx := context.Background()
	res, err := h.tenantSvc.Signup(ctx, service.SignupRequest{
		CompanyName:    "Çok Özel Şirket",
		CompanySlug:    "cok-ozel",
		AdminEmail:     "z@z.com",
		AdminFirstName: "A", AdminLastName: "B",
		PlanID: "free",
	})
	if err != nil {
		t.Fatalf("signup: %v", err)
	}
	_ = res
	// seed unrelated
	seedTenants(t, h, 2)

	rr := adminRequest(h, http.MethodGet, "/admin/tenants?q=ozel", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d", rr.Code)
	}
	var out service.AdminListResult
	_ = json.NewDecoder(rr.Body).Decode(&out)
	if out.Total != 1 {
		t.Fatalf("expected 1 match, got %d", out.Total)
	}
	if out.Items[0].Slug != "cok-ozel" {
		t.Fatalf("wrong tenant: %s", out.Items[0].Slug)
	}
}

func TestAdminListTenants_InvalidPageSize(t *testing.T) {
	h := newAdminHarness()
	rr := adminRequest(h, http.MethodGet, "/admin/tenants?page_size=999", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for oversized page, got %d", rr.Code)
	}
}

// ---------------------------------------------------------------------------
// GET /admin/tenants/{id}
// ---------------------------------------------------------------------------

func TestAdminTenantDetail_Happy(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)

	rr := adminRequest(h, http.MethodGet, "/admin/tenants/"+ids[0].String(), nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var out service.AdminDetail
	if err := json.NewDecoder(rr.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Tenant == nil || out.Tenant.ID != ids[0] {
		t.Fatalf("tenant mismatch")
	}
	if out.Subscription == nil || out.Subscription.PlanID != "free" {
		t.Fatalf("subscription missing / wrong plan")
	}
	if out.Plan == nil || out.Plan.ID != "free" {
		t.Fatalf("plan missing")
	}
}

func TestAdminTenantDetail_NotFound(t *testing.T) {
	h := newAdminHarness()
	rr := adminRequest(h, http.MethodGet, "/admin/tenants/"+uuid.NewString(), nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAdminTenantDetail_BadUUID(t *testing.T) {
	h := newAdminHarness()
	rr := adminRequest(h, http.MethodGet, "/admin/tenants/not-a-uuid", nil, adminHeaders("platform-admin"))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestAdminTenantDetail_Forbidden(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	rr := adminRequest(h, http.MethodGet, "/admin/tenants/"+ids[0].String(), nil, adminHeaders("tenant-admin"))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}
}

// ---------------------------------------------------------------------------
// PATCH /admin/tenants/{id}/status
// ---------------------------------------------------------------------------

func TestAdminChangeStatus_Suspend(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)

	body := map[string]string{"status": "suspended", "reason": "non-payment ticket #1234"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var tOut domain.Tenant
	if err := json.NewDecoder(rr.Body).Decode(&tOut); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if tOut.Status != domain.TenantStatusSuspended {
		t.Fatalf("status=%s want suspended", tOut.Status)
	}
	if h.publisher.Count(event.TopicTenantSuspended) != 1 {
		t.Fatalf("expected 1 suspended event, got %d", h.publisher.Count(event.TopicTenantSuspended))
	}
}

func TestAdminChangeStatus_Activate(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	// suspend first
	if _, err := h.tenantSvc.ChangeStatus(context.Background(), ids[0], domain.TenantStatusSuspended, "test"); err != nil {
		t.Fatalf("pre-suspend: %v", err)
	}
	body := map[string]string{"status": "active", "reason": "paid"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	if h.publisher.Count(event.TopicTenantActivated) != 1 {
		t.Fatalf("expected 1 activated event, got %d", h.publisher.Count(event.TopicTenantActivated))
	}
}

func TestAdminChangeStatus_SuspendRequiresReason(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	body := map[string]string{"status": "suspended"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAdminChangeStatus_InvalidStatus(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	body := map[string]string{"status": "banana", "reason": "x"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAdminChangeStatus_NotFound(t *testing.T) {
	h := newAdminHarness()
	body := map[string]string{"status": "active"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+uuid.NewString()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestAdminChangeStatus_BadUUID(t *testing.T) {
	h := newAdminHarness()
	body := map[string]string{"status": "active"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/not-a-uuid/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestAdminChangeStatus_Forbidden(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	body := map[string]string{"status": "suspended", "reason": "x"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("tenant-admin"))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}
}

func TestAdminChangeStatus_NoOpTransition(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	// tenant is in trial after signup — changing to trial should be no-op.
	body := map[string]string{"status": "trial"}
	rr := adminRequest(h, http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", body, adminHeaders("platform-admin"))
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 on no-op, got %d", rr.Code)
	}
}

func TestAdminChangeStatus_BadJSON(t *testing.T) {
	h := newAdminHarness()
	ids := seedTenants(t, h, 1)
	req := httptest.NewRequest(http.MethodPatch, "/admin/tenants/"+ids[0].String()+"/status", bytes.NewBufferString("not json"))
	req.Header.Set("Content-Type", "application/json")
	for k, v := range adminHeaders("platform-admin") {
		req.Header.Set(k, v)
	}
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}
