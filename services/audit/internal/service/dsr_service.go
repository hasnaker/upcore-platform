package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/repository"
)

// DSRService contains the business logic for KVKK data subject rights requests.
type DSRService struct {
	repo      repository.DSRRepository
	publisher event.Publisher
	services  []string // services to fan-out to
	log       zerolog.Logger
}

// NewDSRService constructs a DSRService.
func NewDSRService(
	repo repository.DSRRepository,
	publisher event.Publisher,
	fanoutServices []string,
	log zerolog.Logger,
) *DSRService {
	return &DSRService{
		repo:      repo,
		publisher: publisher,
		services:  fanoutServices,
		log:       log,
	}
}

// Receive creates a new DSR request and publishes a received event.
func (s *DSRService) Receive(ctx context.Context, tenantID uuid.UUID, req *domain.ReceiveDSRRequest) (*domain.DSRRequest, error) {
	dsr := &domain.DSRRequest{
		TenantID:         tenantID,
		DataSubjectEmail: req.DataSubjectEmail,
		RequestType:      req.RequestType,
		Status:           domain.DSRStatusReceived,
		ReceivedAt:       time.Now().UTC(),
	}
	if err := dsr.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, dsr); err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicDSRReceived, map[string]any{
		"request_id":          dsr.ID,
		"tenant_id":           dsr.TenantID,
		"data_subject_email":  dsr.DataSubjectEmail,
		"request_type":        dsr.RequestType,
	})

	return dsr, nil
}

// Verify transitions a DSR request to verifying status.
func (s *DSRService) Verify(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	dsr, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := dsr.Transition(domain.DSRStatusVerifying, actorID); err != nil {
		return err
	}
	return s.repo.Update(ctx, dsr)
}

// Process transitions a DSR request to in_progress status.
func (s *DSRService) Process(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	dsr, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := dsr.Transition(domain.DSRStatusInProgress, actorID); err != nil {
		return err
	}
	return s.repo.Update(ctx, dsr)
}

// Complete transitions a DSR request to completed status.
func (s *DSRService) Complete(ctx context.Context, tenantID, id, actorID uuid.UUID, responseURL string) error {
	dsr, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := dsr.Transition(domain.DSRStatusCompleted, actorID); err != nil {
		return err
	}
	dsr.ResponseDataURL = responseURL
	if err := s.repo.Update(ctx, dsr); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicDSRCompleted, map[string]any{
		"request_id":          dsr.ID,
		"tenant_id":           dsr.TenantID,
		"data_subject_email":  dsr.DataSubjectEmail,
		"request_type":        dsr.RequestType,
	})
	return nil
}

// Reject transitions a DSR request to rejected status.
func (s *DSRService) Reject(ctx context.Context, tenantID, id, actorID uuid.UUID, reason string) error {
	dsr, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := dsr.Transition(domain.DSRStatusRejected, actorID); err != nil {
		return err
	}
	dsr.RejectionReason = reason
	return s.repo.Update(ctx, dsr)
}

// List returns a paginated, filtered list of DSR requests.
func (s *DSRService) List(ctx context.Context, filter domain.DSRFilter) ([]*domain.DSRRequest, int, error) {
	return s.repo.List(ctx, filter)
}

// GetByID retrieves a single DSR request.
func (s *DSRService) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DSRRequest, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// GetOverdueRequests returns DSR requests that have exceeded the 30-day KVKK deadline.
func (s *DSRService) GetOverdueRequests(ctx context.Context, tenantID uuid.UUID) ([]*domain.DSRRequest, error) {
	return s.repo.ListOverdue(ctx, tenantID)
}

// GenerateAccessPackage fan-outs queries to all services, collecting the data
// subject's personal data and building a ZIP archive. Returns a URL to the blob.
func (s *DSRService) GenerateAccessPackage(ctx context.Context, tenantID, dsrID uuid.UUID) (string, error) {
	dsr, err := s.repo.GetByID(ctx, tenantID, dsrID)
	if err != nil {
		return "", err
	}
	if dsr.RequestType != domain.DSRAccess && dsr.RequestType != domain.DSRPortability {
		return "", fmt.Errorf("%w: access package only for access/portability requests", domain.ErrInvalidInput)
	}

	s.log.Info().
		Str("dsr_id", dsrID.String()).
		Strs("services", s.services).
		Msg("starting access package generation fan-out")

	// Fan-out to all services via Service Bus RPC (or direct API).
	// Each service responds with the data subject's data.
	for _, svc := range s.services {
		_ = s.publisher.Publish(ctx, fmt.Sprintf("%s.dsr.access.request.v1", svc), map[string]any{
			"dsr_id":             dsr.ID,
			"tenant_id":          dsr.TenantID,
			"data_subject_email": dsr.DataSubjectEmail,
			"response_topic":     "audit.dsr.access.response.v1",
		})
	}

	// In a real implementation, the responses are aggregated asynchronously
	// and the ZIP is uploaded to Azure Blob Storage. The URL is returned
	// once all services have responded or a timeout occurs.
	blobURL := fmt.Sprintf("https://storage.blob.core.windows.net/dsr-packages/%s/%s.zip",
		tenantID, dsrID)
	return blobURL, nil
}

// ExecuteErasure fan-outs erasure commands for KVKK Madde 7 ("right to be
// forgotten"). Each downstream service decides per-table whether to hard-delete
// or pseudonymize, according to docs/kvkk/hard-vs-soft-delete.md:
//   - Payroll, contracts, tax records (5–10 yıl yasal saklama) → pseudonymize
//     PII columns via pseudonymize_user(tenant_id, user_id) UDF; rows remain.
//   - Audit-log rows → immutable (WORM); the subject row is replaced by a
//     tombstone referrer that links to the pseudonymization event.
//   - All other PII → hard DELETE with ON DELETE CASCADE.
// The audit service itself never hard-deletes; it only records the act.
func (s *DSRService) ExecuteErasure(ctx context.Context, tenantID, dsrID, actorID uuid.UUID) error {
	dsr, err := s.repo.GetByID(ctx, tenantID, dsrID)
	if err != nil {
		return err
	}
	if dsr.RequestType != domain.DSRErasure {
		return fmt.Errorf("%w: erasure only for erasure requests", domain.ErrInvalidInput)
	}

	s.log.Info().
		Str("dsr_id", dsrID.String()).
		Strs("services", s.services).
		Msg("starting erasure fan-out")

	// Fan-out delete commands to all services.
	for _, svc := range s.services {
		_ = s.publisher.Publish(ctx, fmt.Sprintf("%s.dsr.erasure.request.v1", svc), map[string]any{
			"dsr_id":             dsr.ID,
			"tenant_id":          dsr.TenantID,
			"data_subject_email": dsr.DataSubjectEmail,
			"response_topic":     "audit.dsr.erasure.response.v1",
		})
	}

	// Mark as in-progress (completion happens when all acks received).
	if dsr.Status == domain.DSRStatusVerifying {
		if err := dsr.Transition(domain.DSRStatusInProgress, actorID); err != nil {
			return err
		}
		return s.repo.Update(ctx, dsr)
	}
	return nil
}
