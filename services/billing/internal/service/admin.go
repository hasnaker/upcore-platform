// Admin billing analytics — MRR/ARR, aggregations, plan breakdown, invoice
// listing, manual invoice issuance. Platform-admin only. All read queries run
// with RLS session vars stripped (SET LOCAL app.bypass_rls=true would need
// superuser; instead admin uses a dedicated connection; here we use raw SQL
// without tenant filter for ALL tenant aggregations).
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// PlanCount is one bucket of the plan distribution histogram.
type PlanCount struct {
	PlanID           uuid.UUID `db:"plan_id" json:"plan_id"`
	PlanCode         string    `db:"plan_code" json:"plan_code"`
	PlanName         string    `db:"plan_name" json:"plan_name"`
	MonthlyPriceTRY  float64   `db:"monthly_price_try" json:"monthly_price_try"`
	Subscriptions    int       `db:"subscriptions" json:"subscriptions"`
	MRRContribution  float64   `db:"mrr_contribution" json:"mrr_contribution_try"`
}

// MRRTrendPoint is a monthly MRR value in the last-12-months series.
type MRRTrendPoint struct {
	Month     string  `db:"month" json:"month"`            // "2026-04"
	MRRTry    float64 `db:"mrr_try" json:"mrr_try"`
	ActiveSub int     `db:"active_sub" json:"active_subscriptions"`
}

// BillingSummary aggregates the full dashboard.
type BillingSummary struct {
	AsOf                time.Time       `json:"as_of"`
	MRRTry              float64         `json:"mrr_try"`
	ARRTry              float64         `json:"arr_try"`
	ActiveSubscriptions int             `json:"active_subscriptions"`
	TotalTenants        int             `json:"total_tenants"`
	PlanDistribution    []PlanCount     `json:"plan_distribution"`
	Trend12m            []MRRTrendPoint `json:"trend_12m"`
}

// AdminInvoiceRow enriches the invoice with tenant identity for admin UIs.
type AdminInvoiceRow struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	TenantName     string     `db:"tenant_name" json:"tenant_name"`
	TenantSlug     string     `db:"tenant_slug" json:"tenant_slug"`
	SubscriptionID *uuid.UUID `db:"subscription_id" json:"subscription_id,omitempty"`
	InvoiceNo      *string    `db:"invoice_no" json:"invoice_no,omitempty"`
	PeriodStart    time.Time  `db:"period_start" json:"period_start"`
	PeriodEnd      time.Time  `db:"period_end" json:"period_end"`
	SubtotalTRY    float64    `db:"subtotal_try" json:"subtotal_try"`
	KdvTRY         float64    `db:"kdv_try" json:"kdv_try"`
	TotalTRY       float64    `db:"total_try" json:"total_try"`
	Currency       string     `db:"currency" json:"currency"`
	Status         string     `db:"status" json:"status"`
	IssuedAt       *time.Time `db:"issued_at" json:"issued_at,omitempty"`
	DueAt          *time.Time `db:"due_at" json:"due_at,omitempty"`
	PaidAt         *time.Time `db:"paid_at" json:"paid_at,omitempty"`
	PDFURL         *string    `db:"pdf_url" json:"pdf_url,omitempty"`
	LineItems      []byte     `db:"line_items" json:"line_items"`
}

// InvoiceFilter narrows ListAdminInvoices.
type InvoiceFilter struct {
	Status   string
	TenantID uuid.UUID
	From     *time.Time
	To       *time.Time
	Limit    int
	Offset   int
}

// ManualInvoiceInput is the payload for ManualInvoice.
type ManualInvoiceInput struct {
	TenantID    uuid.UUID              `json:"tenant_id"`
	DueAt       *time.Time             `json:"due_at,omitempty"`
	Currency    string                 `json:"currency,omitempty"`
	KDVRate     float64                `json:"kdv_rate,omitempty"` // default 0.20
	LineItems   []ManualInvoiceLine    `json:"line_items"`
	Notes       string                 `json:"notes,omitempty"`
}

// ManualInvoiceLine is one billable line.
type ManualInvoiceLine struct {
	Description string  `json:"description"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

// ChurnRiskRow represents a per-tenant churn risk score.
type ChurnRiskRow struct {
	TenantID       uuid.UUID `db:"tenant_id" json:"tenant_id"`
	TenantName     string    `db:"tenant_name" json:"tenant_name"`
	Score          int       `json:"score"`            // 0-100
	UsageDrop3mPct float64   `db:"usage_drop_3m_pct" json:"usage_drop_3m_pct"`
	PaymentLateN   int       `db:"payment_late_n" json:"payment_late_count"`
	OpenTickets    int       `db:"open_tickets" json:"open_tickets"`
}

// ---------------------------------------------------------------------------
// AdminService
// ---------------------------------------------------------------------------

// AdminService implements admin-wide billing analytics on top of Service.
type AdminService struct {
	Core *Service
}

// NewAdminService constructs.
func NewAdminService(core *Service) *AdminService { return &AdminService{Core: core} }

// Summary calculates MRR, ARR, plan distribution, and 12-month trend. MRR is
// the sum of monthly_price_try for every currently-active / trialing /
// past_due subscription, joined against billing_plans.
func (a *AdminService) Summary(ctx context.Context, now time.Time) (*BillingSummary, error) {
	if a.Core == nil || a.Core.DB == nil {
		return nil, errors.New("admin service not wired")
	}
	db := a.Core.DB

	out := &BillingSummary{AsOf: now.UTC()}

	// Plan distribution + MRR
	planRows := []PlanCount{}
	if err := db.SelectContext(ctx, &planRows, `
		SELECT p.id                  AS plan_id,
		       p.code                AS plan_code,
		       p.name                AS plan_name,
		       p.monthly_price_try   AS monthly_price_try,
		       COUNT(s.id)           AS subscriptions,
		       COALESCE(SUM(p.monthly_price_try), 0) AS mrr_contribution
		  FROM app.billing_plans p
		  LEFT JOIN app.billing_subscriptions s
		    ON s.plan_id = p.id
		   AND s.status IN ('active','trialing','past_due')
		 GROUP BY p.id, p.code, p.name, p.monthly_price_try
		 ORDER BY p.monthly_price_try DESC
	`); err != nil {
		return nil, fmt.Errorf("plan distribution: %w", err)
	}
	out.PlanDistribution = planRows
	for _, pc := range planRows {
		out.MRRTry += pc.MRRContribution
		out.ActiveSubscriptions += pc.Subscriptions
	}
	out.ARRTry = out.MRRTry * 12

	// Total tenants count (active + trialing + past_due).
	if err := db.GetContext(ctx, &out.TotalTenants, `
		SELECT COUNT(DISTINCT tenant_id)
		  FROM app.billing_subscriptions
		 WHERE status IN ('active','trialing','past_due')
	`); err != nil {
		return nil, fmt.Errorf("tenant count: %w", err)
	}

	// 12-month trend: for each of the last 12 calendar months, count
	// subscriptions whose lifespan (starts_at, COALESCE(canceled_at, renews_at, now))
	// covered the first of that month; MRR = sum of matching plan prices.
	trend := []MRRTrendPoint{}
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -11, 0)
	for i := 0; i < 12; i++ {
		mEnd := monthStart.AddDate(0, 1, 0)
		var point MRRTrendPoint
		point.Month = monthStart.Format("2006-01")
		if err := db.GetContext(ctx, &point, `
			SELECT COALESCE(SUM(p.monthly_price_try), 0) AS mrr_try,
			       COUNT(DISTINCT s.id)                  AS active_sub
			  FROM app.billing_subscriptions s
			  JOIN app.billing_plans p ON p.id = s.plan_id
			 WHERE s.starts_at < $2
			   AND (s.canceled_at IS NULL OR s.canceled_at >= $1)
			   AND s.status <> 'expired'
		`, monthStart, mEnd); err != nil {
			return nil, fmt.Errorf("trend month %s: %w", point.Month, err)
		}
		trend = append(trend, point)
		monthStart = mEnd
	}
	out.Trend12m = trend

	return out, nil
}

// ListInvoices returns a paginated, admin-scoped invoice list joined with
// tenant identity.
func (a *AdminService) ListInvoices(ctx context.Context, f InvoiceFilter) ([]AdminInvoiceRow, int, error) {
	if a.Core == nil || a.Core.DB == nil {
		return nil, 0, errors.New("admin service not wired")
	}
	db := a.Core.DB
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	conds := []string{"1=1"}
	args := []any{}
	idx := 1
	if f.Status != "" {
		conds = append(conds, fmt.Sprintf("i.status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.TenantID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("i.tenant_id = $%d", idx))
		args = append(args, f.TenantID)
		idx++
	}
	if f.From != nil {
		conds = append(conds, fmt.Sprintf("i.period_start >= $%d", idx))
		args = append(args, *f.From)
		idx++
	}
	if f.To != nil {
		conds = append(conds, fmt.Sprintf("i.period_start < $%d", idx))
		args = append(args, *f.To)
		idx++
	}

	where := strings.Join(conds, " AND ")

	var total int
	countQ := "SELECT COUNT(*) FROM app.billing_invoices i WHERE " + where
	if err := db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count invoices: %w", err)
	}

	args = append(args, f.Limit, f.Offset)
	listQ := fmt.Sprintf(`
		SELECT i.id, i.tenant_id,
		       COALESCE(t.name, '') AS tenant_name,
		       COALESCE(t.slug, '') AS tenant_slug,
		       i.subscription_id, i.invoice_no, i.period_start, i.period_end,
		       i.subtotal_try, i.kdv_try, i.total_try, i.currency, i.status,
		       i.issued_at, i.due_at, i.paid_at, i.pdf_url, i.line_items
		  FROM app.billing_invoices i
		  LEFT JOIN app.tenants t ON t.id = i.tenant_id
		 WHERE %s
		 ORDER BY i.period_start DESC, i.created_at DESC
		 LIMIT $%d OFFSET $%d
	`, where, idx, idx+1)

	out := []AdminInvoiceRow{}
	if err := db.SelectContext(ctx, &out, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list invoices: %w", err)
	}
	return out, total, nil
}

// ManualInvoice inserts a one-off invoice with operator-defined line items.
// KDV is calculated server-side; invoice_no is auto-generated (UPC-YYYYMM-NNNN).
// Line items are persisted as jsonb. pdf_url is set to the deterministic path
// the invoices-pdf worker will fill (/billing/invoices/{id}.pdf).
func (a *AdminService) ManualInvoice(ctx context.Context, in ManualInvoiceInput) (*AdminInvoiceRow, error) {
	if a.Core == nil || a.Core.DB == nil {
		return nil, errors.New("admin service not wired")
	}
	if in.TenantID == uuid.Nil {
		return nil, errors.New("tenant_id required")
	}
	if len(in.LineItems) == 0 {
		return nil, errors.New("at least one line item required")
	}
	if in.KDVRate < 0 || in.KDVRate > 1 {
		return nil, errors.New("kdv_rate must be between 0 and 1")
	}
	if in.KDVRate == 0 {
		in.KDVRate = 0.20
	}
	if in.Currency == "" {
		in.Currency = "TRY"
	}

	// Compute subtotal.
	subtotal := 0.0
	enriched := make([]map[string]any, 0, len(in.LineItems))
	for _, li := range in.LineItems {
		if li.Quantity <= 0 || li.UnitPrice < 0 || strings.TrimSpace(li.Description) == "" {
			return nil, fmt.Errorf("line item invalid: %+v", li)
		}
		amount := li.Quantity * li.UnitPrice
		subtotal += amount
		enriched = append(enriched, map[string]any{
			"description": li.Description,
			"quantity":    li.Quantity,
			"unit_price":  li.UnitPrice,
			"amount":      amount,
		})
	}
	// Round to 2 decimals.
	subtotal = round2(subtotal)
	kdv := round2(subtotal * in.KDVRate)
	total := round2(subtotal + kdv)

	liJSON, err := json.Marshal(enriched)
	if err != nil {
		return nil, fmt.Errorf("marshal line items: %w", err)
	}

	now := time.Now().UTC()
	dueAt := now.AddDate(0, 0, 14)
	if in.DueAt != nil {
		dueAt = *in.DueAt
	}
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, -1)
	invoiceNo := fmt.Sprintf("UPC-%s-%s", now.Format("200601"), strings.ToUpper(uuid.New().String()[0:6]))

	var id uuid.UUID
	err = a.Core.DB.GetContext(ctx, &id, `
		INSERT INTO app.billing_invoices (
			tenant_id, invoice_no, period_start, period_end,
			subtotal_try, kdv_try, total_try, currency, status,
			issued_at, due_at, line_items
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9, $10, $11::jsonb)
		RETURNING id
	`, in.TenantID, invoiceNo, periodStart, periodEnd,
		subtotal, kdv, total, in.Currency, now, dueAt, string(liJSON))
	if err != nil {
		return nil, fmt.Errorf("insert manual invoice: %w", err)
	}

	pdfPath := fmt.Sprintf("/billing/invoices/%s.pdf", id.String())
	if _, err := a.Core.DB.ExecContext(ctx, `
		UPDATE app.billing_invoices SET pdf_url=$1 WHERE id=$2
	`, pdfPath, id); err != nil {
		return nil, fmt.Errorf("set pdf_url: %w", err)
	}

	row := AdminInvoiceRow{
		ID:          id,
		TenantID:    in.TenantID,
		InvoiceNo:   &invoiceNo,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		SubtotalTRY: subtotal,
		KdvTRY:      kdv,
		TotalTRY:    total,
		Currency:    in.Currency,
		Status:      "issued",
		IssuedAt:    &now,
		DueAt:       &dueAt,
		PDFURL:      &pdfPath,
		LineItems:   liJSON,
	}
	return &row, nil
}

// ChurnRisk aggregates a simple risk score. Usage drop is computed from
// usage_counters (the canonical metered usage table managed by the tenant
// service). Payment lateness counts 'overdue'/'past_due'/'unpaid' invoices in
// the last 3 months. Open tickets counts rows in app.support_tickets — when
// the tickets table is absent (early environments), that factor is treated as
// zero so the query never fails.
//
// Returns up to `limit` highest-risk tenants. Score 0..100.
func (a *AdminService) ChurnRisk(ctx context.Context, limit int) ([]ChurnRiskRow, error) {
	if a.Core == nil || a.Core.DB == nil {
		return nil, errors.New("admin service not wired")
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	// Detect optional tables so the query composes cleanly.
	hasUsageCounters := a.tableExists(ctx, "usage_counters")
	hasSupport := a.tableExists(ctx, "support_tickets")

	usageCTE := `SELECT tenant_id, 0::numeric AS ev_recent, 0::numeric AS ev_prev FROM app.tenants WHERE FALSE`
	if hasUsageCounters {
		usageCTE = `
			SELECT tenant_id,
			       COALESCE(SUM(CASE WHEN period_start >= NOW() - INTERVAL '30 days' THEN value ELSE 0 END), 0) AS ev_recent,
			       COALESCE(SUM(CASE WHEN period_start <  NOW() - INTERVAL '30 days'
			                          AND period_start >= NOW() - INTERVAL '120 days' THEN value ELSE 0 END) / 3.0, 0) AS ev_prev
			  FROM usage_counters
			 WHERE metric IN ('api_calls','assessments','employees')
			 GROUP BY tenant_id`
	}
	supportCTE := `SELECT tenant_id, 0::int AS n FROM app.tenants WHERE FALSE`
	if hasSupport {
		supportCTE = `SELECT tenant_id, COUNT(*)::int AS n FROM app.support_tickets WHERE status='open' GROUP BY tenant_id`
	}

	query := fmt.Sprintf(`
		WITH active_tenants AS (
			SELECT DISTINCT tenant_id
			  FROM app.billing_subscriptions
			 WHERE status IN ('active','trialing','past_due')
		),
		usage AS (%s),
		late_payments AS (
			SELECT tenant_id, COUNT(*) AS n
			  FROM app.billing_invoices
			 WHERE status IN ('overdue','past_due','unpaid')
			   AND issued_at >= NOW() - INTERVAL '90 days'
			 GROUP BY tenant_id
		),
		support AS (%s)
		SELECT a.tenant_id,
		       COALESCE(t.name, '') AS tenant_name,
		       COALESCE(CASE
		                   WHEN u.ev_prev > 0
		                   THEN GREATEST(0, (u.ev_prev - u.ev_recent) / u.ev_prev) * 100
		                   ELSE 0
		                END, 0) AS usage_drop_3m_pct,
		       COALESCE(lp.n, 0)::int AS payment_late_n,
		       COALESCE(s.n,  0)::int AS open_tickets
		  FROM active_tenants a
		  LEFT JOIN app.tenants   t  ON t.id          = a.tenant_id
		  LEFT JOIN usage         u  ON u.tenant_id   = a.tenant_id
		  LEFT JOIN late_payments lp ON lp.tenant_id  = a.tenant_id
		  LEFT JOIN support       s  ON s.tenant_id   = a.tenant_id
		 ORDER BY payment_late_n DESC, usage_drop_3m_pct DESC
		 LIMIT $1
	`, usageCTE, supportCTE)

	rows := []ChurnRiskRow{}
	if err := a.Core.DB.SelectContext(ctx, &rows, query, limit); err != nil {
		return nil, fmt.Errorf("churn risk: %w", err)
	}
	for i := range rows {
		rows[i].Score = scoreChurn(rows[i])
	}
	return rows, nil
}

// tableExists checks information_schema for a table. Used to opt-out of
// optional churn-risk inputs that don't exist in every environment.
func (a *AdminService) tableExists(ctx context.Context, name string) bool {
	if a.Core == nil || a.Core.DB == nil {
		return false
	}
	var exists bool
	if err := a.Core.DB.GetContext(ctx, &exists,
		`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=$1)`,
		name); err != nil {
		return false
	}
	return exists
}

func scoreChurn(r ChurnRiskRow) int {
	// Weighted model:
	//   50% usage drop (0-100 clamped)
	//   30% payment lateness (each late = +15)
	//   20% open tickets (each open = +8)
	score := 0.5*clamp01(r.UsageDrop3mPct/100) + 0.3*clamp01(float64(r.PaymentLateN)*0.5) + 0.2*clamp01(float64(r.OpenTickets)*0.25)
	v := int(score * 100)
	if v < 0 {
		v = 0
	}
	if v > 100 {
		v = 100
	}
	return v
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func round2(v float64) float64 {
	return float64(int64(v*100+0.5)) / 100
}

// PortalProvider is implemented by providers capable of creating a Stripe
// Customer Portal session. Only Stripe supports this in UpCore today.
type PortalProvider interface {
	PortalSession(ctx context.Context, customerID, returnURL string) (string, error)
}

// CreatePortalSession returns a portal URL for the tenant's Stripe customer.
// Requires the tenant to have an active Stripe subscription.
func (a *AdminService) CreatePortalSession(ctx context.Context, tenantID uuid.UUID, returnURL string) (string, error) {
	if a.Core == nil || a.Core.DB == nil {
		return "", errors.New("admin service not wired")
	}
	if tenantID == uuid.Nil {
		return "", errors.New("tenant_id required")
	}
	var custID string
	err := a.Core.DB.GetContext(ctx, &custID, `
		SELECT COALESCE(provider_customer_id, '')
		  FROM app.billing_subscriptions
		 WHERE tenant_id = $1
		   AND provider  = 'stripe'
		   AND provider_customer_id IS NOT NULL
		 ORDER BY starts_at DESC
		 LIMIT 1
	`, tenantID)
	if err != nil {
		return "", fmt.Errorf("stripe customer lookup: %w", err)
	}
	if custID == "" {
		return "", errors.New("tenant has no Stripe customer")
	}
	prov, ok := a.Core.Providers["stripe"]
	if !ok {
		return "", errors.New("stripe provider not registered")
	}
	pp, ok := prov.(PortalProvider)
	if !ok {
		return "", errors.New("provider does not support portal session")
	}
	return pp.PortalSession(ctx, custID, returnURL)
}
