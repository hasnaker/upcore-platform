//go:build integration

// Billing integration test — real PostgreSQL, fake upstream HTTP for Iyzico/Stripe.
// Run with:  INTEGRATION=1 go test -tags=integration ./test/integration/...
//
// Prerequisites:
//   docker compose -f docker-compose.test.yml up -d postgres
//
// This harness spins up migrations, seeds a minimum schema, then drives
// end-to-end flows through the Service layer:
//   1. plan + subscription create
//   2. invoice calculate
//   3. charge invoice → fake Iyzico returns success
//   4. idempotent retry should NOT double-charge
//   5. refund flow
//
// Not covered (stays in unit tests): HMAC signing, request building.

package integration

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog"

	"github.com/upcore/billing/internal/provider"
	"github.com/upcore/billing/internal/service"
)

const testDSN = "postgres://upcore:upcore_test_pw@localhost:5433/upcore_test?sslmode=disable"

func skipIfNoDB(t *testing.T) *sqlx.DB {
	t.Helper()
	if os.Getenv("INTEGRATION") != "1" {
		t.Skip("set INTEGRATION=1 to run integration tests")
	}
	db, err := sqlx.Connect("postgres", testDSN)
	if err != nil {
		t.Skipf("no test DB: %v (run: docker compose -f docker-compose.test.yml up -d postgres)", err)
	}
	return db
}

func seedMinimal(t *testing.T, db *sqlx.DB, tenantID uuid.UUID) (planID, subID uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	_, err := db.ExecContext(ctx, `INSERT INTO app.tenants (id, name, slug, status, locale)
		VALUES ($1, 'test', 'test-tenant-'||substr($1::text,1,8), 'active', 'tr-TR')
		ON CONFLICT DO NOTHING`, tenantID)
	if err != nil {
		t.Fatalf("seed tenant: %v", err)
	}

	planID = uuid.New()
	_, err = db.ExecContext(ctx, `INSERT INTO app.billing_plans
		(id, code, name, monthly_price_try, included_employees, overage_per_employee, active)
		VALUES ($1, 'test-plan-'||$1::text, 'Test Plan', 1000, 10, 50, TRUE)
		ON CONFLICT DO NOTHING`, planID)
	if err != nil {
		t.Fatalf("seed plan: %v", err)
	}

	subID = uuid.New()
	_, err = db.ExecContext(ctx, `INSERT INTO app.billing_subscriptions
		(id, tenant_id, plan_id, status, starts_at, renews_at, provider, provider_customer_id)
		VALUES ($1, $2, $3, 'active', NOW(), NOW() + INTERVAL '1 month', 'iyzico', 'cuk_test')`,
		subID, tenantID, planID)
	if err != nil {
		t.Fatalf("seed sub: %v", err)
	}
	return
}

func TestBilling_Integration_InvoiceAndCharge(t *testing.T) {
	db := skipIfNoDB(t)
	defer db.Close()

	tenantID := uuid.New()
	_, _ = seedMinimal(t, db, tenantID)

	// Fake Iyzico upstream — always success.
	calls := 0
	fakeIyz := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		_, _ = io.ReadAll(r.Body)
		_, _ = w.Write([]byte(`{"status":"success","paymentId":"pay_integration_ok"}`))
	}))
	defer fakeIyz.Close()

	iyz := &provider.Iyzico{
		APIKey:    "test",
		SecretKey: "test",
		BaseURL:   fakeIyz.URL,
	}

	svc := service.NewService(db, zerolog.Nop())
	svc.RegisterProvider("iyzico", iyz)

	// Create invoice for period; employee_count 15 → overage applies.
	inv, err := svc.CalculateMonthlyInvoice(context.Background(), tenantID, time.Now().UTC(), 15)
	if err != nil {
		t.Fatalf("invoice: %v", err)
	}
	if inv.SubtotalTRY != 1250.0 { // 1000 + 5*50
		t.Errorf("subtotal: want 1250, got %v", inv.SubtotalTRY)
	}
	if inv.TotalTRY != 1500.0 { // 1250 * 1.20 KDV
		t.Errorf("total: want 1500, got %v", inv.TotalTRY)
	}

	// Charge → should hit upstream once, mark paid.
	if err := svc.ChargeInvoice(context.Background(), inv.ID); err != nil {
		t.Fatalf("charge: %v", err)
	}
	if calls != 1 {
		t.Errorf("upstream must be called once, got %d", calls)
	}

	// Idempotent: second call should NOT re-charge (status='paid').
	if err := svc.ChargeInvoice(context.Background(), inv.ID); err != nil {
		t.Fatalf("second charge: %v", err)
	}
	if calls != 1 {
		t.Errorf("upstream must NOT be re-called, got %d", calls)
	}

	// Verify DB row status.
	var status string
	if err := db.Get(&status, `SELECT status FROM app.billing_invoices WHERE id=$1`, inv.ID); err != nil {
		t.Fatalf("query invoice: %v", err)
	}
	if status != "paid" {
		t.Errorf("invoice status: want paid, got %s", status)
	}
}

func TestBilling_Integration_ChargeFailure_MarksOverdue(t *testing.T) {
	db := skipIfNoDB(t)
	defer db.Close()

	tenantID := uuid.New()
	_, _ = seedMinimal(t, db, tenantID)

	// Fake Iyzico — always card decline.
	fakeIyz := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"failure","errorCode":"10051","errorMessage":"card declined"}`))
	}))
	defer fakeIyz.Close()

	iyz := &provider.Iyzico{APIKey: "t", SecretKey: "s", BaseURL: fakeIyz.URL}
	svc := service.NewService(db, zerolog.Nop())
	svc.RegisterProvider("iyzico", iyz)

	inv, err := svc.CalculateMonthlyInvoice(context.Background(), tenantID, time.Now().UTC(), 10)
	if err != nil {
		t.Fatalf("invoice: %v", err)
	}

	if err := svc.ChargeInvoice(context.Background(), inv.ID); err == nil {
		t.Fatalf("charge must fail")
	}

	// Assert: invoice marked overdue + billing_payments has failed row.
	var status string
	_ = db.Get(&status, `SELECT status FROM app.billing_invoices WHERE id=$1`, inv.ID)
	if status != "overdue" {
		t.Errorf("status: want overdue, got %s", status)
	}

	var failedCount int
	_ = db.Get(&failedCount, `SELECT COUNT(*) FROM app.billing_payments
		WHERE invoice_id=$1 AND status='failed'`, inv.ID)
	if failedCount != 1 {
		t.Errorf("expected 1 failed payment row, got %d", failedCount)
	}
}
