package service

import (
	"context"

	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/repository"
)

// ExpiringDocument bundles a document with its days-remaining count.
type ExpiringDocument struct {
	Document       *domain.Document `json:"document"`
	DaysRemaining  int              `json:"days_remaining"`
}

// ExpiryService finds documents approaching retention expiry.
type ExpiryService struct {
	docs      repository.DocumentRepository
	publisher event.Publisher
	alertDays int
	log       zerolog.Logger
}

// NewExpiryService constructs an ExpiryService.
func NewExpiryService(docs repository.DocumentRepository, publisher event.Publisher, alertDays int, log zerolog.Logger) *ExpiryService {
	if alertDays <= 0 {
		alertDays = 30
	}
	return &ExpiryService{docs: docs, publisher: publisher, alertDays: alertDays, log: log}
}

// ListExpiring returns documents expiring within `within` days (or the
// configured default when within <= 0).
func (s *ExpiryService) ListExpiring(ctx context.Context, within int) ([]ExpiringDocument, error) {
	if within <= 0 {
		within = s.alertDays
	}
	items, err := s.docs.ListExpiring(ctx, within)
	if err != nil {
		return nil, err
	}
	out := make([]ExpiringDocument, 0, len(items))
	for _, d := range items {
		out = append(out, ExpiringDocument{Document: d, DaysRemaining: d.DaysUntilExpiry()})
	}
	return out, nil
}

// ScanAndNotify scans expiring documents and emits an event per configured
// threshold (30/15/7/1 days). Intended to be called from a daily cron.
func (s *ExpiryService) ScanAndNotify(ctx context.Context) (int, error) {
	items, err := s.docs.ListExpiring(ctx, s.alertDays)
	if err != nil {
		return 0, err
	}
	thresholds := map[int]struct{}{30: {}, 15: {}, 7: {}, 1: {}}
	emitted := 0
	for _, d := range items {
		days := d.DaysUntilExpiry()
		if days < 0 {
			continue
		}
		if _, ok := thresholds[days]; !ok {
			continue
		}
		if err := s.publisher.Publish(ctx, event.TopicDocumentExpiring, map[string]any{
			"document_id":       d.ID,
			"tenant_id":         d.TenantID,
			"owner_employee_id": d.OwnerEmployeeID,
			"category":          string(d.Category),
			"title":             d.Title,
			"retention_until":   d.RetentionUntil,
			"days_remaining":    days,
		}); err != nil {
			s.log.Warn().Err(err).Msg("emit expiring event")
			continue
		}
		emitted++
	}
	return emitted, nil
}
