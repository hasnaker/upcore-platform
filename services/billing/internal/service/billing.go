// Package service orchestrates subscription + invoicing + payment flows.
// Provider adapters are pluggable (Iyzico for TR, Stripe for global) via
// the PaymentProvider interface so neither SDK lives in the core path.
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// Plan mirrors app.billing_plans.
type Plan struct {
	ID                 uuid.UUID `db:"id" json:"id"`
	Code               string    `db:"code" json:"code"`
	Name               string    `db:"name" json:"name"`
	MonthlyPriceTRY    float64   `db:"monthly_price_try" json:"monthly_price_try"`
	MonthlyPriceUSD    *float64  `db:"monthly_price_usd" json:"monthly_price_usd,omitempty"`
	IncludedEmployees  int       `db:"included_employees" json:"included_employees"`
	OveragePerEmployee float64   `db:"overage_per_employee" json:"overage_per_employee"`
	Features           []byte    `db:"features" json:"features"`
	Active             bool      `db:"active" json:"active"`
}

// Subscription mirrors app.billing_subscriptions.
type Subscription struct {
	ID                   uuid.UUID  `db:"id" json:"id"`
	TenantID             uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	PlanID               uuid.UUID  `db:"plan_id" json:"plan_id"`
	Status               string     `db:"status" json:"status"`
	StartsAt             time.Time  `db:"starts_at" json:"starts_at"`
	RenewsAt             *time.Time `db:"renews_at" json:"renews_at,omitempty"`
	CanceledAt           *time.Time `db:"canceled_at" json:"canceled_at,omitempty"`
	Provider             string     `db:"provider" json:"provider"`
	ProviderCustomerID   *string    `db:"provider_customer_id" json:"provider_customer_id,omitempty"`
	ProviderSubID        *string    `db:"provider_sub_id" json:"provider_sub_id,omitempty"`
	TrialEndsAt          *time.Time `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
}

// Invoice mirrors app.billing_invoices.
type Invoice struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	SubscriptionID  *uuid.UUID `db:"subscription_id" json:"subscription_id,omitempty"`
	InvoiceNo       *string    `db:"invoice_no" json:"invoice_no,omitempty"`
	PeriodStart     time.Time  `db:"period_start" json:"period_start"`
	PeriodEnd       time.Time  `db:"period_end" json:"period_end"`
	SubtotalTRY     float64    `db:"subtotal_try" json:"subtotal_try"`
	KdvTRY          float64    `db:"kdv_try" json:"kdv_try"`
	TotalTRY        float64    `db:"total_try" json:"total_try"`
	Currency        string     `db:"currency" json:"currency"`
	Status          string     `db:"status" json:"status"`
	IssuedAt        *time.Time `db:"issued_at" json:"issued_at,omitempty"`
	DueAt           *time.Time `db:"due_at" json:"due_at,omitempty"`
	PaidAt          *time.Time `db:"paid_at" json:"paid_at,omitempty"`
	LineItems       []byte     `db:"line_items" json:"line_items"`
}

// PaymentProvider abstracts Iyzico + Stripe. Adapter layer injects a real
// implementation; this core service doesn't know which backend is active.
type PaymentProvider interface {
	Name() string
	Charge(ctx context.Context, customerID string, amountTRY float64, reference string) (paymentID string, err error)
	CreateCustomer(ctx context.Context, tenantID uuid.UUID, email, vkn string) (string, error)
	Refund(ctx context.Context, paymentID string, amountTRY float64) error
}

// Service is the billing orchestrator.
type Service struct {
	DB        *sqlx.DB
	Providers map[string]PaymentProvider // "iyzico", "stripe"
	Log       zerolog.Logger
}

// NewService constructs.
func NewService(db *sqlx.DB, log zerolog.Logger) *Service {
	return &Service{DB: db, Providers: map[string]PaymentProvider{}, Log: log}
}

// RegisterProvider allows wiring Iyzico/Stripe adapters from main.go.
func (s *Service) RegisterProvider(name string, p PaymentProvider) {
	s.Providers[name] = p
}

// CalculateMonthlyInvoice computes a single tenant's invoice for the given
// period: base plan + overage (employee_count > included_employees). KDV
// %20. Called by the monthly billing cron.
func (s *Service) CalculateMonthlyInvoice(ctx context.Context, tenantID uuid.UUID, period time.Time, currentEmployees int) (*Invoice, error) {
	var sub Subscription
	if err := s.DB.GetContext(ctx, &sub,
		`SELECT id, tenant_id, plan_id, status, starts_at, renews_at, canceled_at, provider,
		        provider_customer_id, provider_sub_id, trial_ends_at
		 FROM app.billing_subscriptions
		 WHERE tenant_id=$1 AND status IN ('active','trialing','past_due')
		 ORDER BY starts_at DESC LIMIT 1`, tenantID); err != nil {
		return nil, fmt.Errorf("no active subscription: %w", err)
	}
	var plan Plan
	if err := s.DB.GetContext(ctx, &plan,
		`SELECT id, code, name, monthly_price_try, monthly_price_usd, included_employees,
		        overage_per_employee, features, active
		 FROM app.billing_plans WHERE id=$1`, sub.PlanID); err != nil {
		return nil, err
	}

	base := plan.MonthlyPriceTRY
	overage := 0.0
	if currentEmployees > plan.IncludedEmployees && plan.OveragePerEmployee > 0 {
		overage = float64(currentEmployees-plan.IncludedEmployees) * plan.OveragePerEmployee
	}
	subtotal := base + overage
	kdv := subtotal * 0.20
	total := subtotal + kdv

	periodStart := time.Date(period.Year(), period.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, -1)

	inv := Invoice{
		TenantID:       tenantID,
		SubscriptionID: &sub.ID,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		SubtotalTRY:    subtotal,
		KdvTRY:         kdv,
		TotalTRY:       total,
		Currency:       "TRY",
		Status:         "issued",
	}
	now := time.Now().UTC()
	due := now.AddDate(0, 0, 14)
	inv.IssuedAt = &now
	inv.DueAt = &due

	if err := s.DB.GetContext(ctx, &inv.ID,
		`INSERT INTO app.billing_invoices
		 (tenant_id, subscription_id, period_start, period_end, subtotal_try, kdv_try, total_try, currency, status, issued_at, due_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		 RETURNING id`,
		inv.TenantID, inv.SubscriptionID, inv.PeriodStart, inv.PeriodEnd,
		inv.SubtotalTRY, inv.KdvTRY, inv.TotalTRY, inv.Currency, inv.Status, inv.IssuedAt, inv.DueAt); err != nil {
		return nil, fmt.Errorf("insert invoice: %w", err)
	}
	return &inv, nil
}

// ChargeInvoice attempts payment via the subscription's provider. On
// success, marks invoice paid and records a billing_payments row. On
// failure increments retry_count; 3-strike rule handled by the cron.
func (s *Service) ChargeInvoice(ctx context.Context, invoiceID uuid.UUID) error {
	var inv Invoice
	if err := s.DB.GetContext(ctx, &inv,
		`SELECT id, tenant_id, subscription_id, total_try, currency, status FROM app.billing_invoices WHERE id=$1`,
		invoiceID); err != nil {
		return err
	}
	if inv.Status == "paid" {
		return nil
	}
	var sub Subscription
	if err := s.DB.GetContext(ctx, &sub,
		`SELECT id, provider, provider_customer_id FROM app.billing_subscriptions WHERE id=$1`,
		inv.SubscriptionID); err != nil {
		return err
	}
	provider, ok := s.Providers[sub.Provider]
	if !ok {
		return fmt.Errorf("unknown provider: %s", sub.Provider)
	}
	custID := ""
	if sub.ProviderCustomerID != nil {
		custID = *sub.ProviderCustomerID
	}
	paymentID, err := provider.Charge(ctx, custID, inv.TotalTRY, fmt.Sprintf("invoice-%s", invoiceID))
	if err != nil {
		// Log failed payment attempt.
		_, _ = s.DB.ExecContext(ctx,
			`INSERT INTO app.billing_payments (tenant_id, invoice_id, amount_try, method, status, failure_reason, retried_at, retry_count)
			 VALUES ($1,$2,$3,'card','failed',$4, NOW(),
			   (SELECT COALESCE(MAX(retry_count),0)+1 FROM app.billing_payments WHERE invoice_id=$2))`,
			inv.TenantID, inv.ID, inv.TotalTRY, err.Error())
		_, _ = s.DB.ExecContext(ctx,
			`UPDATE app.billing_invoices SET status='overdue', updated_at=NOW() WHERE id=$1`, inv.ID)
		return err
	}
	_, err = s.DB.ExecContext(ctx,
		`INSERT INTO app.billing_payments (tenant_id, invoice_id, amount_try, method, status, provider_payment_id)
		 VALUES ($1,$2,$3,'card','succeeded',$4)`,
		inv.TenantID, inv.ID, inv.TotalTRY, paymentID)
	if err != nil {
		return err
	}
	_, err = s.DB.ExecContext(ctx,
		`UPDATE app.billing_invoices SET status='paid', paid_at=NOW(), updated_at=NOW() WHERE id=$1`, inv.ID)
	return err
}
