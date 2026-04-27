package testsupport

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/repository"
)

// The fakes in this file are exported for use by tests across packages.
// They are safe to keep in the main package — they depend only on domain
// types and implement the corresponding repository interfaces.

// FakeTenantRepo is an in-memory TenantRepository for tests.
type FakeTenantRepo struct {
	mu     sync.Mutex
	byID   map[uuid.UUID]*domain.Tenant
	bySlug map[string]*domain.Tenant
	subs   *FakeSubscriptionRepo
	usage  *FakeUsageRepo
}

// NewFakeTenantRepo creates an empty fake tenant repo.
func NewFakeTenantRepo() *FakeTenantRepo {
	return &FakeTenantRepo{
		byID:   map[uuid.UUID]*domain.Tenant{},
		bySlug: map[string]*domain.Tenant{},
	}
}

// Create inserts a tenant (fails with ErrSlugTaken on duplicate slug).
func (f *FakeTenantRepo) Create(_ context.Context, _ repository.Querier, t *domain.Tenant) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.bySlug[t.Slug]; ok {
		return domain.ErrSlugTaken
	}
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	t.UpdatedAt = time.Now().UTC()
	cp := *t
	f.byID[t.ID] = &cp
	f.bySlug[t.Slug] = &cp
	return nil
}

// GetByID returns a tenant by ID.
func (f *FakeTenantRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.Tenant, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if t, ok := f.byID[id]; ok && t.DeletedAt == nil {
		cp := *t
		return &cp, nil
	}
	return nil, domain.ErrTenantNotFound
}

// GetBySlug returns a tenant by slug.
func (f *FakeTenantRepo) GetBySlug(_ context.Context, slug string) (*domain.Tenant, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if t, ok := f.bySlug[slug]; ok && t.DeletedAt == nil {
		cp := *t
		return &cp, nil
	}
	return nil, domain.ErrTenantNotFound
}

// Update persists changes.
func (f *FakeTenantRepo) Update(_ context.Context, t *domain.Tenant) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[t.ID]; !ok {
		return domain.ErrTenantNotFound
	}
	t.UpdatedAt = time.Now().UTC()
	cp := *t
	f.byID[t.ID] = &cp
	f.bySlug[t.Slug] = &cp
	return nil
}

// SoftDelete marks a tenant deleted.
func (f *FakeTenantRepo) SoftDelete(_ context.Context, id uuid.UUID, at time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	t, ok := f.byID[id]
	if !ok {
		return domain.ErrTenantNotFound
	}
	t.DeletedAt = &at
	t.Status = domain.TenantStatusDeleted
	return nil
}

// HardDelete removes the tenant.
func (f *FakeTenantRepo) HardDelete(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if t, ok := f.byID[id]; ok {
		delete(f.bySlug, t.Slug)
		delete(f.byID, id)
	}
	return nil
}

// ListAdmin returns a filtered, paginated admin projection. Subscription
// plan and seats and the employee counter are sourced from the optional
// SubRepo/UsageRepo registered on the fake. If none are registered, the
// row's plan fields remain nil and employee count is 0.
func (f *FakeTenantRepo) ListAdmin(_ context.Context, filter repository.TenantListFilter) ([]*domain.TenantAdminRow, int, error) {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	size := filter.PageSize
	if size <= 0 {
		size = 25
	}
	if size > 100 {
		size = 100
	}

	status := strings.ToLower(strings.TrimSpace(filter.Status))
	switch status {
	case "", "all", "trial", "active", "suspended", "deleted":
	default:
		return nil, 0, domain.NewValidationError(map[string]string{"status": "invalid"})
	}

	search := strings.ToLower(strings.TrimSpace(filter.Search))

	f.mu.Lock()
	tenants := make([]*domain.Tenant, 0, len(f.byID))
	for _, t := range f.byID {
		if t.DeletedAt != nil {
			continue
		}
		tenants = append(tenants, t)
	}
	f.mu.Unlock()

	// Sort newest first.
	sort.SliceStable(tenants, func(i, j int) bool {
		return tenants[i].CreatedAt.After(tenants[j].CreatedAt)
	})

	filtered := make([]*domain.Tenant, 0, len(tenants))
	for _, t := range tenants {
		if status != "" && status != "all" && string(t.Status) != status {
			continue
		}
		if search != "" {
			name := strings.ToLower(t.Name)
			slug := strings.ToLower(t.Slug)
			if !strings.Contains(name, search) && !strings.Contains(slug, search) {
				continue
			}
		}
		if filter.PlanID != "" {
			if f.subs == nil {
				continue
			}
			sub, err := f.subs.GetByTenantID(context.Background(), t.ID)
			if err != nil || sub.PlanID != filter.PlanID {
				continue
			}
		}
		filtered = append(filtered, t)
	}

	total := len(filtered)
	start := (page - 1) * size
	if start >= total {
		return []*domain.TenantAdminRow{}, total, nil
	}
	end := start + size
	if end > total {
		end = total
	}
	pageRows := filtered[start:end]

	out := make([]*domain.TenantAdminRow, 0, len(pageRows))
	for _, t := range pageRows {
		row := &domain.TenantAdminRow{
			ID:          t.ID,
			Name:        t.Name,
			Slug:        t.Slug,
			Country:     t.Country,
			Locale:      t.Locale,
			Status:      t.Status,
			TrialEndsAt: t.TrialEndsAt,
			CreatedAt:   t.CreatedAt,
			UpdatedAt:   t.UpdatedAt,
		}
		if f.subs != nil {
			if sub, err := f.subs.GetByTenantID(context.Background(), t.ID); err == nil {
				planID := sub.PlanID
				subStatus := string(sub.Status)
				seats := sub.Seats
				row.PlanID = &planID
				row.SubStatus = &subStatus
				row.Seats = &seats
			}
		}
		if f.usage != nil {
			if u, err := f.usage.Get(context.Background(), t.ID, domain.MetricEmployees, time.Now().UTC()); err == nil {
				row.EmployeeCount = u.Value
			}
		}
		out = append(out, row)
	}
	return out, total, nil
}

// WithSubs registers a subscription repo so ListAdmin can join in plan data.
// Returns the receiver for fluent wiring.
func (f *FakeTenantRepo) WithSubs(s *FakeSubscriptionRepo) *FakeTenantRepo {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.subs = s
	return f
}

// WithUsage registers a usage repo so ListAdmin can include employee counts.
func (f *FakeTenantRepo) WithUsage(u *FakeUsageRepo) *FakeTenantRepo {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.usage = u
	return f
}

// ListPendingHardDelete returns tenants soft-deleted beyond the grace period.
func (f *FakeTenantRepo) ListPendingHardDelete(_ context.Context, graceDays int) ([]*domain.Tenant, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	cutoff := time.Now().Add(-time.Duration(graceDays) * 24 * time.Hour)
	out := []*domain.Tenant{}
	for _, t := range f.byID {
		if t.DeletedAt != nil && t.DeletedAt.Before(cutoff) {
			cp := *t
			out = append(out, &cp)
		}
	}
	return out, nil
}

// FakePlanRepo is an in-memory PlanRepository seeded with the default catalog.
type FakePlanRepo struct {
	mu    sync.Mutex
	plans map[string]*domain.Plan
}

// NewFakePlanRepo creates a fake plan repo with production defaults.
func NewFakePlanRepo() *FakePlanRepo {
	cap25 := 25
	cap100 := 100
	cap500 := 500
	cap1500 := 1500
	price0 := int64(0)
	price1500 := int64(1500)
	price3000 := int64(3000)
	price5000 := int64(5000)
	return &FakePlanRepo{
		plans: map[string]*domain.Plan{
			"free": {
				ID: "free", Name: "Ücretsiz", Tier: domain.PlanTierFree,
				PriceMonthly: &price0, IsActive: true,
				Features: domain.PlanFeatures{MaxEmployees: &cap25, Modules: []string{"core_hris"}},
			},
			"starter": {
				ID: "starter", Name: "Başlangıç", Tier: domain.PlanTierStarter,
				PriceMonthly: &price1500, IsActive: true,
				Features: domain.PlanFeatures{MaxEmployees: &cap100, Modules: []string{"core_hris", "assessment"}},
			},
			"growth": {
				ID: "growth", Name: "Büyüme", Tier: domain.PlanTierGrowth,
				PriceMonthly: &price3000, IsActive: true,
				Features: domain.PlanFeatures{MaxEmployees: &cap500, Modules: []string{"core_hris", "assessment", "burnout"}},
			},
			"platform": {
				ID: "platform", Name: "Platform", Tier: domain.PlanTierPlatform,
				PriceMonthly: &price5000, IsActive: true,
				Features: domain.PlanFeatures{MaxEmployees: &cap1500, Modules: []string{"core_hris", "assessment", "burnout", "strengths", "mobility"}},
			},
			"enterprise": {
				ID: "enterprise", Name: "Kurumsal", Tier: domain.PlanTierEnterprise,
				IsActive: true,
				Features: domain.PlanFeatures{Modules: []string{"all"}},
			},
		},
	}
}

// GetByID returns a plan.
func (f *FakePlanRepo) GetByID(_ context.Context, id string) (*domain.Plan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.plans[id]
	if !ok {
		return nil, domain.ErrPlanNotFound
	}
	cp := *p
	return &cp, nil
}

// ListActive returns active plans.
func (f *FakePlanRepo) ListActive(_ context.Context) ([]*domain.Plan, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Plan{}
	for _, p := range f.plans {
		if p.IsActive {
			cp := *p
			out = append(out, &cp)
		}
	}
	return out, nil
}

// FakeSubscriptionRepo is an in-memory SubscriptionRepository.
type FakeSubscriptionRepo struct {
	mu       sync.Mutex
	byID     map[uuid.UUID]*domain.Subscription
	byTenant map[uuid.UUID]uuid.UUID
}

// NewFakeSubscriptionRepo creates an empty fake sub repo.
func NewFakeSubscriptionRepo() *FakeSubscriptionRepo {
	return &FakeSubscriptionRepo{
		byID:     map[uuid.UUID]*domain.Subscription{},
		byTenant: map[uuid.UUID]uuid.UUID{},
	}
}

// Create inserts a subscription.
func (f *FakeSubscriptionRepo) Create(_ context.Context, _ repository.Querier, s *domain.Subscription) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	cp := *s
	f.byID[s.ID] = &cp
	f.byTenant[s.TenantID] = s.ID
	return nil
}

// GetByTenantID returns the latest subscription for the tenant.
func (f *FakeSubscriptionRepo) GetByTenantID(_ context.Context, tenantID uuid.UUID) (*domain.Subscription, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	id, ok := f.byTenant[tenantID]
	if !ok {
		return nil, domain.ErrSubscriptionNotFound
	}
	cp := *f.byID[id]
	return &cp, nil
}

// GetByStripeID returns a subscription by Stripe ID.
func (f *FakeSubscriptionRepo) GetByStripeID(_ context.Context, stripeID string) (*domain.Subscription, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, s := range f.byID {
		if s.StripeSubscriptionID != nil && *s.StripeSubscriptionID == stripeID {
			cp := *s
			return &cp, nil
		}
	}
	return nil, domain.ErrSubscriptionNotFound
}

// Update persists changes.
func (f *FakeSubscriptionRepo) Update(_ context.Context, s *domain.Subscription) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[s.ID]; !ok {
		return domain.ErrSubscriptionNotFound
	}
	cp := *s
	f.byID[s.ID] = &cp
	return nil
}

// Cancel marks the subscription canceled.
func (f *FakeSubscriptionRepo) Cancel(_ context.Context, id uuid.UUID, at time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.byID[id]
	if !ok {
		return domain.ErrSubscriptionNotFound
	}
	s.Status = domain.SubStatusCanceled
	s.CancelAt = &at
	return nil
}

// FakeUsageRepo is an in-memory UsageRepository.
type FakeUsageRepo struct {
	mu   sync.Mutex
	data map[string]*domain.UsageCounter
}

// NewFakeUsageRepo creates an empty fake usage repo.
func NewFakeUsageRepo() *FakeUsageRepo {
	return &FakeUsageRepo{data: map[string]*domain.UsageCounter{}}
}

func (f *FakeUsageRepo) key(tenantID uuid.UUID, metric domain.Metric, start time.Time) string {
	return tenantID.String() + ":" + string(metric) + ":" + start.Format("2006-01")
}

// Increment upserts the counter.
func (f *FakeUsageRepo) Increment(_ context.Context, tenantID uuid.UUID, metric domain.Metric, delta int64, period time.Time) error {
	start, end := domain.CurrentPeriod(period)
	f.mu.Lock()
	defer f.mu.Unlock()
	k := f.key(tenantID, metric, start)
	if c, ok := f.data[k]; ok {
		c.Value += delta
		c.UpdatedAt = time.Now()
		return nil
	}
	f.data[k] = &domain.UsageCounter{
		TenantID:    tenantID,
		Metric:      metric,
		Value:       delta,
		PeriodStart: start,
		PeriodEnd:   end,
		UpdatedAt:   time.Now(),
	}
	return nil
}

// Get returns the counter for the given tenant/metric/period.
func (f *FakeUsageRepo) Get(_ context.Context, tenantID uuid.UUID, metric domain.Metric, period time.Time) (*domain.UsageCounter, error) {
	start, end := domain.CurrentPeriod(period)
	f.mu.Lock()
	defer f.mu.Unlock()
	k := f.key(tenantID, metric, start)
	if c, ok := f.data[k]; ok {
		cp := *c
		return &cp, nil
	}
	return &domain.UsageCounter{
		TenantID: tenantID, Metric: metric, Value: 0,
		PeriodStart: start, PeriodEnd: end, UpdatedAt: time.Now(),
	}, nil
}

// ListByTenant returns all counters for a tenant in the given period.
func (f *FakeUsageRepo) ListByTenant(_ context.Context, tenantID uuid.UUID, period time.Time) ([]*domain.UsageCounter, error) {
	start, _ := domain.CurrentPeriod(period)
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.UsageCounter{}
	for _, c := range f.data {
		if c.TenantID == tenantID && c.PeriodStart.Equal(start) {
			cp := *c
			out = append(out, &cp)
		}
	}
	return out, nil
}

func nowUTC() time.Time { return time.Now().UTC() }
