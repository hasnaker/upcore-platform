// Package service — referral_service.go
//
// Enterprise referral network: anonim psikolog/koç rezervasyonu.
//
// Tasarım ilkeleri (KVKK uyumlu):
//   - Çalışan tenant'a anonim görünür; employee_id pseudo-hash'e dönüştürülür.
//   - HR/admin yalnızca aggregate kullanım metriklerini görür (bkz. v_referral_usage).
//   - Sadece provider, sadece çalışanın kendi portalı ve sadece billing servisi
//     kaydın tamamına erişebilir.
//   - Şirket faturalandırması billable_cents üzerinden yürütülür; çalışan ödemez.
package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// Booking statuses — DB CHECK ile eşleşir.
const (
	ReferralStatusRequested = "requested"
	ReferralStatusConfirmed = "confirmed"
	ReferralStatusCompleted = "completed"
	ReferralStatusCancelled = "cancelled"
	ReferralStatusNoShow    = "no_show"
)

// ReferralProvider — havuzdaki bir uzman (psikolog / koç / terapist).
type ReferralProvider struct {
	ID            uuid.UUID `json:"id"`
	TenantID      *uuid.UUID `json:"tenant_id,omitempty"` // NULL = global (platform havuzu)
	FullName      string    `json:"full_name"`
	Title         string    `json:"title"`
	Specialties   []string  `json:"specialties"`
	BioTR         string    `json:"bio_tr,omitempty"`
	PhotoURL      string    `json:"photo_url,omitempty"`
	Languages     []string  `json:"languages"`
	SessionType   string    `json:"session_type"` // video|phone|in_person|hybrid
	SessionFeeTRY float64   `json:"session_fee_try"`
	LicenseNo     string    `json:"license_no,omitempty"`
	IsActive      bool      `json:"is_active"`
	AvgRating     *float64  `json:"avg_rating,omitempty"`
	SessionCount  int       `json:"session_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// ReferralBooking — rezervasyon kaydı (çalışan anonim).
type ReferralBooking struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	ProviderID      uuid.UUID  `json:"provider_id"`
	EmployeePseudo  string     `json:"employee_pseudo"` // HMAC-SHA256(employee_id, tenant_salt)
	SlotStartAt     time.Time  `json:"slot_start_at"`
	SlotEndAt       time.Time  `json:"slot_end_at"`
	Status          string     `json:"status"`
	BillableCents   int64      `json:"billable_cents"`
	InvoiceID       *uuid.UUID `json:"invoice_id,omitempty"`
	CancelledReason string     `json:"cancelled_reason,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ReferralUsage — tenant aggregate metrik (HR/admin view).
type ReferralUsage struct {
	TenantID            uuid.UUID `json:"tenant_id"`
	Month               time.Time `json:"month"`
	SessionCount        int       `json:"session_count"`
	CompletedCount      int       `json:"completed_count"`
	UniqueEmployeeCount int       `json:"unique_employee_count"`
	BillableTotalCents  int64     `json:"billable_total_cents"`
}

// ReferralRepository — persistance port.
type ReferralRepository interface {
	ListProviders(ctx context.Context, tenantID uuid.UUID, specialty string) ([]*ReferralProvider, error)
	GetProvider(ctx context.Context, id uuid.UUID) (*ReferralProvider, error)
	ListProviderSlots(ctx context.Context, providerID uuid.UUID, from, to time.Time) ([]TimeSlot, error)

	CreateBooking(ctx context.Context, b *ReferralBooking) error
	GetBooking(ctx context.Context, tenantID, id uuid.UUID) (*ReferralBooking, error)
	ListBookingsByPseudo(ctx context.Context, tenantID uuid.UUID, pseudo string) ([]*ReferralBooking, error)
	UpdateBookingStatus(ctx context.Context, tenantID, id uuid.UUID, status, reason string) error

	AggregateUsage(ctx context.Context, tenantID uuid.UUID, from, to time.Time) ([]*ReferralUsage, error)
}

// TimeSlot — provider'ın takvim açıklığı.
type TimeSlot struct {
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

// Errors.
var (
	ErrProviderNotFound = errors.New("referral: provider not found")
	ErrBookingNotFound  = errors.New("referral: booking not found")
	ErrSlotUnavailable  = errors.New("referral: slot unavailable")
	ErrInvalidStatus    = errors.New("referral: invalid status transition")
)

// ReferralService bundles referral use-cases.
type ReferralService struct {
	repo     ReferralRepository
	secret   []byte // tenant_salt — KVKK pseudonymization
	log      zerolog.Logger
}

// NewReferralService builds the service.
// `secret` must be ≥32 bytes, loaded from Azure Key Vault per-tenant in prod.
func NewReferralService(repo ReferralRepository, secret []byte, log zerolog.Logger) *ReferralService {
	return &ReferralService{
		repo:   repo,
		secret: secret,
		log:    log.With().Str("component", "referral_service").Logger(),
	}
}

// Pseudonymize computes a stable opaque identifier for an employee.
// It never reveals the employee_id itself — HR sees the pseudo only.
func (s *ReferralService) Pseudonymize(tenantID, employeeID uuid.UUID) string {
	m := hmac.New(sha256.New, s.secret)
	_, _ = m.Write([]byte(tenantID.String()))
	_, _ = m.Write([]byte{0x1f})
	_, _ = m.Write([]byte(employeeID.String()))
	return hex.EncodeToString(m.Sum(nil))
}

// ListProviders — çalışana / HR'a ekran gösterimi.
func (s *ReferralService) ListProviders(ctx context.Context, tenantID uuid.UUID, specialty string) ([]*ReferralProvider, error) {
	return s.repo.ListProviders(ctx, tenantID, specialty)
}

// GetAvailability — provider müsaitlik penceresi.
func (s *ReferralService) GetAvailability(ctx context.Context, providerID uuid.UUID, from, to time.Time) ([]TimeSlot, error) {
	if to.Before(from) {
		return nil, fmt.Errorf("invalid range")
	}
	return s.repo.ListProviderSlots(ctx, providerID, from, to)
}

// BookRequest — çalışan rezervasyon isteği.
type BookRequest struct {
	TenantID    uuid.UUID
	EmployeeID  uuid.UUID // server-side, JWT'den; hiç yazılmaz
	ProviderID  uuid.UUID
	SlotStartAt time.Time
	SlotEndAt   time.Time
}

// Book creates an anonymous booking.
// Returns the booking with employee_pseudo populated; employee_id asla serialize edilmez.
func (s *ReferralService) Book(ctx context.Context, req BookRequest) (*ReferralBooking, error) {
	if req.SlotEndAt.Before(req.SlotStartAt) || req.SlotStartAt.Before(time.Now().Add(-5*time.Minute)) {
		return nil, ErrSlotUnavailable
	}
	p, err := s.repo.GetProvider(ctx, req.ProviderID)
	if err != nil {
		return nil, err
	}
	if p == nil || !p.IsActive {
		return nil, ErrProviderNotFound
	}

	b := &ReferralBooking{
		ID:             uuid.New(),
		TenantID:       req.TenantID,
		ProviderID:     req.ProviderID,
		EmployeePseudo: s.Pseudonymize(req.TenantID, req.EmployeeID),
		SlotStartAt:    req.SlotStartAt.UTC(),
		SlotEndAt:      req.SlotEndAt.UTC(),
		Status:         ReferralStatusRequested,
		BillableCents:  int64(p.SessionFeeTRY * 100),
	}
	if err := s.repo.CreateBooking(ctx, b); err != nil {
		return nil, fmt.Errorf("create booking: %w", err)
	}
	s.log.Info().
		Str("tenant_id", req.TenantID.String()).
		Str("pseudo", b.EmployeePseudo[:12]+"…").
		Str("provider_id", req.ProviderID.String()).
		Msg("referral booking requested")
	return b, nil
}

// ListMine — çalışanın kendi rezervasyonları.
func (s *ReferralService) ListMine(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*ReferralBooking, error) {
	pseudo := s.Pseudonymize(tenantID, employeeID)
	return s.repo.ListBookingsByPseudo(ctx, tenantID, pseudo)
}

// Cancel — çalışan kendi rezervasyonunu iptal eder (≥24h önce).
func (s *ReferralService) Cancel(ctx context.Context, tenantID, bookingID, employeeID uuid.UUID, reason string) error {
	b, err := s.repo.GetBooking(ctx, tenantID, bookingID)
	if err != nil {
		return err
	}
	if b == nil {
		return ErrBookingNotFound
	}
	if b.EmployeePseudo != s.Pseudonymize(tenantID, employeeID) {
		return fmt.Errorf("unauthorized")
	}
	if b.Status != ReferralStatusRequested && b.Status != ReferralStatusConfirmed {
		return ErrInvalidStatus
	}
	if time.Until(b.SlotStartAt) < 24*time.Hour {
		return fmt.Errorf("cancellation window closed (<24h)")
	}
	return s.repo.UpdateBookingStatus(ctx, tenantID, bookingID, ReferralStatusCancelled, reason)
}

// Aggregate — HR/admin: çalışan kimliği açığa çıkmadan aylık kullanım.
func (s *ReferralService) Aggregate(ctx context.Context, tenantID uuid.UUID, from, to time.Time) ([]*ReferralUsage, error) {
	return s.repo.AggregateUsage(ctx, tenantID, from, to)
}
