package esignature

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ESignatureProvider is the common interface implemented by all Turkish
// e-signature providers (eimzala, kamu_sm, edevlet, mobile).
type ESignatureProvider interface {
	Name() string
	InitiateSignature(ctx context.Context, req SignatureRequest) (*SignatureSession, error)
	GetStatus(ctx context.Context, sessionID string) (*SignatureStatus, error)
	DownloadSignedDocument(ctx context.Context, sessionID string) ([]byte, error)
	Cancel(ctx context.Context, sessionID string) error
}

// SignatureRequest describes a signing request sent to the provider.
type SignatureRequest struct {
	DocumentID   uuid.UUID
	VersionID    uuid.UUID
	SignerName   string
	SignerTCKN   string
	SignerEmail  string
	SignerPhone  string
	Document     []byte
	DocumentName string
	CallbackURL  string
	TTL          time.Duration
}

// SignatureSession is the provider's confirmation for an initiated flow.
type SignatureSession struct {
	SessionID   string
	SignURL     string
	ExpiresAt   time.Time
	ExternalRef string
}

// SignatureStatus is the polled status from the provider.
type SignatureStatus struct {
	SessionID         string
	Status            string // "pending" | "signed" | "rejected" | "expired"
	SignedAt          *time.Time
	CertificateSerial string
	RejectionReason   string
}

// Common errors.
var (
	ErrSessionNotFound = errors.New("signature session not found")
	ErrNotSigned       = errors.New("document is not signed yet")
)

// StubProvider is a deterministic in-memory provider used during V1 until
// real provider integrations are wired up. It produces deterministic session
// IDs and supports manual status transitions via the test helper methods.
type StubProvider struct {
	name     string
	mu       sync.Mutex
	sessions map[string]*StubSession
}

// StubSession represents an in-memory signature session.
type StubSession struct {
	ID           string
	DocumentID   uuid.UUID
	Status       string
	SignedAt     *time.Time
	SignedPDF    []byte
	OriginalDoc  []byte
	CreatedAt    time.Time
	ExpiresAt    time.Time
	CertSerial   string
	RejectReason string
}

// NewStubProvider returns a new stub e-signature provider.
func NewStubProvider(name string) *StubProvider {
	if name == "" {
		name = "stub"
	}
	return &StubProvider{name: name, sessions: map[string]*StubSession{}}
}

// Name returns the provider's identifier.
func (p *StubProvider) Name() string { return p.name }

// InitiateSignature creates a new pending session.
func (p *StubProvider) InitiateSignature(_ context.Context, req SignatureRequest) (*SignatureSession, error) {
	sessionID := uuid.NewString()
	ttl := req.TTL
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}
	now := time.Now().UTC()
	exp := now.Add(ttl)

	p.mu.Lock()
	defer p.mu.Unlock()
	p.sessions[sessionID] = &StubSession{
		ID:          sessionID,
		DocumentID:  req.DocumentID,
		Status:      "pending",
		OriginalDoc: append([]byte{}, req.Document...),
		CreatedAt:   now,
		ExpiresAt:   exp,
	}
	return &SignatureSession{
		SessionID:   sessionID,
		SignURL:     fmt.Sprintf("https://stub.esign.upcore/%s/sign/%s", p.name, sessionID),
		ExpiresAt:   exp,
		ExternalRef: sessionID,
	}, nil
}

// GetStatus returns the stored status.
func (p *StubProvider) GetStatus(_ context.Context, sessionID string) (*SignatureStatus, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sessions[sessionID]
	if !ok {
		return nil, ErrSessionNotFound
	}
	// Lazy expiry evaluation.
	if s.Status == "pending" && time.Now().UTC().After(s.ExpiresAt) {
		s.Status = "expired"
	}
	return &SignatureStatus{
		SessionID:         s.ID,
		Status:            s.Status,
		SignedAt:          s.SignedAt,
		CertificateSerial: s.CertSerial,
		RejectionReason:   s.RejectReason,
	}, nil
}

// DownloadSignedDocument returns the signed PDF.
func (p *StubProvider) DownloadSignedDocument(_ context.Context, sessionID string) ([]byte, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sessions[sessionID]
	if !ok {
		return nil, ErrSessionNotFound
	}
	if s.Status != "signed" {
		return nil, ErrNotSigned
	}
	return append([]byte{}, s.SignedPDF...), nil
}

// Cancel transitions a pending session to cancelled.
func (p *StubProvider) Cancel(_ context.Context, sessionID string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sessions[sessionID]
	if !ok {
		return ErrSessionNotFound
	}
	if s.Status == "pending" {
		s.Status = "cancelled"
	}
	return nil
}

// --- test helpers ---

// MarkSigned is a test hook to simulate a successful signing event.
func (p *StubProvider) MarkSigned(sessionID string, signedPDF []byte, certSerial string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sessions[sessionID]
	if !ok {
		return ErrSessionNotFound
	}
	now := time.Now().UTC()
	s.Status = "signed"
	s.SignedAt = &now
	s.SignedPDF = append([]byte{}, signedPDF...)
	s.CertSerial = certSerial
	return nil
}

// MarkRejected is a test hook to simulate a rejection.
func (p *StubProvider) MarkRejected(sessionID, reason string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.sessions[sessionID]
	if !ok {
		return ErrSessionNotFound
	}
	s.Status = "rejected"
	s.RejectReason = reason
	return nil
}
