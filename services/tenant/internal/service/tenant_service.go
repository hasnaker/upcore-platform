package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/repository"
)

// TxRunner abstracts transaction execution so tests can bypass a real DB.
type TxRunner interface {
	RunInTx(ctx context.Context, fn func(tx repository.Querier) error) error
}

// SQLTxRunner runs fn inside a real sqlx transaction.
type SQLTxRunner struct{ DB *sqlx.DB }

// RunInTx opens a transaction, invokes fn, commits on success, rolls back on error.
func (r *SQLTxRunner) RunInTx(ctx context.Context, fn func(tx repository.Querier) error) error {
	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// NoopTxRunner invokes fn with a nil Querier — callers must handle nil (repos fall back to the pool).
type NoopTxRunner struct{}

// RunInTx calls fn directly with nil.
func (NoopTxRunner) RunInTx(_ context.Context, fn func(tx repository.Querier) error) error {
	return fn(nil)
}

// SignupRequest carries validated inputs for signup.
type SignupRequest struct {
	CompanyName    string `json:"company_name" validate:"required,min=2,max=200"`
	CompanySlug    string `json:"company_slug" validate:"required,min=3,max=60"`
	AdminEmail     string `json:"admin_email" validate:"required,email"`
	AdminFirstName string `json:"admin_first_name" validate:"required,min=1,max=80"`
	AdminLastName  string `json:"admin_last_name" validate:"required,min=1,max=80"`
	PlanID         string `json:"plan_id" validate:"required"`
	Country        string `json:"country" validate:"omitempty,len=2"`
	Locale         string `json:"locale" validate:"omitempty,max=10"`
	VKN            string `json:"vkn" validate:"omitempty,len=10"`
	TCKN           string `json:"tckn" validate:"omitempty,len=11"`
}

// SignupResult is returned by TenantService.Signup.
type SignupResult struct {
	TenantID       uuid.UUID  `json:"tenant_id"`
	SubscriptionID uuid.UUID  `json:"subscription_id"`
	Slug           string     `json:"slug"`
	SignupToken    string     `json:"signup_token"`
	TrialEndsAt    *time.Time `json:"trial_ends_at"`
}

// UpdateTenantInput captures patchable tenant fields.
type UpdateTenantInput struct {
	Name   *string `json:"name,omitempty" validate:"omitempty,min=2,max=200"`
	Locale *string `json:"locale,omitempty" validate:"omitempty,max=10"`
}

// TenantService orchestrates tenant lifecycle operations.
type TenantService struct {
	tx        TxRunner
	tenants   repository.TenantRepository
	plans     repository.PlanRepository
	subs      repository.SubscriptionRepository
	usage     repository.UsageRepository
	seeder    *Seeder
	publisher event.Publisher
	trialDays int
	log       zerolog.Logger
}

// NewTenantService constructs the service.
func NewTenantService(
	tx TxRunner,
	tenants repository.TenantRepository,
	plans repository.PlanRepository,
	subs repository.SubscriptionRepository,
	usage repository.UsageRepository,
	publisher event.Publisher,
	trialDays int,
	log zerolog.Logger,
) *TenantService {
	if tx == nil {
		tx = NoopTxRunner{}
	}
	return &TenantService{
		tx:        tx,
		tenants:   tenants,
		plans:     plans,
		subs:      subs,
		usage:     usage,
		seeder:    NewSeeder(usage),
		publisher: publisher,
		trialDays: trialDays,
		log:       log,
	}
}

// Signup creates a tenant + initial subscription in a single transaction,
// then publishes tenant.created.v1 and tenant.admin_invited.v1.
func (s *TenantService) Signup(ctx context.Context, req SignupRequest) (*SignupResult, error) {
	if err := validateSignup(req); err != nil {
		return nil, err
	}

	slug := domain.NormalizeSlug(req.CompanySlug)
	if err := domain.ValidateSlug(slug); err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(req.AdminEmail))
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, domain.ErrInvalidEmail
	}
	if req.VKN != "" {
		if err := domain.ValidateVKN(req.VKN); err != nil {
			return nil, err
		}
	}
	if req.TCKN != "" {
		if err := domain.ValidateTCKN(req.TCKN); err != nil {
			return nil, err
		}
	}

	plan, err := s.plans.GetByID(ctx, req.PlanID)
	if err != nil {
		return nil, err
	}
	if !plan.IsActive {
		return nil, domain.ErrPlanNotFound
	}

	now := time.Now().UTC()
	trialEnd := now.Add(time.Duration(s.trialDays) * 24 * time.Hour)
	periodEnd := now.AddDate(0, 1, 0)

	country := req.Country
	if country == "" {
		country = "TR"
	}
	locale := req.Locale
	if locale == "" {
		locale = "tr-TR"
	}

	var vknPtr, tcknPtr *string
	if req.VKN != "" {
		v := req.VKN
		vknPtr = &v
	}
	if req.TCKN != "" {
		t := req.TCKN
		tcknPtr = &t
	}

	tenant := &domain.Tenant{
		ID:          uuid.New(),
		Name:        strings.TrimSpace(req.CompanyName),
		Slug:        slug,
		VKN:         vknPtr,
		TCKN:        tcknPtr,
		Country:     country,
		Locale:      locale,
		Status:      domain.TenantStatusTrial,
		TrialEndsAt: &trialEnd,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	sub := &domain.Subscription{
		ID:                 uuid.New(),
		TenantID:           tenant.ID,
		PlanID:             plan.ID,
		Status:             domain.SubStatusTrialing,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   periodEnd,
		Seats:              0,
		TrialEndsAt:        &trialEnd,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	// Transactional write.
	if err := s.tx.RunInTx(ctx, func(q repository.Querier) error {
		if err := s.tenants.Create(ctx, q, tenant); err != nil {
			return err
		}
		if err := s.subs.Create(ctx, q, sub); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	// Seed default usage counters (best-effort).
	if err := s.seeder.SeedDefaults(ctx, tenant.ID); err != nil {
		s.log.Warn().Err(err).Str("tenant_id", tenant.ID.String()).Msg("seed defaults failed")
	}

	// Publish events (best-effort; logged on failure).
	s.publishCreated(ctx, tenant, plan, trialEnd)
	s.publishAdminInvited(ctx, tenant, email, req.AdminFirstName, req.AdminLastName)

	token := newSignupToken(tenant.ID, email)
	return &SignupResult{
		TenantID:       tenant.ID,
		SubscriptionID: sub.ID,
		Slug:           tenant.Slug,
		SignupToken:    token,
		TrialEndsAt:    &trialEnd,
	}, nil
}

// Get fetches a tenant by ID.
func (s *TenantService) Get(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	return s.tenants.GetByID(ctx, id)
}

// GetBySlug fetches a tenant by slug.
func (s *TenantService) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return s.tenants.GetBySlug(ctx, domain.NormalizeSlug(slug))
}

// Update applies a partial update to tenant profile fields.
func (s *TenantService) Update(ctx context.Context, id uuid.UUID, in UpdateTenantInput) (*domain.Tenant, error) {
	t, err := s.tenants.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if t.Status == domain.TenantStatusDeleted {
		return nil, domain.ErrTenantDeleted
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if len(name) < 2 || len(name) > 200 {
			return nil, domain.NewValidationError(map[string]string{"name": "must be 2-200 characters"})
		}
		t.Name = name
	}
	if in.Locale != nil {
		loc := strings.TrimSpace(*in.Locale)
		if len(loc) > 10 {
			return nil, domain.NewValidationError(map[string]string{"locale": "too long"})
		}
		if loc != "" {
			t.Locale = loc
		}
	}
	if err := s.tenants.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

// Suspend marks a tenant suspended and emits tenant.suspended.v1.
func (s *TenantService) Suspend(ctx context.Context, id uuid.UUID, reason string) error {
	t, err := s.tenants.GetByID(ctx, id)
	if err != nil {
		return err
	}
	t.Status = domain.TenantStatusSuspended
	if err := s.tenants.Update(ctx, t); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicTenantSuspended, map[string]any{
		"tenant_id":     t.ID,
		"reason":        reason,
		"suspended_at":  time.Now().UTC(),
	})
	return nil
}

// Activate moves a trial/suspended tenant to active state.
func (s *TenantService) Activate(ctx context.Context, id uuid.UUID) error {
	t, err := s.tenants.GetByID(ctx, id)
	if err != nil {
		return err
	}
	t.Status = domain.TenantStatusActive
	if err := s.tenants.Update(ctx, t); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicTenantActivated, map[string]any{
		"tenant_id":    t.ID,
		"activated_at": time.Now().UTC(),
	})
	return nil
}

// Delete soft-deletes a tenant and emits tenant.deleted.v1 with hard-delete date.
func (s *TenantService) Delete(ctx context.Context, id uuid.UUID) error {
	at := time.Now().UTC()
	if err := s.tenants.SoftDelete(ctx, id, at); err != nil {
		return err
	}
	hardDeleteAt := at.AddDate(0, 0, 30)
	_ = s.publisher.Publish(ctx, event.TopicTenantDeleted, map[string]any{
		"tenant_id":      id,
		"deleted_at":     at,
		"hard_delete_at": hardDeleteAt,
	})
	return nil
}

func (s *TenantService) publishCreated(ctx context.Context, t *domain.Tenant, p *domain.Plan, trialEnd time.Time) {
	err := s.publisher.Publish(ctx, event.TopicTenantCreated, map[string]any{
		"tenant_id":     t.ID,
		"name":          t.Name,
		"slug":          t.Slug,
		"plan_id":       p.ID,
		"plan_code":     string(p.Tier),
		"country":       t.Country,
		"locale":        t.Locale,
		"trial_ends_at": trialEnd,
		"created_at":    t.CreatedAt,
	})
	if err != nil {
		s.log.Warn().Err(err).Msg("publish tenant.created failed")
	}
}

func (s *TenantService) publishAdminInvited(ctx context.Context, t *domain.Tenant, email, first, last string) {
	err := s.publisher.Publish(ctx, event.TopicTenantAdminInvited, map[string]any{
		"tenant_id":  t.ID,
		"email":      email,
		"first_name": first,
		"last_name":  last,
		"locale":     t.Locale,
	})
	if err != nil {
		s.log.Warn().Err(err).Msg("publish tenant.admin_invited failed")
	}
}

func newSignupToken(tenantID uuid.UUID, email string) string {
	// Deterministic token placeholder; real impl would be short-lived JWT.
	return fmt.Sprintf("signup-%s-%s", tenantID.String(), uuid.NewSHA1(uuid.NameSpaceOID, []byte(email)).String())
}

func validateSignup(req SignupRequest) error {
	fields := map[string]string{}
	if strings.TrimSpace(req.CompanyName) == "" {
		fields["company_name"] = "required"
	}
	if strings.TrimSpace(req.CompanySlug) == "" {
		fields["company_slug"] = "required"
	}
	if strings.TrimSpace(req.AdminEmail) == "" {
		fields["admin_email"] = "required"
	}
	if strings.TrimSpace(req.AdminFirstName) == "" {
		fields["admin_first_name"] = "required"
	}
	if strings.TrimSpace(req.AdminLastName) == "" {
		fields["admin_last_name"] = "required"
	}
	if strings.TrimSpace(req.PlanID) == "" {
		fields["plan_id"] = "required"
	}
	if len(fields) > 0 {
		return domain.NewValidationError(fields)
	}
	return nil
}

// IsValidationError reports whether err is a validation error.
func IsValidationError(err error) bool {
	var ve *domain.ValidationError
	return errors.As(err, &ve)
}
