package service

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/esignature"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/storage"
)

// SignatureInitiateRequest describes a new signature request.
type SignatureInitiateRequest struct {
	TenantID         uuid.UUID
	DocumentID       uuid.UUID
	SignerEmployeeID uuid.UUID
	Provider         domain.SignProvider
	SignerName       string
	SignerTCKN       string
	SignerEmail      string
	CallbackURL      string
}

// SignatureService manages e-signature workflows. For V1, sessions are kept
// in-memory alongside the provider stub; a persistent signature table is
// introduced in V2.
type SignatureService struct {
	mu        sync.RWMutex
	signatures map[uuid.UUID]*domain.ESignature
	providers  map[domain.SignProvider]esignature.ESignatureProvider
	docs       repository.DocumentRepository
	versions   repository.VersionRepository
	blob       storage.BlobClient
	publisher  event.Publisher
	container  string
	log        zerolog.Logger
}

// SignatureServiceDeps bundles dependencies.
type SignatureServiceDeps struct {
	Docs      repository.DocumentRepository
	Versions  repository.VersionRepository
	Blob      storage.BlobClient
	Publisher event.Publisher
	Providers map[domain.SignProvider]esignature.ESignatureProvider
	Container string
	Log       zerolog.Logger
}

// NewSignatureService constructs a SignatureService.
func NewSignatureService(d SignatureServiceDeps) *SignatureService {
	if d.Container == "" {
		d.Container = "documents"
	}
	if d.Providers == nil {
		d.Providers = map[domain.SignProvider]esignature.ESignatureProvider{}
	}
	return &SignatureService{
		signatures: map[uuid.UUID]*domain.ESignature{},
		providers:  d.Providers,
		docs:       d.Docs,
		versions:   d.Versions,
		blob:       d.Blob,
		publisher:  d.Publisher,
		container:  d.Container,
		log:        d.Log,
	}
}

// Initiate opens a signature session with the chosen provider.
func (s *SignatureService) Initiate(ctx context.Context, req SignatureInitiateRequest) (*domain.ESignature, string, error) {
	if !req.Provider.IsValid() {
		return nil, "", domain.ErrInvalidSignProvider
	}
	prov, ok := s.providers[req.Provider]
	if !ok {
		return nil, "", domain.ErrInvalidSignProvider
	}
	doc, err := s.docs.GetByID(ctx, req.TenantID, req.DocumentID)
	if err != nil {
		return nil, "", err
	}
	ver, err := s.versions.GetByVersion(ctx, req.TenantID, doc.ID, doc.CurrentVersion)
	if err != nil {
		return nil, "", err
	}
	// Load the source blob for the provider payload.
	rc, err := s.blob.Download(ctx, ver.StorageContainer, ver.StorageKey)
	if err != nil {
		return nil, "", err
	}
	defer rc.Close()
	buf := make([]byte, 0, ver.SizeBytes)
	tmp := make([]byte, 64*1024)
	for {
		n, rerr := rc.Read(tmp)
		if n > 0 {
			buf = append(buf, tmp[:n]...)
		}
		if rerr != nil {
			break
		}
	}

	ttl := 24 * time.Hour
	sess, err := prov.InitiateSignature(ctx, esignature.SignatureRequest{
		DocumentID:   doc.ID,
		VersionID:    ver.ID,
		SignerName:   req.SignerName,
		SignerTCKN:   req.SignerTCKN,
		SignerEmail:  req.SignerEmail,
		Document:     buf,
		DocumentName: doc.Title,
		CallbackURL:  req.CallbackURL,
		TTL:          ttl,
	})
	if err != nil {
		return nil, "", err
	}

	sig := &domain.ESignature{
		ID:               uuid.New(),
		TenantID:         req.TenantID,
		DocumentID:       doc.ID,
		VersionID:        ver.ID,
		SignerEmployeeID: req.SignerEmployeeID,
		Provider:         req.Provider,
		Status:           domain.SignStatusPending,
		ExternalRef:      &sess.ExternalRef,
		SignURL:          &sess.SignURL,
		CreatedAt:        time.Now().UTC(),
		ExpiresAt:        sess.ExpiresAt,
	}
	s.mu.Lock()
	s.signatures[sig.ID] = sig
	s.mu.Unlock()

	_ = s.publisher.Publish(ctx, event.TopicSignatureInitiated, map[string]any{
		"signature_id":       sig.ID,
		"document_id":        doc.ID,
		"tenant_id":          req.TenantID,
		"signer_employee_id": req.SignerEmployeeID,
		"provider":           string(req.Provider),
		"expires_at":         sig.ExpiresAt,
	})
	return sig, sess.SignURL, nil
}

// GetStatus refreshes the signature status from the provider and persists it.
func (s *SignatureService) GetStatus(ctx context.Context, tenantID, id uuid.UUID) (*domain.ESignature, error) {
	s.mu.RLock()
	sig, ok := s.signatures[id]
	s.mu.RUnlock()
	if !ok || sig.TenantID != tenantID {
		return nil, domain.ErrSignatureNotFound
	}
	prov, ok := s.providers[sig.Provider]
	if !ok || sig.ExternalRef == nil {
		return sig, nil
	}
	status, err := prov.GetStatus(ctx, *sig.ExternalRef)
	if err != nil {
		return sig, nil // provider error: return cached
	}
	changed := false
	switch status.Status {
	case "signed":
		if sig.Status != domain.SignStatusSigned {
			sig.Status = domain.SignStatusSigned
			sig.SignedAt = status.SignedAt
			if status.CertificateSerial != "" {
				cs := status.CertificateSerial
				sig.CertificateSerial = &cs
			}
			changed = true
			_ = s.docs.UpdateSignature(ctx, tenantID, sig.DocumentID, sig.SignerEmployeeID, time.Now().UTC())
			_ = s.publisher.Publish(ctx, event.TopicSignatureCompleted, map[string]any{
				"signature_id":       sig.ID,
				"document_id":        sig.DocumentID,
				"tenant_id":          tenantID,
				"signer_employee_id": sig.SignerEmployeeID,
				"provider":           string(sig.Provider),
				"signed_at":          sig.SignedAt,
			})
		}
	case "rejected":
		if sig.Status != domain.SignStatusRejected {
			sig.Status = domain.SignStatusRejected
			changed = true
			_ = s.publisher.Publish(ctx, event.TopicSignatureRejected, map[string]any{
				"signature_id": sig.ID,
				"document_id":  sig.DocumentID,
				"tenant_id":    tenantID,
				"reason":       status.RejectionReason,
			})
		}
	case "expired":
		if sig.Status != domain.SignStatusExpired {
			sig.Status = domain.SignStatusExpired
			changed = true
		}
	}
	if changed {
		s.mu.Lock()
		s.signatures[sig.ID] = sig
		s.mu.Unlock()
	}
	return sig, nil
}

// Cancel attempts to cancel a pending signature.
func (s *SignatureService) Cancel(ctx context.Context, tenantID, id uuid.UUID) (*domain.ESignature, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sig, ok := s.signatures[id]
	if !ok || sig.TenantID != tenantID {
		return nil, domain.ErrSignatureNotFound
	}
	if !sig.CanCancel() {
		return nil, domain.ErrSignatureNotPending
	}
	if prov, ok := s.providers[sig.Provider]; ok && sig.ExternalRef != nil {
		_ = prov.Cancel(ctx, *sig.ExternalRef)
	}
	sig.Status = domain.SignStatusCancelled
	return sig, nil
}
