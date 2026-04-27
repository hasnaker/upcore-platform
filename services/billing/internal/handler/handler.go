// Package handler exposes HTTP endpoints for the billing service.
package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/billing/internal/service"
)

// Handler is the billing HTTP layer.
type Handler struct {
	DB  *sqlx.DB
	Svc *service.Service
}

// New constructs the handler.
func New(db *sqlx.DB, svc *service.Service) *Handler { return &Handler{DB: db, Svc: svc} }

// Register wires endpoints onto a chi router.
func (h *Handler) Register(r chi.Router) {
	r.Get("/plans", h.ListPlans)
	r.Route("/subscriptions", func(r chi.Router) {
		r.Get("/", h.GetSubscription)
		r.Post("/", h.CreateSubscription)
		r.Post("/cancel", h.CancelSubscription)
	})
	r.Route("/invoices", func(r chi.Router) {
		r.Get("/", h.ListInvoices)
		r.Get("/{id}", h.GetInvoice)
		r.Post("/{id}/charge", h.ChargeInvoice)
	})
	r.Post("/billing/run-monthly", h.RunMonthly)
}

func tenantID(r *http.Request) uuid.UUID {
	v := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if v == "" {
		return uuid.Nil
	}
	id, _ := uuid.Parse(v)
	return id
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// ListPlans returns the public plan catalog (tenant-agnostic).
func (h *Handler) ListPlans(w http.ResponseWriter, r *http.Request) {
	var out []service.Plan
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT id, code, name, monthly_price_try, monthly_price_usd,
		        included_employees, overage_per_employee, features, active
		 FROM app.billing_plans WHERE active=TRUE ORDER BY monthly_price_try`); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"items": out})
}

// GetSubscription returns the tenant's active subscription.
func (h *Handler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var sub service.Subscription
	err := h.DB.GetContext(r.Context(), &sub,
		`SELECT id, tenant_id, plan_id, status, starts_at, renews_at, canceled_at, provider,
		        provider_customer_id, provider_sub_id, trial_ends_at
		 FROM app.billing_subscriptions
		 WHERE tenant_id=$1 AND status IN ('active','trialing','past_due','paused')
		 ORDER BY starts_at DESC LIMIT 1`, tid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": "no_active_subscription"})
		return
	}
	writeJSON(w, 200, sub)
}

// CreateSubscription starts a new subscription.
// Body: {plan_code, provider, provider_customer_id?}
func (h *Handler) CreateSubscription(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		PlanCode           string `json:"plan_code"`
		Provider           string `json:"provider"`
		ProviderCustomerID string `json:"provider_customer_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	var planID uuid.UUID
	if err := h.DB.GetContext(r.Context(), &planID,
		`SELECT id FROM app.billing_plans WHERE code=$1 AND active=TRUE`, body.PlanCode); err != nil {
		writeJSON(w, 404, map[string]string{"error": "plan_not_found"})
		return
	}
	var subID uuid.UUID
	now := time.Now().UTC()
	renew := now.AddDate(0, 1, 0)
	err := h.DB.GetContext(r.Context(), &subID,
		`INSERT INTO app.billing_subscriptions
		 (tenant_id, plan_id, status, starts_at, renews_at, provider, provider_customer_id)
		 VALUES ($1,$2,'active',$3,$4,$5,NULLIF($6,''))
		 RETURNING id`,
		tid, planID, now, renew, body.Provider, body.ProviderCustomerID)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, map[string]any{"id": subID})
}

// CancelSubscription marks the active subscription as canceled.
func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.billing_subscriptions
		 SET status='canceled', canceled_at=NOW(), updated_at=NOW()
		 WHERE tenant_id=$1 AND status IN ('active','trialing','past_due','paused')`,
		tid); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true})
}

// ListInvoices returns the tenant's invoice history.
func (h *Handler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	out := []service.Invoice{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT id, tenant_id, subscription_id, invoice_no, period_start, period_end,
		        subtotal_try, kdv_try, total_try, currency, status, issued_at, due_at, paid_at, line_items
		 FROM app.billing_invoices
		 WHERE tenant_id=$1 ORDER BY period_start DESC LIMIT 100`, tid); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"items": out})
}

// GetInvoice returns a single invoice.
func (h *Handler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	var inv service.Invoice
	if err := h.DB.GetContext(r.Context(), &inv,
		`SELECT id, tenant_id, subscription_id, invoice_no, period_start, period_end,
		        subtotal_try, kdv_try, total_try, currency, status, issued_at, due_at, paid_at, line_items
		 FROM app.billing_invoices WHERE tenant_id=$1 AND id=$2`, tid, id); err != nil {
		writeJSON(w, 404, map[string]string{"error": "not_found"})
		return
	}
	writeJSON(w, 200, inv)
}

// ChargeInvoice triggers payment on an open invoice.
func (h *Handler) ChargeInvoice(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if err := h.Svc.ChargeInvoice(r.Context(), id); err != nil {
		writeJSON(w, 422, map[string]string{"error": "charge_failed", "detail": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "invoice_id": id})
}

// RunMonthly invokes the monthly invoice calculation for a tenant. Admin
// scheduler calls this; in production a cron worker runs it for all tenants.
func (h *Handler) RunMonthly(w http.ResponseWriter, r *http.Request) {
	tid := tenantID(r)
	if tid == uuid.Nil {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		EmployeeCount int `json:"employee_count"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	inv, err := h.Svc.CalculateMonthlyInvoice(r.Context(), tid, time.Now().UTC(), body.EmployeeCount)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, inv)
}
