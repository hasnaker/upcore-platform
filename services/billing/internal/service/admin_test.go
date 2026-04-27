package service

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// newAdminTest builds an AdminService backed by a sqlmock DB.
func newAdminTest(t *testing.T) (*AdminService, sqlmock.Sqlmock) {
	t.Helper()
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	t.Cleanup(func() { _ = mdb.Close() })
	db := sqlx.NewDb(mdb, "postgres")
	core := NewService(db, zerolog.Nop())
	return NewAdminService(core), mock
}

// TestAdminService_Summary_MRR_ThreePlans verifies MRR/ARR/plan distribution
// math for three plans with different seat mixes.
//
// Plans:
//	starter    price=2490  subs=4
//	growth     price=7490  subs=3
//	scale      price=19900 subs=2
//
// Expected MRR = 4*2490 + 3*7490 + 2*19900 = 9960 + 22470 + 39800 = 72230
// Expected ARR = 72230 * 12 = 866760
// Active subs  = 9
func TestAdminService_Summary_MRR_ThreePlans(t *testing.T) {
	svc, mock := newAdminTest(t)

	starterID := uuid.New()
	growthID := uuid.New()
	scaleID := uuid.New()

	planRows := sqlmock.NewRows([]string{
		"plan_id", "plan_code", "plan_name", "monthly_price_try",
		"subscriptions", "mrr_contribution",
	}).
		AddRow(scaleID, "scale", "Scale", 19900.0, 2, 39800.0).
		AddRow(growthID, "growth", "Growth", 7490.0, 3, 22470.0).
		AddRow(starterID, "starter", "Starter", 2490.0, 4, 9960.0)

	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_plans p`)).
		WillReturnRows(planRows)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(DISTINCT tenant_id)`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(9))

	// Twelve trend rows, all zero for simplicity. Matches in insertion order.
	for i := 0; i < 12; i++ {
		mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_subscriptions s`)).
			WillReturnRows(sqlmock.NewRows([]string{"mrr_try", "active_sub"}).AddRow(0.0, 0))
	}

	now := time.Date(2026, 4, 23, 0, 0, 0, 0, time.UTC)
	sum, err := svc.Summary(context.Background(), now)
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}

	if sum.MRRTry != 72230.0 {
		t.Errorf("MRR: want 72230, got %.2f", sum.MRRTry)
	}
	if sum.ARRTry != 866760.0 {
		t.Errorf("ARR: want 866760, got %.2f", sum.ARRTry)
	}
	if sum.ActiveSubscriptions != 9 {
		t.Errorf("ActiveSubscriptions: want 9, got %d", sum.ActiveSubscriptions)
	}
	if sum.TotalTenants != 9 {
		t.Errorf("TotalTenants: want 9, got %d", sum.TotalTenants)
	}
	if len(sum.PlanDistribution) != 3 {
		t.Fatalf("plan distribution: want 3, got %d", len(sum.PlanDistribution))
	}
	if sum.PlanDistribution[0].PlanCode != "scale" {
		t.Errorf("first plan (highest price) should be scale, got %s", sum.PlanDistribution[0].PlanCode)
	}
	if len(sum.Trend12m) != 12 {
		t.Errorf("trend: want 12 points, got %d", len(sum.Trend12m))
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

// TestAdminService_Summary_NoSubscriptions — MRR = 0, ARR = 0, no divide-by-zero.
func TestAdminService_Summary_NoSubscriptions(t *testing.T) {
	svc, mock := newAdminTest(t)

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

	sum, err := svc.Summary(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("Summary: %v", err)
	}
	if sum.MRRTry != 0 || sum.ARRTry != 0 || sum.ActiveSubscriptions != 0 {
		t.Errorf("empty summary must be zeros, got %+v", sum)
	}
}

// TestAdminService_ManualInvoice_Math verifies subtotal/KDV/total calculation
// and invoice_no format.
func TestAdminService_ManualInvoice_Math(t *testing.T) {
	svc, mock := newAdminTest(t)
	tid := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.billing_invoices`)).
		WithArgs(
			tid, sqlmock.AnyArg(), // tenant_id, invoice_no
			sqlmock.AnyArg(), sqlmock.AnyArg(), // period_start, period_end
			1200.0, 240.0, 1440.0, "TRY", // subtotal, kdv, total, currency
			sqlmock.AnyArg(), sqlmock.AnyArg(), // issued_at, due_at
			sqlmock.AnyArg(), // line_items JSON
		).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(uuid.New()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.billing_invoices SET pdf_url`)).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))

	inv, err := svc.ManualInvoice(context.Background(), ManualInvoiceInput{
		TenantID: tid,
		LineItems: []ManualInvoiceLine{
			{Description: "Professional services — Nisan", Quantity: 8, UnitPrice: 150},
		},
	})
	if err != nil {
		t.Fatalf("ManualInvoice: %v", err)
	}
	if inv.SubtotalTRY != 1200.0 {
		t.Errorf("subtotal: want 1200, got %.2f", inv.SubtotalTRY)
	}
	if inv.KdvTRY != 240.0 {
		t.Errorf("KDV: want 240, got %.2f", inv.KdvTRY)
	}
	if inv.TotalTRY != 1440.0 {
		t.Errorf("total: want 1440, got %.2f", inv.TotalTRY)
	}
	if inv.PDFURL == nil || *inv.PDFURL == "" {
		t.Errorf("pdf_url must be set")
	}
	if inv.InvoiceNo == nil || *inv.InvoiceNo == "" {
		t.Errorf("invoice_no must be set")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

// TestAdminService_ManualInvoice_ValidationErrors covers all guard clauses.
func TestAdminService_ManualInvoice_ValidationErrors(t *testing.T) {
	svc, _ := newAdminTest(t)
	tid := uuid.New()

	cases := []struct {
		name string
		in   ManualInvoiceInput
	}{
		{"nil tenant", ManualInvoiceInput{LineItems: []ManualInvoiceLine{{Description: "x", Quantity: 1, UnitPrice: 1}}}},
		{"no lines", ManualInvoiceInput{TenantID: tid}},
		{"kdv > 1", ManualInvoiceInput{TenantID: tid, KDVRate: 1.1, LineItems: []ManualInvoiceLine{{Description: "x", Quantity: 1, UnitPrice: 1}}}},
		{"neg qty", ManualInvoiceInput{TenantID: tid, LineItems: []ManualInvoiceLine{{Description: "x", Quantity: -1, UnitPrice: 1}}}},
		{"empty desc", ManualInvoiceInput{TenantID: tid, LineItems: []ManualInvoiceLine{{Description: "   ", Quantity: 1, UnitPrice: 1}}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := svc.ManualInvoice(context.Background(), tc.in); err == nil {
				t.Errorf("want error for %s", tc.name)
			}
		})
	}
}

// TestAdminService_ListInvoices_WithFilters verifies the query builder emits
// the expected WHERE clauses and LIMIT/OFFSET.
func TestAdminService_ListInvoices_WithFilters(t *testing.T) {
	svc, mock := newAdminTest(t)
	tid := uuid.New()
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM app.billing_invoices`)).
		WithArgs("paid", tid, from, to).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.billing_invoices i`)).
		WithArgs("paid", tid, from, to, 50, 0).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "tenant_name", "tenant_slug",
			"subscription_id", "invoice_no", "period_start", "period_end",
			"subtotal_try", "kdv_try", "total_try", "currency", "status",
			"issued_at", "due_at", "paid_at", "pdf_url", "line_items",
		}))

	_, total, err := svc.ListInvoices(context.Background(), InvoiceFilter{
		Status:   "paid",
		TenantID: tid,
		From:     &from,
		To:       &to,
	})
	if err != nil {
		t.Fatalf("ListInvoices: %v", err)
	}
	if total != 3 {
		t.Errorf("total: want 3, got %d", total)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

// TestAdminService_CreatePortalSession_NoCustomer — 0-customer tenant returns error.
func TestAdminService_CreatePortalSession_NoCustomer(t *testing.T) {
	svc, mock := newAdminTest(t)
	tid := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`provider_customer_id`)).
		WithArgs(tid).
		WillReturnRows(sqlmock.NewRows([]string{"provider_customer_id"}).AddRow(""))

	if _, err := svc.CreatePortalSession(context.Background(), tid, "https://x"); err == nil {
		t.Errorf("want error when tenant has no stripe customer")
	}
}

// stubPortal implements both PaymentProvider and PortalProvider for the happy
// path of CreatePortalSession.
type stubPortal struct {
	portalURL string
}

func (stubPortal) Name() string { return "stripe" }
func (stubPortal) Charge(context.Context, string, float64, string) (string, error) {
	return "pi", nil
}
func (stubPortal) CreateCustomer(context.Context, uuid.UUID, string, string) (string, error) {
	return "cus", nil
}
func (stubPortal) Refund(context.Context, string, float64) error { return nil }
func (s stubPortal) PortalSession(_ context.Context, _, _ string) (string, error) {
	return s.portalURL, nil
}

func TestAdminService_CreatePortalSession_Happy(t *testing.T) {
	svc, mock := newAdminTest(t)
	svc.Core.RegisterProvider("stripe", stubPortal{portalURL: "https://billing.stripe.com/p/session_xyz"})

	tid := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`provider_customer_id`)).
		WithArgs(tid).
		WillReturnRows(sqlmock.NewRows([]string{"provider_customer_id"}).AddRow("cus_abc"))

	url, err := svc.CreatePortalSession(context.Background(), tid, "https://admin.upcore.io/billing")
	if err != nil {
		t.Fatalf("CreatePortalSession: %v", err)
	}
	if url != "https://billing.stripe.com/p/session_xyz" {
		t.Errorf("wrong url: %s", url)
	}
}

// TestScoreChurn — sanity check the scoring math.
func TestScoreChurn(t *testing.T) {
	zero := scoreChurn(ChurnRiskRow{})
	if zero != 0 {
		t.Errorf("all-zero row → 0, got %d", zero)
	}
	max := scoreChurn(ChurnRiskRow{UsageDrop3mPct: 100, PaymentLateN: 10, OpenTickets: 10})
	if max < 90 {
		t.Errorf("maxed row should score ≥ 90, got %d", max)
	}
	mid := scoreChurn(ChurnRiskRow{UsageDrop3mPct: 50, PaymentLateN: 1, OpenTickets: 1})
	if mid < 25 || mid > 80 {
		t.Errorf("mid row out of band: %d", mid)
	}
}
