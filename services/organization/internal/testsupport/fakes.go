package testsupport

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/repository"
)

// --- Department fake ---

// FakeDepartmentRepo is an in-memory DepartmentRepository.
type FakeDepartmentRepo struct {
	mu    sync.Mutex
	items map[uuid.UUID]*domain.Department
}

// NewFakeDepartmentRepo creates an empty repo.
func NewFakeDepartmentRepo() *FakeDepartmentRepo {
	return &FakeDepartmentRepo{items: map[uuid.UUID]*domain.Department{}}
}

// Create inserts a department.
func (f *FakeDepartmentRepo) Create(_ context.Context, _ repository.Querier, d *domain.Department) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, existing := range f.items {
		if existing.TenantID == d.TenantID && existing.Code == d.Code && existing.DeletedAt == nil {
			return domain.ErrDuplicateCode
		}
	}
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	cp := *d
	f.items[d.ID] = &cp
	return nil
}

// GetByID returns a department by ID.
func (f *FakeDepartmentRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.items[id]
	if !ok || d.TenantID != tenantID || d.DeletedAt != nil {
		return nil, domain.ErrDepartmentNotFound
	}
	cp := *d
	return &cp, nil
}

// GetByCode returns a department by code.
func (f *FakeDepartmentRepo) GetByCode(_ context.Context, tenantID uuid.UUID, code string) (*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, d := range f.items {
		if d.TenantID == tenantID && d.Code == code && d.DeletedAt == nil {
			cp := *d
			return &cp, nil
		}
	}
	return nil, domain.ErrDepartmentNotFound
}

// List returns all departments for a tenant.
func (f *FakeDepartmentRepo) List(_ context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Department{}
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil {
			continue
		}
		if !includeArchived && !d.Active {
			continue
		}
		cp := *d
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out, nil
}

// ListByParent returns direct children.
func (f *FakeDepartmentRepo) ListByParent(_ context.Context, tenantID uuid.UUID, parentID *uuid.UUID) ([]*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Department{}
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil {
			continue
		}
		if parentID == nil && d.ParentID == nil {
			cp := *d
			out = append(out, &cp)
			continue
		}
		if parentID != nil && d.ParentID != nil && *d.ParentID == *parentID {
			cp := *d
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out, nil
}

// GetSubtree returns departments whose path starts with rootPath.
func (f *FakeDepartmentRepo) GetSubtree(_ context.Context, _ repository.Querier, tenantID uuid.UUID, rootPath string) ([]*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Department{}
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil {
			continue
		}
		if d.Path == rootPath || strings.HasPrefix(d.Path, rootPath+".") {
			cp := *d
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Path < out[j].Path })
	return out, nil
}

// GetAncestors returns each ancestor of the given department.
func (f *FakeDepartmentRepo) GetAncestors(_ context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	target, ok := f.items[id]
	if !ok || target.TenantID != tenantID {
		return nil, domain.ErrDepartmentNotFound
	}
	out := []*domain.Department{}
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil || d.ID == id {
			continue
		}
		if strings.HasPrefix(target.Path, d.Path+".") {
			cp := *d
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return domain.PathDepth(out[i].Path) < domain.PathDepth(out[j].Path) })
	return out, nil
}

// Update persists edits.
func (f *FakeDepartmentRepo) Update(_ context.Context, _ repository.Querier, d *domain.Department) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cur, ok := f.items[d.ID]
	if !ok || cur.DeletedAt != nil {
		return domain.ErrDepartmentNotFound
	}
	d.UpdatedAt = time.Now().UTC()
	cp := *d
	f.items[d.ID] = &cp
	return nil
}

// UpdatePath updates the stored path + depth.
func (f *FakeDepartmentRepo) UpdatePath(_ context.Context, _ repository.Querier, id uuid.UUID, path string, depth int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.items[id]
	if !ok {
		return domain.ErrDepartmentNotFound
	}
	d.Path = path
	d.Depth = depth
	d.UpdatedAt = time.Now().UTC()
	return nil
}

// MovePaths rewrites paths whose prefix is oldRoot.
func (f *FakeDepartmentRepo) MovePaths(_ context.Context, _ repository.Querier, tenantID uuid.UUID, oldRoot, newRoot string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil {
			continue
		}
		if d.Path == oldRoot || strings.HasPrefix(d.Path, oldRoot+".") {
			d.Path = domain.MoveSubpath(oldRoot, newRoot, d.Path)
			d.Depth = domain.PathDepth(d.Path)
			d.UpdatedAt = time.Now().UTC()
		}
	}
	return nil
}

// Archive soft-deletes a department.
func (f *FakeDepartmentRepo) Archive(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.items[id]
	if !ok || d.DeletedAt != nil {
		return domain.ErrDepartmentNotFound
	}
	now := time.Now().UTC()
	d.Active = false
	d.DeletedAt = &now
	d.UpdatedAt = now
	return nil
}

// SetParent updates parent_id.
func (f *FakeDepartmentRepo) SetParent(_ context.Context, id uuid.UUID, parentID *uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.items[id]
	if !ok {
		return domain.ErrDepartmentNotFound
	}
	d.ParentID = parentID
	d.UpdatedAt = time.Now().UTC()
	return nil
}

// CountActiveChildren returns children count.
func (f *FakeDepartmentRepo) CountActiveChildren(_ context.Context, tenantID, parentID uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, d := range f.items {
		if d.TenantID != tenantID || d.DeletedAt != nil || !d.Active {
			continue
		}
		if d.ParentID != nil && *d.ParentID == parentID {
			n++
		}
	}
	return n, nil
}

// --- Position fake ---

// FakePositionRepo is an in-memory PositionRepository.
type FakePositionRepo struct {
	mu    sync.Mutex
	items map[uuid.UUID]*domain.Position
}

// NewFakePositionRepo creates an empty repo.
func NewFakePositionRepo() *FakePositionRepo {
	return &FakePositionRepo{items: map[uuid.UUID]*domain.Position{}}
}

// Create inserts a position.
func (f *FakePositionRepo) Create(_ context.Context, _ repository.Querier, p *domain.Position) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, existing := range f.items {
		if existing.TenantID == p.TenantID && existing.Code == p.Code && existing.DeletedAt == nil {
			return domain.ErrDuplicateCode
		}
	}
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	cp := *p
	f.items[p.ID] = &cp
	return nil
}

// GetByID returns a position.
func (f *FakePositionRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Position, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.items[id]
	if !ok || p.TenantID != tenantID || p.DeletedAt != nil {
		return nil, domain.ErrPositionNotFound
	}
	cp := *p
	return &cp, nil
}

// GetByCode returns a position by code.
func (f *FakePositionRepo) GetByCode(_ context.Context, tenantID uuid.UUID, code string) (*domain.Position, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, p := range f.items {
		if p.TenantID == tenantID && p.Code == code && p.DeletedAt == nil {
			cp := *p
			return &cp, nil
		}
	}
	return nil, domain.ErrPositionNotFound
}

// List returns matching positions.
func (f *FakePositionRepo) List(_ context.Context, tenantID uuid.UUID, filter repository.PositionFilter) ([]*domain.Position, int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Position{}
	for _, p := range f.items {
		if p.TenantID != tenantID || p.DeletedAt != nil {
			continue
		}
		if !filter.IncludeArchived && !p.Active {
			continue
		}
		if filter.DepartmentID != nil {
			if p.DepartmentID == nil || *p.DepartmentID != *filter.DepartmentID {
				continue
			}
		}
		if filter.JobFamily != "" && (p.JobFamily == nil || *p.JobFamily != filter.JobFamily) {
			continue
		}
		if filter.JobLevel != "" && (p.JobLevel == nil || *p.JobLevel != filter.JobLevel) {
			continue
		}
		if filter.Search != "" && !strings.Contains(strings.ToLower(p.TitleTR), strings.ToLower(filter.Search)) {
			continue
		}
		cp := *p
		out = append(out, &cp)
	}
	total := len(out)
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if filter.Limit > 0 && len(out) > filter.Limit {
		start := (filter.Page - 1) * filter.Limit
		if start < 0 {
			start = 0
		}
		end := start + filter.Limit
		if start >= len(out) {
			return []*domain.Position{}, total, nil
		}
		if end > len(out) {
			end = len(out)
		}
		out = out[start:end]
	}
	return out, total, nil
}

// Update persists edits.
func (f *FakePositionRepo) Update(_ context.Context, _ repository.Querier, p *domain.Position) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cur, ok := f.items[p.ID]
	if !ok || cur.DeletedAt != nil {
		return domain.ErrPositionNotFound
	}
	p.UpdatedAt = time.Now().UTC()
	cp := *p
	f.items[p.ID] = &cp
	return nil
}

// UpdateJDR replaces the JD-R fields.
func (f *FakePositionRepo) UpdateJDR(_ context.Context, _ repository.Querier, tenantID, id uuid.UUID, demands domain.JDRDemands, resources domain.JDRResources) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.items[id]
	if !ok || p.TenantID != tenantID || p.DeletedAt != nil {
		return domain.ErrPositionNotFound
	}
	p.JDRDemands = demands
	p.JDRResources = resources
	p.UpdatedAt = time.Now().UTC()
	return nil
}

// Archive soft-deletes.
func (f *FakePositionRepo) Archive(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.items[id]
	if !ok || p.TenantID != tenantID || p.DeletedAt != nil {
		return domain.ErrPositionNotFound
	}
	now := time.Now().UTC()
	p.Active = false
	p.DeletedAt = &now
	return nil
}

// --- Team fake ---

// FakeTeamRepo is an in-memory TeamRepository.
type FakeTeamRepo struct {
	mu      sync.Mutex
	items   map[uuid.UUID]*domain.Team
	members map[string]*domain.TeamMember
}

// NewFakeTeamRepo creates an empty repo.
func NewFakeTeamRepo() *FakeTeamRepo {
	return &FakeTeamRepo{items: map[uuid.UUID]*domain.Team{}, members: map[string]*domain.TeamMember{}}
}

func memberKey(teamID, employeeID uuid.UUID) string { return teamID.String() + "|" + employeeID.String() }

// Create inserts a team.
func (f *FakeTeamRepo) Create(_ context.Context, _ repository.Querier, t *domain.Team) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	cp := *t
	f.items[t.ID] = &cp
	return nil
}

// GetByID returns a team.
func (f *FakeTeamRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.Team, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	t, ok := f.items[id]
	if !ok || t.TenantID != tenantID || t.DeletedAt != nil {
		return nil, domain.ErrTeamNotFound
	}
	cp := *t
	return &cp, nil
}

// List returns all teams for tenant.
func (f *FakeTeamRepo) List(_ context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Team, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Team{}
	for _, t := range f.items {
		if t.TenantID != tenantID || t.DeletedAt != nil {
			continue
		}
		if !includeArchived && !t.Active {
			continue
		}
		cp := *t
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

// ListByDepartment returns teams for a department.
func (f *FakeTeamRepo) ListByDepartment(_ context.Context, tenantID, departmentID uuid.UUID) ([]*domain.Team, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.Team{}
	for _, t := range f.items {
		if t.TenantID != tenantID || t.DeletedAt != nil || !t.Active {
			continue
		}
		if t.DepartmentID != nil && *t.DepartmentID == departmentID {
			cp := *t
			out = append(out, &cp)
		}
	}
	return out, nil
}

// Update persists team edits.
func (f *FakeTeamRepo) Update(_ context.Context, _ repository.Querier, t *domain.Team) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cur, ok := f.items[t.ID]
	if !ok || cur.DeletedAt != nil {
		return domain.ErrTeamNotFound
	}
	t.UpdatedAt = time.Now().UTC()
	cp := *t
	f.items[t.ID] = &cp
	return nil
}

// Archive soft-deletes.
func (f *FakeTeamRepo) Archive(_ context.Context, tenantID, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	t, ok := f.items[id]
	if !ok || t.TenantID != tenantID || t.DeletedAt != nil {
		return domain.ErrTeamNotFound
	}
	now := time.Now().UTC()
	t.Active = false
	t.DeletedAt = &now
	return nil
}

// AddMember upserts a member row.
func (f *FakeTeamRepo) AddMember(_ context.Context, _ repository.Querier, m *domain.TeamMember) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cp := *m
	f.members[memberKey(m.TeamID, m.EmployeeID)] = &cp
	return nil
}

// RemoveMember deletes a member row.
func (f *FakeTeamRepo) RemoveMember(_ context.Context, tenantID, teamID, employeeID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	k := memberKey(teamID, employeeID)
	if m, ok := f.members[k]; !ok || m.TenantID != tenantID {
		return domain.ErrNotFound
	}
	delete(f.members, k)
	return nil
}

// ListMembers returns team members.
func (f *FakeTeamRepo) ListMembers(_ context.Context, tenantID, teamID uuid.UUID) ([]*domain.TeamMember, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.TeamMember{}
	for _, m := range f.members {
		if m.TenantID == tenantID && m.TeamID == teamID {
			cp := *m
			out = append(out, &cp)
		}
	}
	return out, nil
}

// ListByEmployee returns teams for an employee.
func (f *FakeTeamRepo) ListByEmployee(_ context.Context, tenantID, employeeID uuid.UUID) ([]*domain.TeamMember, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.TeamMember{}
	for _, m := range f.members {
		if m.TenantID == tenantID && m.EmployeeID == employeeID {
			cp := *m
			out = append(out, &cp)
		}
	}
	return out, nil
}

// --- Reporting fake ---

// FakeReportingRepo is an in-memory ReportingRepository.
type FakeReportingRepo struct {
	mu    sync.Mutex
	items map[uuid.UUID]*domain.ReportingLine
}

// NewFakeReportingRepo creates an empty repo.
func NewFakeReportingRepo() *FakeReportingRepo {
	return &FakeReportingRepo{items: map[uuid.UUID]*domain.ReportingLine{}}
}

// Create inserts a line.
func (f *FakeReportingRepo) Create(_ context.Context, _ repository.Querier, r *domain.ReportingLine) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	cp := *r
	f.items[r.ID] = &cp
	return nil
}

// GetByID returns a line.
func (f *FakeReportingRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	l, ok := f.items[id]
	if !ok || l.TenantID != tenantID {
		return nil, domain.ErrReportingNotFound
	}
	cp := *l
	return &cp, nil
}

// EndLine sets effective_to.
func (f *FakeReportingRepo) EndLine(_ context.Context, tenantID, id uuid.UUID, endAt time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	l, ok := f.items[id]
	if !ok || l.TenantID != tenantID || l.EffectiveTo != nil {
		return domain.ErrReportingNotFound
	}
	t := endAt.UTC()
	l.EffectiveTo = &t
	return nil
}

// GetActiveLines returns lines without effective_to.
func (f *FakeReportingRepo) GetActiveLines(_ context.Context, tenantID uuid.UUID) ([]*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.ReportingLine{}
	for _, l := range f.items {
		if l.TenantID == tenantID && l.EffectiveTo == nil {
			cp := *l
			out = append(out, &cp)
		}
	}
	return out, nil
}

// GetCurrentManager returns the current solid manager.
func (f *FakeReportingRepo) GetCurrentManager(_ context.Context, tenantID, employeeID uuid.UUID) (*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var best *domain.ReportingLine
	for _, l := range f.items {
		if l.TenantID != tenantID || l.EmployeeID != employeeID || l.Type != domain.LineSolid || l.EffectiveTo != nil {
			continue
		}
		if best == nil || l.EffectiveFrom.After(best.EffectiveFrom) {
			best = l
		}
	}
	if best == nil {
		return nil, domain.ErrReportingNotFound
	}
	cp := *best
	return &cp, nil
}

// GetDirectReports returns reports for a manager.
func (f *FakeReportingRepo) GetDirectReports(_ context.Context, tenantID, managerID uuid.UUID, includeDotted bool) ([]*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.ReportingLine{}
	for _, l := range f.items {
		if l.TenantID != tenantID || l.ManagerID != managerID || l.EffectiveTo != nil {
			continue
		}
		if !includeDotted && l.Type != domain.LineSolid {
			continue
		}
		cp := *l
		out = append(out, &cp)
	}
	return out, nil
}

// GetDottedManagers returns dotted-line managers for an employee.
func (f *FakeReportingRepo) GetDottedManagers(_ context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.ReportingLine{}
	for _, l := range f.items {
		if l.TenantID != tenantID || l.EmployeeID != employeeID || l.Type != domain.LineDotted || l.EffectiveTo != nil {
			continue
		}
		cp := *l
		out = append(out, &cp)
	}
	return out, nil
}

// GetChainUpward follows solid managers upwards.
func (f *FakeReportingRepo) GetChainUpward(_ context.Context, tenantID, employeeID uuid.UUID, maxDepth int) ([]*domain.ReportingLine, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	mgrOf := map[uuid.UUID]*domain.ReportingLine{}
	for _, l := range f.items {
		if l.TenantID != tenantID || l.Type != domain.LineSolid || l.EffectiveTo != nil {
			continue
		}
		mgrOf[l.EmployeeID] = l
	}
	out := []*domain.ReportingLine{}
	current := employeeID
	for i := 0; i < maxDepth; i++ {
		l, ok := mgrOf[current]
		if !ok {
			break
		}
		cp := *l
		out = append(out, &cp)
		current = l.ManagerID
	}
	return out, nil
}

// --- Headcount fake ---

// FakeHeadcountRepo is an in-memory HeadcountRepository.
type FakeHeadcountRepo struct {
	mu    sync.Mutex
	items map[string]*domain.HeadcountSnapshot
}

// NewFakeHeadcountRepo creates an empty repo.
func NewFakeHeadcountRepo() *FakeHeadcountRepo {
	return &FakeHeadcountRepo{items: map[string]*domain.HeadcountSnapshot{}}
}

func snapKey(tenantID, deptID uuid.UUID, date time.Time) string {
	return tenantID.String() + "|" + deptID.String() + "|" + date.Format("2006-01-02")
}

// UpsertSnapshot inserts or updates.
func (f *FakeHeadcountRepo) UpsertSnapshot(_ context.Context, _ repository.Querier, s *domain.HeadcountSnapshot) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	cp := *s
	f.items[snapKey(s.TenantID, s.DepartmentID, s.SnapshotDate)] = &cp
	return nil
}

// GetByDate returns snapshots on a specific date.
func (f *FakeHeadcountRepo) GetByDate(_ context.Context, tenantID uuid.UUID, snapshotDate time.Time) ([]*domain.HeadcountSnapshot, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.HeadcountSnapshot{}
	for _, s := range f.items {
		if s.TenantID == tenantID && s.SnapshotDate.Equal(snapshotDate) {
			cp := *s
			out = append(out, &cp)
		}
	}
	return out, nil
}

// GetLatestByTenant returns snapshots with the most recent date.
func (f *FakeHeadcountRepo) GetLatestByTenant(_ context.Context, tenantID uuid.UUID) ([]*domain.HeadcountSnapshot, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var latest time.Time
	for _, s := range f.items {
		if s.TenantID != tenantID {
			continue
		}
		if s.SnapshotDate.After(latest) {
			latest = s.SnapshotDate
		}
	}
	out := []*domain.HeadcountSnapshot{}
	for _, s := range f.items {
		if s.TenantID == tenantID && s.SnapshotDate.Equal(latest) {
			cp := *s
			out = append(out, &cp)
		}
	}
	return out, nil
}

// GetTrend returns snapshots in the window.
func (f *FakeHeadcountRepo) GetTrend(_ context.Context, tenantID uuid.UUID, departmentID *uuid.UUID, months int) ([]*domain.HeadcountSnapshot, error) {
	if months <= 0 {
		months = 12
	}
	cutoff := time.Now().AddDate(0, -months, 0)
	f.mu.Lock()
	defer f.mu.Unlock()
	out := []*domain.HeadcountSnapshot{}
	for _, s := range f.items {
		if s.TenantID != tenantID || s.SnapshotDate.Before(cutoff) {
			continue
		}
		if departmentID != nil && s.DepartmentID != *departmentID {
			continue
		}
		cp := *s
		out = append(out, &cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SnapshotDate.Before(out[j].SnapshotDate) })
	return out, nil
}
