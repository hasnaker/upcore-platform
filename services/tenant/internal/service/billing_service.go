package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/repository"
)

// WebhookProvider identifies the payment provider.
type WebhookProvider string

const (
	ProviderStripe WebhookProvider = "stripe"
	ProviderIyzico WebhookProvider = "iyzico"
)

// WebhookEvent is a normalized webhook event passed to the billing service.
type WebhookEvent struct {
	Provider  WebhookProvider `json:"provider"`
	EventID   string          `json:"event_id"`
	EventType string          `json:"event_type"` // e.g. "invoice.paid", "subscription.canceled"
	Payload   json.RawMessage `json:"payload"`
	ReceivedAt time.Time      `json:"received_at"`
}

// InvoicePayload is the minimal invoice payload for event publishing.
type InvoicePayload struct {
	TenantID       uuid.UUID `json:"tenant_id"`
	SubscriptionID uuid.UUID `json:"subscription_id"`
	AmountTRY      int64     `json:"amount_try"`
	Currency       string    `json:"currency"`
	ExternalID     string    `json:"external_id"`
}

// BillingService handles payment provider webhooks and invoice lifecycle.
type BillingService struct {
	subs      repository.SubscriptionRepository
	plans     repository.PlanRepository
	tenants   repository.TenantRepository
	usage     repository.UsageRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewBillingService constructs a BillingService. The tenants repo is retained
// for future invoice/KDV flows that need to read tenant metadata (VKN, locale).
func NewBillingService(
	subs repository.SubscriptionRepository,
	plans repository.PlanRepository,
	tenants repository.TenantRepository,
	usage repository.UsageRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *BillingService {
	return &BillingService{
		subs: subs, plans: plans, tenants: tenants, usage: usage,
		publisher: publisher, log: log,
	}
}

// HandleWebhook routes a normalized webhook event.
func (b *BillingService) HandleWebhook(ctx context.Context, evt WebhookEvent) error {
	b.log.Info().
		Str("provider", string(evt.Provider)).
		Str("event_type", evt.EventType).
		Str("event_id", evt.EventID).
		Msg("billing webhook received")

	switch evt.EventType {
	case "invoice.paid", "payment.succeeded":
		return b.handleInvoicePaid(ctx, evt)
	case "invoice.payment_failed", "payment.failed":
		return b.handleInvoiceFailed(ctx, evt)
	case "subscription.updated", "customer.subscription.updated":
		return b.handleSubscriptionUpdated(ctx, evt)
	case "subscription.canceled", "customer.subscription.deleted":
		return b.handleSubscriptionCanceled(ctx, evt)
	default:
		b.log.Debug().Str("event_type", evt.EventType).Msg("billing: unhandled event type")
		return nil
	}
}

// CalculateMonthlyInvoice computes the invoice total for a tenant based on usage.
// Base price is plan price_monthly; overage is added if usage exceeds caps.
// Overage rate: 50 TRY per extra employee seat beyond cap.
func (b *BillingService) CalculateMonthlyInvoice(ctx context.Context, tenantID uuid.UUID, period time.Time) (int64, error) {
	sub, err := b.subs.GetByTenantID(ctx, tenantID)
	if err != nil {
		return 0, err
	}
	plan, err := b.plans.GetByID(ctx, sub.PlanID)
	if err != nil {
		return 0, err
	}
	var base int64
	if plan.PriceMonthly != nil {
		base = *plan.PriceMonthly
	}
	employees, err := b.usage.Get(ctx, tenantID, domain.MetricEmployees, period)
	if err != nil {
		return 0, err
	}
	cap := int64(plan.SeatCap())
	var overage int64
	if cap > 0 && employees.Value > cap {
		overage = (employees.Value - cap) * 50
	}
	return base + overage, nil
}

func (b *BillingService) handleInvoicePaid(ctx context.Context, evt WebhookEvent) error {
	var p InvoicePayload
	if err := json.Unmarshal(evt.Payload, &p); err != nil {
		return fmt.Errorf("unmarshal invoice paid: %w", err)
	}
	_ = b.publisher.Publish(ctx, event.TopicInvoicePaid, map[string]any{
		"tenant_id":  p.TenantID,
		"amount":     p.AmountTRY,
		"currency":   p.Currency,
		"paid_at":    time.Now().UTC(),
		"external_id": p.ExternalID,
		"provider":   string(evt.Provider),
	})
	return nil
}

func (b *BillingService) handleInvoiceFailed(ctx context.Context, evt WebhookEvent) error {
	var p InvoicePayload
	if err := json.Unmarshal(evt.Payload, &p); err != nil {
		return fmt.Errorf("unmarshal invoice failed: %w", err)
	}
	_ = b.publisher.Publish(ctx, event.TopicInvoiceFailed, map[string]any{
		"tenant_id":   p.TenantID,
		"amount":      p.AmountTRY,
		"currency":    p.Currency,
		"failed_at":   time.Now().UTC(),
		"external_id": p.ExternalID,
		"provider":    string(evt.Provider),
	})
	// Mark subscription past_due.
	if p.SubscriptionID != uuid.Nil {
		sub, err := b.subs.GetByTenantID(ctx, p.TenantID)
		if err == nil {
			sub.Status = domain.SubStatusPastDue
			_ = b.subs.Update(ctx, sub)
		}
	}
	return nil
}

func (b *BillingService) handleSubscriptionUpdated(ctx context.Context, evt WebhookEvent) error {
	// A minimal implementation: reactivate when provider confirms payment.
	var p InvoicePayload
	if err := json.Unmarshal(evt.Payload, &p); err != nil {
		return nil
	}
	if p.TenantID == uuid.Nil {
		return nil
	}
	sub, err := b.subs.GetByTenantID(ctx, p.TenantID)
	if err != nil {
		return err
	}
	if sub.Status == domain.SubStatusPastDue {
		sub.Status = domain.SubStatusActive
		return b.subs.Update(ctx, sub)
	}
	return nil
}

func (b *BillingService) handleSubscriptionCanceled(ctx context.Context, evt WebhookEvent) error {
	var p InvoicePayload
	if err := json.Unmarshal(evt.Payload, &p); err != nil {
		return nil
	}
	if p.TenantID == uuid.Nil {
		return nil
	}
	sub, err := b.subs.GetByTenantID(ctx, p.TenantID)
	if err != nil {
		return err
	}
	if sub.IsCanceled() {
		return nil
	}
	return b.subs.Cancel(ctx, sub.ID, time.Now().UTC())
}
