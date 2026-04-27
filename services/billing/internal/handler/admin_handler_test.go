package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"

	"github.com/upcore/billing/internal/service"
)

// buildAdmin — harness with sqlmock + admin handler mounted at /admin/billing.
func buildAdmin(t *testing.T) (*chi.Mux, sqlmock.Sqlmock) {
	t.Helper()
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	t.Cleanup(func() { _ = mdb.Close() })
	db := sqlx.NewDb(mdb, "postgres")
	core := service.NewService(db, zerolog.Nop())
	adminSvc := service.NewAdminService(core)
	admin := NewAdminHandler(db, adminSvc, nil)

	r := chi.NewRouter()
	r.Route("/admin/billing", admin.Register)
	return r, mock
}

func adminReq(t *testing.T, r http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("X-User-Roles", "upcore_staff")
	req.Header.Set("X-User-Id", uuid.New().String())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

func TestAdmin_Forbidden_WithoutRole(t *testing.T) {
	r, _ := buildAdmin(t)
	req := httptest.NewRequest(http.MethodGet, "/admin/billing/summary", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAdmin_Allowed_WithUpcoreStaff(t *testing.T) {
	r, mock := buildAdmin(t)
	// Need to satisfy Summary queries — short mocks
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_plans p`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"plan_id", "plan_code", "plan_name", "monthly_price_try",
			"subscriptions", "mrr_contribution",
		}))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(DISTINCT tenant_id)`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	for i := 0; i < 12; i++ {
		mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_subscriptions s`)).
			WillReturnRows(sqlmock.NewRows([]string{"mrr_try", "active_sub"}).AddRow(0.0, 0))
	}

	w := adminReq(t, r, http.MethodGet, "/admin/billing/summary", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

func TestAdmin_Summary_ReturnsMRR(t *testing.T) {
	r, mock := buildAdmin(t)
	planID := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_plans p`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"plan_id", "plan_code", "plan_name", "monthly_price_try",
			"subscriptions", "mrr_contribution",
		}).AddRow(planID, "starter", "Starter", 2490.0, 5, 12450.0))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(DISTINCT tenant_id)`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
	for i := 0; i < 12; i++ {
		mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_subscriptions s`)).
			WillReturnRows(sqlmock.NewRows([]string{"mrr_try", "active_sub"}).AddRow(12450.0, 5))
	}

	w := adminReq(t, r, http.MethodGet, "/admin/billing/summary", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	var got service.BillingSummary
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got.MRRTry != 12450.0 {
		t.Errorf("mrr: %.2f", got.MRRTry)
	}
	if got.ARRTry != 149400.0 {
		t.Errorf("arr: %.2f", got.ARRTry)
	}
}

// ---------------------------------------------------------------------------
// ListInvoices
// ---------------------------------------------------------------------------

func TestAdmin_ListInvoices_FilterByStatus(t *testing.T) {
	r, mock := buildAdmin(t)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM app.billing_invoices`)).
		WithArgs("paid").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_invoices i`)).
		WithArgs("paid", 50, 0).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "tenant_name", "tenant_slug",
			"subscription_id", "invoice_no", "period_start", "period_end",
			"subtotal_try", "kdv_try", "total_try", "currency", "status",
			"issued_at", "due_at", "paid_at", "pdf_url", "line_items",
		}).AddRow(
			uuid.New(), uuid.New(), "Acme", "acme",
			nil, "UPC-202604-AB12", time.Now(), time.Now(),
			1000.0, 200.0, 1200.0, "TRY", "paid",
			nil, nil, nil, nil, []byte(`[]`),
		))

	w := adminReq(t, r, http.MethodGet, "/admin/billing/invoices?status=paid", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out struct {
		Total int                        `json:"total"`
		Items []service.AdminInvoiceRow  `json:"items"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out.Total != 2 {
		t.Errorf("total: want 2, got %d", out.Total)
	}
	if len(out.Items) != 1 {
		t.Errorf("items: want 1, got %d", len(out.Items))
	}
}

// ---------------------------------------------------------------------------
// ManualInvoice
// ---------------------------------------------------------------------------

func TestAdmin_ManualInvoice_Happy(t *testing.T) {
	r, mock := buildAdmin(t)
	tid := uuid.New()
	id := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.billing_invoices`)).
		WithArgs(
			tid, sqlmock.AnyArg(),
			sqlmock.AnyArg(), sqlmock.AnyArg(),
			500.0, 100.0, 600.0, "TRY",
			sqlmock.AnyArg(), sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(id))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.billing_invoices SET pdf_url`)).
		WithArgs(sqlmock.AnyArg(), id).
		WillReturnResult(sqlmock.NewResult(0, 1))
	// Audit log insert — best-effort; allow but match loosely.
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO audit_events`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := map[string]any{
		"tenant_id": tid.String(),
		"line_items": []map[string]any{
			{"description": "Setup ücreti", "quantity": 1, "unit_price": 500},
		},
	}
	w := adminReq(t, r, http.MethodPost, "/admin/billing/invoices", body)
	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestAdmin_ManualInvoice_BadInput(t *testing.T) {
	r, _ := buildAdmin(t)

	// Missing tenant_id.
	body := map[string]any{
		"line_items": []map[string]any{
			{"description": "x", "quantity": 1, "unit_price": 1},
		},
	}
	w := adminReq(t, r, http.MethodPost, "/admin/billing/invoices", body)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d: %s", w.Code, w.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Stripe portal
// ---------------------------------------------------------------------------

// stubProvider satisfies service.PaymentProvider + service.PortalProvider.
type stubProvider struct{}

func (stubProvider) Name() string                                                             { return "stripe" }
func (stubProvider) Charge(context.Context, string, float64, string) (string, error)          { return "pi_1", nil }
func (stubProvider) CreateCustomer(context.Context, uuid.UUID, string, string) (string, error) { return "cus_1", nil }
func (stubProvider) Refund(context.Context, string, float64) error                             { return nil }
func (stubProvider) PortalSession(_ context.Context, _, _ string) (string, error) {
	return "https://billing.stripe.com/p/session_live", nil
}

// buildAdminWithStripe wires a stub provider that implements PortalProvider.
func buildAdminWithStripe(t *testing.T) (*chi.Mux, sqlmock.Sqlmock) {
	t.Helper()
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	t.Cleanup(func() { _ = mdb.Close() })
	db := sqlx.NewDb(mdb, "postgres")
	core := service.NewService(db, zerolog.Nop())
	core.RegisterProvider("stripe", stubProvider{})
	adminSvc := service.NewAdminService(core)
	admin := NewAdminHandler(db, adminSvc, nil)
	r := chi.NewRouter()
	r.Route("/admin/billing", admin.Register)
	return r, mock
}

func TestAdmin_StripePortal_Happy(t *testing.T) {
	r, mock := buildAdminWithStripe(t)
	tid := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`provider_customer_id`)).
		WithArgs(tid).
		WillReturnRows(sqlmock.NewRows([]string{"provider_customer_id"}).AddRow("cus_live"))
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO audit_events`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	body := map[string]string{
		"tenant_id":  tid.String(),
		"return_url": "https://admin.upcore.io/billing",
	}
	w := adminReq(t, r, http.MethodPost, "/admin/billing/stripe-portal", body)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var out map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out["url"] == "" {
		t.Errorf("missing url")
	}
}

func TestAdmin_StripePortal_MissingTenant(t *testing.T) {
	r, _ := buildAdmin(t)
	w := adminReq(t, r, http.MethodPost, "/admin/billing/stripe-portal", map[string]string{})
	if w.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// Churn risk (feature-flag gated)
// ---------------------------------------------------------------------------

func TestAdmin_ChurnRisk_FlagDisabled(t *testing.T) {
	r, mock := buildAdmin(t)

	// Feature flag lookup → no row (flag disabled).
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.feature_flags`)).
		WithArgs("admin_billing_churn_risk", uuid.Nil).
		WillReturnError(sqlmock.ErrCancelled) // any failure → disabled

	w := adminReq(t, r, http.MethodGet, "/admin/billing/churn-risk", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	var out struct {
		Enabled bool `json:"enabled"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out.Enabled {
		t.Errorf("flag should be disabled")
	}
}
