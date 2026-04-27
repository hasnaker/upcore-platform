package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/event"
	"github.com/upcore/tenant/internal/repository"
)

// OnboardingService orchestrates the tenant kurulum sihirbazı.
type OnboardingService struct {
	tx        TxRunner
	drafts    repository.OnboardingDraftRepository
	tenants   repository.TenantRepository
	plans     repository.PlanRepository
	subs      repository.SubscriptionRepository
	usage     repository.UsageRepository
	seeder    *Seeder
	publisher event.Publisher
	trialDays int
	log       zerolog.Logger
}

// NewOnboardingService wires up the service.
func NewOnboardingService(
	tx TxRunner,
	drafts repository.OnboardingDraftRepository,
	tenants repository.TenantRepository,
	plans repository.PlanRepository,
	subs repository.SubscriptionRepository,
	usage repository.UsageRepository,
	publisher event.Publisher,
	trialDays int,
	log zerolog.Logger,
) *OnboardingService {
	if tx == nil {
		tx = NoopTxRunner{}
	}
	if trialDays <= 0 {
		trialDays = 14
	}
	return &OnboardingService{
		tx:        tx,
		drafts:    drafts,
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

// UpsertProgressInput carries everything the handler needs to persist a step.
type UpsertProgressInput struct {
	ClerkUserID string
	AdminEmail  string
	Step        int
	Payload     domain.OnboardingData
}

// CommitInput is used by POST /onboarding/commit.
type CommitInput struct {
	ClerkUserID string
	DraftID     uuid.UUID // optional: if omitted, in-progress draft for the user is used
}

// CommitResult mirrors SignupResult but returns the draft ID too.
type CommitResult struct {
	TenantID       uuid.UUID  `json:"tenant_id"`
	SubscriptionID uuid.UUID  `json:"subscription_id"`
	Slug           string     `json:"slug"`
	DraftID        uuid.UUID  `json:"draft_id"`
	TrialEndsAt    *time.Time `json:"trial_ends_at"`
}

// GetOrCreate returns the in-progress draft for the user, creating a fresh
// one if none exists. Email is trusted (comes from Clerk session).
func (s *OnboardingService) GetOrCreate(ctx context.Context, clerkUserID, adminEmail string) (*domain.OnboardingDraft, error) {
	clerkUserID = strings.TrimSpace(clerkUserID)
	if clerkUserID == "" {
		return nil, domain.ErrUnauthorized
	}
	existing, err := s.drafts.GetInProgressByUser(ctx, clerkUserID)
	if err != nil && !errors.Is(err, domain.ErrOnboardingDraftNotFound) {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	d := &domain.OnboardingDraft{
		ClerkUserID: clerkUserID,
		AdminEmail:  strings.ToLower(strings.TrimSpace(adminEmail)),
		CurrentStep: 1,
		Status:      domain.OnboardingStatusInProgress,
		Data: domain.OnboardingData{
			CompletedSteps: []int{},
		},
	}
	if err := s.drafts.Upsert(ctx, nil, d); err != nil {
		return nil, err
	}
	return d, nil
}

// UpsertProgress merges the payload for the given step into the user's draft.
func (s *OnboardingService) UpsertProgress(ctx context.Context, in UpsertProgressInput) (*domain.OnboardingDraft, error) {
	if in.Step < 1 || in.Step > 10 {
		return nil, domain.ErrOnboardingInvalidStep
	}
	d, err := s.GetOrCreate(ctx, in.ClerkUserID, in.AdminEmail)
	if err != nil {
		return nil, err
	}
	if d.Status != domain.OnboardingStatusInProgress {
		return nil, domain.ErrOnboardingAlreadyCommit
	}
	if err := s.validateStep(in.Step, in.Payload); err != nil {
		return nil, err
	}
	if err := d.MergeStep(in.Step, in.Payload); err != nil {
		return nil, err
	}
	if err := s.drafts.Upsert(ctx, nil, d); err != nil {
		return nil, err
	}
	return d, nil
}

// Commit transactionally creates tenant + subscription + usage seeds, then
// marks the draft committed. Publishes tenant.created.v1.
func (s *OnboardingService) Commit(ctx context.Context, in CommitInput) (*CommitResult, error) {
	var d *domain.OnboardingDraft
	var err error
	if in.DraftID != uuid.Nil {
		d, err = s.drafts.GetByID(ctx, in.DraftID)
	} else {
		d, err = s.drafts.GetInProgressByUser(ctx, strings.TrimSpace(in.ClerkUserID))
	}
	if err != nil {
		return nil, err
	}
	if d.Status != domain.OnboardingStatusInProgress {
		return nil, domain.ErrOnboardingAlreadyCommit
	}
	if d.Data.Company == nil || strings.TrimSpace(d.Data.Company.Name) == "" {
		return nil, domain.NewValidationError(map[string]string{"company": "required"})
	}
	if d.Data.Plan == nil || strings.TrimSpace(d.Data.Plan.PlanID) == "" {
		return nil, domain.NewValidationError(map[string]string{"plan": "required"})
	}
	if d.Data.Admin == nil {
		return nil, domain.NewValidationError(map[string]string{"admin": "required"})
	}

	slug := domain.NormalizeSlug(d.Data.Company.Slug)
	if err := domain.ValidateSlug(slug); err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(d.Data.Admin.Email))
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, domain.ErrInvalidEmail
	}
	if v := strings.TrimSpace(d.Data.Company.VKN); v != "" {
		if err := domain.ValidateVKN(v); err != nil {
			return nil, err
		}
	}

	plan, err := s.plans.GetByID(ctx, d.Data.Plan.PlanID)
	if err != nil {
		return nil, err
	}
	if !plan.IsActive {
		return nil, domain.ErrPlanNotFound
	}

	now := time.Now().UTC()
	trialEnd := now.Add(time.Duration(s.trialDays) * 24 * time.Hour)
	periodEnd := now.AddDate(0, 1, 0)

	country := d.Data.Company.Country
	if country == "" {
		country = "TR"
	}
	locale := d.Data.Company.Locale
	if locale == "" {
		locale = "tr-TR"
	}
	var vknPtr *string
	if v := strings.TrimSpace(d.Data.Company.VKN); v != "" {
		vknPtr = &v
	}

	tenant := &domain.Tenant{
		ID:          uuid.New(),
		Name:        strings.TrimSpace(d.Data.Company.Name),
		Slug:        slug,
		VKN:         vknPtr,
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
		Seats:              len(employeesOrEmpty(d.Data.Employees)),
		TrialEndsAt:        &trialEnd,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.tx.RunInTx(ctx, func(q repository.Querier) error {
		if err := s.tenants.Create(ctx, q, tenant); err != nil {
			return err
		}
		if err := s.subs.Create(ctx, q, sub); err != nil {
			return err
		}
		if err := s.drafts.MarkCommitted(ctx, q, d.ID, tenant.ID); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	// Seed usage counters.
	if err := s.seeder.SeedDefaults(ctx, tenant.ID); err != nil {
		s.log.Warn().Err(err).Str("tenant_id", tenant.ID.String()).Msg("seed defaults failed")
	}
	// If the draft has employees, record the initial count.
	if n := len(employeesOrEmpty(d.Data.Employees)); n > 0 && s.usage != nil {
		_ = s.usage.Increment(ctx, tenant.ID, domain.MetricEmployees, int64(n), now)
	}

	// Publish tenant.created.v1 + admin.invited.v1 + onboarding.committed.v1.
	_ = s.publisher.Publish(ctx, event.TopicTenantCreated, map[string]any{
		"tenant_id":     tenant.ID,
		"name":          tenant.Name,
		"slug":          tenant.Slug,
		"plan_id":       plan.ID,
		"plan_code":     string(plan.Tier),
		"country":       tenant.Country,
		"locale":        tenant.Locale,
		"trial_ends_at": trialEnd,
		"created_at":    tenant.CreatedAt,
		"template":      d.Data.Template,
		"source":        "onboarding_wizard_v1",
	})
	_ = s.publisher.Publish(ctx, event.TopicTenantAdminInvited, map[string]any{
		"tenant_id":  tenant.ID,
		"email":      email,
		"first_name": d.Data.Admin.FirstName,
		"last_name":  d.Data.Admin.LastName,
		"locale":     tenant.Locale,
	})
	// Resolve the canned template (if any) so downstream consumers (employee,
	// organization services) can seed departments + positions.
	var tpl *TenantTemplate
	if code := strings.TrimSpace(d.Data.Template); code != "" {
		if t, ok := GetTemplate(code); ok {
			tpl = t
		}
	}
	committedPayload := map[string]any{
		"draft_id":        d.ID,
		"tenant_id":       tenant.ID,
		"template":        d.Data.Template,
		"modules":         d.Data.Plan.Modules,
		"employees_count": len(employeesOrEmpty(d.Data.Employees)),
		"committed_at":    now,
	}
	if tpl != nil {
		committedPayload["template_data"] = tpl
	}
	if d.Data.OrgChart != nil {
		committedPayload["org_chart"] = d.Data.OrgChart
	}
	if d.Data.KVKK != nil {
		committedPayload["kvkk"] = d.Data.KVKK
	}
	if d.Data.Payroll != nil {
		committedPayload["payroll"] = d.Data.Payroll
	}
	if d.Data.SSO != nil {
		committedPayload["sso"] = d.Data.SSO
	}
	if d.Data.Integrations != nil {
		committedPayload["integrations"] = d.Data.Integrations
	}
	if d.Data.Employees != nil {
		committedPayload["employees"] = d.Data.Employees
	}
	_ = s.publisher.Publish(ctx, event.TopicOnboardingCommitted, committedPayload)

	return &CommitResult{
		TenantID:       tenant.ID,
		SubscriptionID: sub.ID,
		Slug:           tenant.Slug,
		DraftID:        d.ID,
		TrialEndsAt:    &trialEnd,
	}, nil
}

// Abandon marks a draft abandoned. Safe to call repeatedly.
func (s *OnboardingService) Abandon(ctx context.Context, clerkUserID string) error {
	d, err := s.drafts.GetInProgressByUser(ctx, strings.TrimSpace(clerkUserID))
	if err != nil {
		if errors.Is(err, domain.ErrOnboardingDraftNotFound) {
			return nil // idempotent
		}
		return err
	}
	return s.drafts.MarkAbandoned(ctx, d.ID)
}

// Funnel returns the funnel aggregate for the last N days.
func (s *OnboardingService) Funnel(ctx context.Context, days int) (repository.FunnelAggregate, error) {
	if days <= 0 {
		days = 30
	}
	to := time.Now().UTC()
	from := to.AddDate(0, 0, -days)
	return s.drafts.ListForFunnel(ctx, from, to)
}

func (s *OnboardingService) validateStep(step int, p domain.OnboardingData) error {
	fields := map[string]string{}
	switch step {
	case 1:
		if p.Company == nil {
			fields["company"] = "required"
			break
		}
		if strings.TrimSpace(p.Company.Name) == "" {
			fields["company.name"] = "required"
		}
		if strings.TrimSpace(p.Company.Slug) == "" {
			fields["company.slug"] = "required"
		}
	case 2:
		if p.Admin == nil {
			fields["admin"] = "required"
			break
		}
		if strings.TrimSpace(p.Admin.Email) == "" {
			fields["admin.email"] = "required"
		}
		if strings.TrimSpace(p.Admin.FirstName) == "" {
			fields["admin.first_name"] = "required"
		}
		if strings.TrimSpace(p.Admin.LastName) == "" {
			fields["admin.last_name"] = "required"
		}
	case 3:
		if p.Plan == nil || strings.TrimSpace(p.Plan.PlanID) == "" {
			fields["plan.plan_id"] = "required"
		}
	case 8:
		if p.Payroll != nil {
			if v := strings.TrimSpace(p.Payroll.IBAN); v != "" {
				if err := validateIBAN(v); err != nil {
					fields["payroll.iban"] = "invalid"
				}
			}
			if p.Payroll.PaymentDay != 0 && (p.Payroll.PaymentDay < 1 || p.Payroll.PaymentDay > 31) {
				fields["payroll.payment_day"] = "must be 1-31"
			}
		}
	}
	if len(fields) > 0 {
		return domain.NewValidationError(fields)
	}
	return nil
}

func validateIBAN(s string) error {
	s = strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
	if !strings.HasPrefix(s, "TR") || len(s) != 26 {
		return fmt.Errorf("invalid IBAN")
	}
	for _, r := range s[2:] {
		if r < '0' || r > '9' {
			return fmt.Errorf("invalid IBAN digit")
		}
	}
	return nil
}

func employeesOrEmpty(e *domain.EmployeesData) []domain.EmployeeRow {
	if e == nil {
		return nil
	}
	return e.Rows
}
