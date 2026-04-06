package repository

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
)

// FakeEmployeeRepo is an in-memory EmployeeRepository for tests.
type FakeEmployeeRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.Employee
}

// NewFakeEmployeeRepo creates an empty fake employee repo.
func NewFakeEmployeeRepo() *FakeEmployeeRepo {
	return &FakeEmployeeRepo{byID: map[uuid.UUID]*domain.Employee{}}
}

// Create inserts an employee. Returns ErrDuplicateEmployeeNo / ErrDuplicateTCKN as appropriate.
func (f *FakeEmployeeRepo) Create(_ context.Context, _ Querier, e *domain.Employee) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	e.ApplyDefaults()
	for _, existing := range f.byID {
		if existing.DeletedAt != nil || existing.TenantID != e.TenantID {
			continue
		}
		if existing.EmployeeNo == e.EmployeeNo {
			return domain.ErrDuplicateEmployeeNo
		}
		if e.TCKN != nil && existing.TCKN != nil && *existing.TCKN == *e.TCKN {
			return domain.ErrDuplicateTCKN
		}
		if e.ExternalID != nil && existing.ExternalID != nil && *existing.ExternalID == *e.ExternalID {
			return domain.ErrDuplicateExternalID
		}
	}
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	e.UpdatedAt = now
	cp := *e
	f.byID[e.ID] = &cp
	return nil
}

// GetByID returns an employee by id.
func (f *FakeEmployeeRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Employee, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	e, ok := f.byID[id]
	if !ok || e.DeletedAt != nil || e.TenantID != tenantID {
		return nil, domain.ErrEmployeeNotFound
	}
	cp := *e
	return &cp, nil
}

// GetByEmployeeNo returns the first match for (tenant, employee_no).
func (f *FakeEmployeeRepo) GetByEmployeeNo(_ context.Context, tenantID uuid.UUID, empNo string) (*domain.Employee, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.byID {
		if e.DeletedAt == nil && e.TenantID == tenantID && e.EmployeeNo == empNo {
			cp := *e
			return &cp, nil
		}
	}
	return nil, domain.ErrEmployeeNotFound
}

// GetByEmail returns by email.
func (f *FakeEmployeeRepo) GetByEmail(_ context.Context, tenantID uuid.UUID, email string) (*domain.Employee, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.byID {
		if e.DeletedAt == nil && e.TenantID == tenantID && e.EmailIs != nil && strings.EqualFold(*e.EmailIs, email) {
			cp := *e
			return &cp, nil
		}
	}
	return nil, domain.ErrEmployeeNotFound
}

// GetByTCKN returns by tckn.
func (f *FakeEmployeeRepo) GetByTCKN(_ context.Context, tenantID uuid.UUID, tckn string) (*domain.Employee, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.byID {
		if e.DeletedAt == nil && e.TenantID == tenantID && e.TCKN != nil && *e.TCKN == tckn {
			cp := *e
			return &cp, nil
		}
	}
	return nil, domain.ErrEmployeeNotFound
}

// GetByUserID returns by user_id.
func (f *FakeEmployeeRepo) GetByUserID(_ context.Context, tenantID, userID uuid.UUID) (*domain.Employee, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, e := range f.byID {
		if e.DeletedAt == nil && e.TenantID == tenantID && e.UserID != nil && *e.UserID == userID {
			cp := *e
			return &cp, nil
		}
	}
	return nil, domain.ErrEmployeeNotFound
}

// Update persists changes.
func (f *FakeEmployeeRepo) Update(_ context.Context, e *domain.Employee) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[e.ID]; !ok {
		return domain.ErrEmployeeNotFound
	}
	e.UpdatedAt = time.Now().UTC()
	cp := *e
	f.byID[e.ID] = &cp
	return nil
}

// SoftDelete marks the row deleted.
func (f *FakeEmployeeRepo) SoftDelete(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	e, ok := f.byID[id]
	if !ok || e.TenantID != tenantID {
		return domain.ErrEmployeeNotFound
	}
	now := time.Now().UTC()
	e.DeletedAt = &now
	e.UpdatedAt = now
	return nil
}

// List returns a filtered page of employees.
func (f *FakeEmployeeRepo) List(_ context.Context, flt ListFilter) ([]*domain.Employee, int, error) {
	if flt.Limit <= 0 {
		flt.Limit = 50
	}
	if flt.Page <= 0 {
		flt.Page = 1
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	all := []*domain.Employee{}
	for _, e := range f.byID {
		if e.DeletedAt != nil || e.TenantID != flt.TenantID {
			continue
		}
		if flt.Status != "" && string(e.EmploymentStatus) != flt.Status {
			continue
		}
		if flt.DepartmentID != nil && (e.DepartmentID == nil || *e.DepartmentID != *flt.DepartmentID) {
			continue
		}
		if flt.PositionID != nil && (e.PositionID == nil || *e.PositionID != *flt.PositionID) {
			continue
		}
		if flt.ManagerID != nil && (e.ManagerID == nil || *e.ManagerID != *flt.ManagerID) {
			continue
		}
		if q := strings.TrimSpace(strings.ToLower(flt.Search)); q != "" {
			hay := strings.ToLower(e.Ad + " " + e.Soyad + " " + e.EmployeeNo)
			if e.EmailIs != nil {
				hay += " " + strings.ToLower(*e.EmailIs)
			}
			if !strings.Contains(hay, q) {
				continue
			}
		}
		cp := *e
		all = append(all, &cp)
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].CreatedAt.After(all[j].CreatedAt)
	})
	total := len(all)
	start := (flt.Page - 1) * flt.Limit
	if start >= total {
		return []*domain.Employee{}, total, nil
	}
	end := start + flt.Limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

// Search performs a substring search.
func (f *FakeEmployeeRepo) Search(_ context.Context, tenantID uuid.UUID, query string, limit int) ([]*domain.Employee, error) {
	if limit <= 0 {
		limit = 20
	}
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return []*domain.Employee{}, nil
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Employee{}
	for _, e := range f.byID {
		if e.DeletedAt != nil || e.TenantID != tenantID {
			continue
		}
		hay := strings.ToLower(e.Ad + " " + e.Soyad + " " + e.EmployeeNo)
		if e.EmailIs != nil {
			hay += " " + strings.ToLower(*e.EmailIs)
		}
		if strings.Contains(hay, q) {
			cp := *e
			out = append(out, &cp)
		}
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

// BulkInsert inserts a batch sequentially, stopping at the first error.
func (f *FakeEmployeeRepo) BulkInsert(ctx context.Context, tx Querier, emps []*domain.Employee) (int, error) {
	n := 0
	for _, e := range emps {
		if err := f.Create(ctx, tx, e); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// NextEmployeeNoSeq returns the next integer sequence for a tenant.
func (f *FakeEmployeeRepo) NextEmployeeNoSeq(_ context.Context, tenantID uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	maxSeq := 0
	for _, e := range f.byID {
		if e.TenantID != tenantID {
			continue
		}
		// extract trailing digits
		d := 0
		for _, c := range e.EmployeeNo {
			if c >= '0' && c <= '9' {
				d = d*10 + int(c-'0')
			}
		}
		if d > maxSeq {
			maxSeq = d
		}
	}
	return maxSeq + 1, nil
}

// FakeHistoryRepo is an in-memory HistoryRepository.
type FakeHistoryRepo struct {
	mu      sync.Mutex
	entries []*domain.EmploymentHistory
}

// NewFakeHistoryRepo creates an empty fake history repo.
func NewFakeHistoryRepo() *FakeHistoryRepo { return &FakeHistoryRepo{} }

// Append stores a history entry.
func (f *FakeHistoryRepo) Append(_ context.Context, _ Querier, h *domain.EmploymentHistory) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	h.ApplyDefaults()
	cp := *h
	f.entries = append(f.entries, &cp)
	return nil
}

// ListByEmployee returns history entries paginated.
func (f *FakeHistoryRepo) ListByEmployee(_ context.Context, employeeID uuid.UUID, page, limit int) ([]*domain.EmploymentHistory, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	all := []*domain.EmploymentHistory{}
	for _, e := range f.entries {
		if e.EmployeeID == employeeID {
			cp := *e
			all = append(all, &cp)
		}
	}
	sort.Slice(all, func(i, j int) bool {
		return all[i].EffectiveDate.After(all[j].EffectiveDate)
	})
	total := len(all)
	start := (page - 1) * limit
	if start >= total {
		return []*domain.EmploymentHistory{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	return all[start:end], total, nil
}

// GetLastByType returns the most recent entry of a given type.
func (f *FakeHistoryRepo) GetLastByType(_ context.Context, employeeID uuid.UUID, ct domain.ChangeType) (*domain.EmploymentHistory, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var latest *domain.EmploymentHistory
	for _, e := range f.entries {
		if e.EmployeeID == employeeID && e.ChangeType == ct {
			if latest == nil || e.EffectiveDate.After(latest.EffectiveDate) {
				latest = e
			}
		}
	}
	if latest == nil {
		return nil, domain.ErrHistoryNotFound
	}
	cp := *latest
	return &cp, nil
}

// FakeContactRepo is an in-memory ContactRepository.
type FakeContactRepo struct {
	mu   sync.Mutex
	byID map[uuid.UUID]*domain.EmergencyContact
}

// NewFakeContactRepo creates an empty fake contact repo.
func NewFakeContactRepo() *FakeContactRepo {
	return &FakeContactRepo{byID: map[uuid.UUID]*domain.EmergencyContact{}}
}

// Create inserts a contact, clearing any existing primary when needed.
func (f *FakeContactRepo) Create(_ context.Context, c *domain.EmergencyContact) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	c.ApplyDefaults()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.IsPrimary {
		for _, existing := range f.byID {
			if existing.EmployeeID == c.EmployeeID && existing.DeletedAt == nil {
				existing.IsPrimary = false
			}
		}
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	cp := *c
	f.byID[c.ID] = &cp
	return nil
}

// GetByID returns a contact by id.
func (f *FakeContactRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.EmergencyContact, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.byID[id]
	if !ok || c.DeletedAt != nil {
		return nil, domain.ErrContactNotFound
	}
	cp := *c
	return &cp, nil
}

// ListByEmployee returns all active contacts for an employee.
func (f *FakeContactRepo) ListByEmployee(_ context.Context, employeeID uuid.UUID) ([]*domain.EmergencyContact, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.EmergencyContact{}
	for _, c := range f.byID {
		if c.DeletedAt == nil && c.EmployeeID == employeeID {
			cp := *c
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].IsPrimary != out[j].IsPrimary {
			return out[i].IsPrimary
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

// Update persists changes.
func (f *FakeContactRepo) Update(_ context.Context, c *domain.EmergencyContact) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.byID[c.ID]; !ok {
		return domain.ErrContactNotFound
	}
	if c.IsPrimary {
		for _, existing := range f.byID {
			if existing.EmployeeID == c.EmployeeID && existing.ID != c.ID && existing.DeletedAt == nil {
				existing.IsPrimary = false
			}
		}
	}
	c.UpdatedAt = time.Now().UTC()
	cp := *c
	f.byID[c.ID] = &cp
	return nil
}

// SoftDelete marks a contact deleted.
func (f *FakeContactRepo) SoftDelete(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.byID[id]
	if !ok {
		return domain.ErrContactNotFound
	}
	now := time.Now().UTC()
	c.DeletedAt = &now
	return nil
}

// ClearPrimary clears the primary flag on all contacts for the employee.
func (f *FakeContactRepo) ClearPrimary(_ context.Context, employeeID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, c := range f.byID {
		if c.EmployeeID == employeeID && c.DeletedAt == nil {
			c.IsPrimary = false
		}
	}
	return nil
}
