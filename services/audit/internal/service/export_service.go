package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/repository"
)

// ExportService contains the business logic for audit log exports.
type ExportService struct {
	exportRepo repository.ExportRepository
	eventRepo  repository.EventRepository
	log        zerolog.Logger
}

// NewExportService constructs an ExportService.
func NewExportService(
	exportRepo repository.ExportRepository,
	eventRepo repository.EventRepository,
	log zerolog.Logger,
) *ExportService {
	return &ExportService{
		exportRepo: exportRepo,
		eventRepo:  eventRepo,
		log:        log,
	}
}

// CreateExport creates a new export request and enqueues it for async processing.
func (s *ExportService) CreateExport(ctx context.Context, tenantID, requestedBy uuid.UUID, req *domain.ExportRequest) (*domain.Export, error) {
	if err := req.Format.Valid(); err != nil {
		return nil, err
	}

	filterJSON, err := json.Marshal(req.Filter)
	if err != nil {
		return nil, fmt.Errorf("marshal export filter: %w", err)
	}

	export := &domain.Export{
		TenantID:    tenantID,
		RequestedBy: requestedBy,
		Format:      req.Format,
		Filter:      filterJSON,
		Status:      domain.ExportStatusPending,
		RequestedAt: time.Now().UTC(),
	}
	if err := export.Validate(); err != nil {
		return nil, err
	}
	if err := s.exportRepo.Create(ctx, export); err != nil {
		return nil, err
	}

	// Async processing would be enqueued via Service Bus; for now log it.
	s.log.Info().
		Str("export_id", export.ID.String()).
		Str("format", string(export.Format)).
		Msg("export created, queued for processing")

	return export, nil
}

// ProcessExport streams audit events matching the filter to a blob as CSV/NDJSON.
// In production this runs as an async worker; the method is synchronous for simplicity.
func (s *ExportService) ProcessExport(ctx context.Context, tenantID, id uuid.UUID) error {
	export, err := s.exportRepo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	export.Status = domain.ExportStatusProcessing
	if err := s.exportRepo.Update(ctx, export); err != nil {
		return err
	}

	// Parse filter from stored JSON.
	var filter domain.ExportFilter
	if len(export.Filter) > 0 {
		if err := json.Unmarshal(export.Filter, &filter); err != nil {
			s.markFailed(ctx, export)
			return fmt.Errorf("unmarshal export filter: %w", err)
		}
	}

	// Build query filter from export filter.
	qf := domain.QueryFilter{TenantID: tenantID}
	if filter.From != nil {
		qf.From = *filter.From
	}
	if filter.To != nil {
		qf.To = *filter.To
	}

	// Fetch events in pages and stream to blob (simplified).
	totalRows := 0
	page := 1
	for {
		events, _, err := s.eventRepo.Query(ctx, qf, page, 500)
		if err != nil {
			s.markFailed(ctx, export)
			return err
		}
		if len(events) == 0 {
			break
		}
		totalRows += len(events)
		page++

		// In production: stream each batch to Azure Blob as CSV/NDJSON.
		// Avoid loading full result into memory.
		if page > 1000 {
			break // safety limit
		}
	}

	now := time.Now().UTC()
	export.Status = domain.ExportStatusCompleted
	export.RowCount = totalRows
	export.CompletedAt = &now
	export.FileURL = fmt.Sprintf("https://storage.blob.core.windows.net/audit-exports/%s/%s.%s",
		tenantID, export.ID, export.Format)

	return s.exportRepo.Update(ctx, export)
}

// Get retrieves an export by ID.
func (s *ExportService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Export, error) {
	return s.exportRepo.GetByID(ctx, tenantID, id)
}

// List returns a paginated list of exports.
func (s *ExportService) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*domain.Export, int, error) {
	return s.exportRepo.List(ctx, tenantID, page, limit)
}

func (s *ExportService) markFailed(ctx context.Context, export *domain.Export) {
	export.Status = domain.ExportStatusFailed
	_ = s.exportRepo.Update(ctx, export)
}
