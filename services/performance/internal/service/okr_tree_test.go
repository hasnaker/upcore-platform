package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/repository"
)

// fakeOKRRepo is an in-memory implementation of repository.OKRRepository used
// exclusively for testing OKRService.Tree — the real repo requires a live DB.
type fakeOKRRepo struct {
	items map[uuid.UUID]*domain.OKR
	krs   map[uuid.UUID][]domain.OKRKeyResult
}

func newFakeOKRRepo() *fakeOKRRepo {
	return &fakeOKRRepo{
		items: map[uuid.UUID]*domain.OKR{},
		krs:   map[uuid.UUID][]domain.OKRKeyResult{},
	}
}

func (r *fakeOKRRepo) Create(_ context.Context, o *domain.OKR, krs []domain.OKRKeyResult) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	r.items[o.ID] = o
	r.krs[o.ID] = krs
	return nil
}
func (r *fakeOKRRepo) UpdateOKR(_ context.Context, o *domain.OKR) error {
	r.items[o.ID] = o
	return nil
}
func (r *fakeOKRRepo) GetByID(_ context.Context, tenantID, id uuid.UUID) (*domain.OKR, error) {
	o, ok := r.items[id]
	if !ok || o.TenantID != tenantID {
		return nil, domain.ErrNotFound
	}
	clone := *o
	clone.KeyResults = append([]domain.OKRKeyResult{}, r.krs[id]...)
	return &clone, nil
}
func (r *fakeOKRRepo) List(_ context.Context, tenantID, cycleID uuid.UUID, ownerType string, ownerID uuid.UUID) ([]*domain.OKR, error) {
	out := []*domain.OKR{}
	for _, o := range r.items {
		if o.TenantID != tenantID {
			continue
		}
		if cycleID != uuid.Nil && o.CycleID != cycleID {
			continue
		}
		if ownerType != "" && string(o.OwnerType) != ownerType {
			continue
		}
		if ownerID != uuid.Nil && (o.OwnerID == nil || *o.OwnerID != ownerID) {
			continue
		}
		out = append(out, o)
	}
	return out, nil
}
func (r *fakeOKRRepo) ListPaged(ctx context.Context, f repository.OKRListFilter) ([]*domain.OKR, error) {
	// Reuse List + in-memory cursor cut; tests exercise Tree, not keyset.
	items, err := r.List(ctx, f.TenantID, f.CycleID, f.OwnerType, f.OwnerID)
	if err != nil {
		return nil, err
	}
	if f.CursorCreatedAt != nil && f.CursorID != nil {
		filtered := items[:0]
		for _, o := range items {
			if o.CreatedAt.Before(*f.CursorCreatedAt) ||
				(o.CreatedAt.Equal(*f.CursorCreatedAt) && o.ID.String() < f.CursorID.String()) {
				filtered = append(filtered, o)
			}
		}
		items = filtered
	}
	if f.Limit > 0 && len(items) > f.Limit {
		items = items[:f.Limit]
	}
	return items, nil
}

func (r *fakeOKRRepo) UpsertKR(_ context.Context, _ uuid.UUID, kr *domain.OKRKeyResult) error {
	list := r.krs[kr.OKRID]
	for i, existing := range list {
		if existing.ID == kr.ID {
			list[i] = *kr
			r.krs[kr.OKRID] = list
			return nil
		}
	}
	r.krs[kr.OKRID] = append(list, *kr)
	return nil
}

func TestOKRService_Tree_BuildsCascade(t *testing.T) {
	repo := newFakeOKRRepo()
	svc := NewOKRService(repo, zerolog.Nop())
	tenantID := uuid.New()
	cycleID := uuid.New()
	ctx := context.Background()

	root, _ := svc.Create(ctx, tenantID, uuid.New(), OKRRequest{
		CycleID:     cycleID,
		OwnerType:   "company",
		ObjectiveTR: "Şirket büyümesini hızlandır",
		KeyResults: []OKRKeyReqItem{
			{TitleTR: "Gelir 10M", MetricType: "numeric", TargetValue: 10_000_000},
		},
	})
	child1, _ := svc.Create(ctx, tenantID, uuid.New(), OKRRequest{
		CycleID:     cycleID,
		OwnerType:   "department",
		ParentOKRID: &root.ID,
		ObjectiveTR: "Satış ekibi kotası",
	})
	grandchild, _ := svc.Create(ctx, tenantID, uuid.New(), OKRRequest{
		CycleID:     cycleID,
		OwnerType:   "individual",
		ParentOKRID: &child1.ID,
		ObjectiveTR: "Bireysel hedef",
	})
	// Orphan — parent not in same cycle → must surface as root.
	otherCycle := uuid.New()
	_, _ = svc.Create(ctx, tenantID, uuid.New(), OKRRequest{
		CycleID:     cycleID,
		OwnerType:   "team",
		ParentOKRID: &otherCycle,
		ObjectiveTR: "Öksüz hedef",
	})

	roots, err := svc.Tree(ctx, tenantID, cycleID)
	if err != nil {
		t.Fatalf("tree: %v", err)
	}
	if len(roots) != 2 {
		t.Fatalf("want 2 roots (company + orphan), got %d", len(roots))
	}
	// Company-first ordering.
	if roots[0].OwnerType != "company" {
		t.Errorf("expected company first, got %s", roots[0].OwnerType)
	}
	if roots[0].ID != root.ID {
		t.Errorf("root id mismatch")
	}
	if len(roots[0].Children) != 1 || roots[0].Children[0].ID != child1.ID {
		t.Fatalf("child linkage broken")
	}
	if len(roots[0].Children[0].Children) != 1 || roots[0].Children[0].Children[0].ID != grandchild.ID {
		t.Errorf("grandchild linkage broken")
	}
	if len(roots[0].KeyResults) != 1 {
		t.Errorf("KRs not hydrated, got %d", len(roots[0].KeyResults))
	}
}

func TestOKRService_Tree_MissingCycle(t *testing.T) {
	repo := newFakeOKRRepo()
	svc := NewOKRService(repo, zerolog.Nop())
	_, err := svc.Tree(context.Background(), uuid.New(), uuid.Nil)
	if err == nil {
		t.Fatalf("expected validation error when cycle_id is nil")
	}
	var ve *domain.ValidationError
	if !errorsAs(err, &ve) {
		t.Fatalf("want *ValidationError, got %T", err)
	}
}

// helper so test file does not import "errors" twice.
func errorsAs(err error, target **domain.ValidationError) bool {
	if err == nil {
		return false
	}
	ve, ok := err.(*domain.ValidationError)
	if !ok {
		return false
	}
	*target = ve
	return true
}
