package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/repository"
)

// OrgService coordinates department hierarchy operations.
type OrgService struct {
	tx        TxRunner
	depts     repository.DepartmentRepository
	publisher event.Publisher
	maxDepth  int
	log       zerolog.Logger
}

// NewOrgService creates a new OrgService.
func NewOrgService(
	tx TxRunner,
	depts repository.DepartmentRepository,
	publisher event.Publisher,
	maxDepth int,
	log zerolog.Logger,
) *OrgService {
	if tx == nil {
		tx = NoopTxRunner{}
	}
	if maxDepth <= 0 {
		maxDepth = 7
	}
	return &OrgService{tx: tx, depts: depts, publisher: publisher, maxDepth: maxDepth, log: log}
}

// CreateDepartmentInput holds the accepted fields for POST /departments.
type CreateDepartmentInput struct {
	Code         string     `json:"code" validate:"required,min=2,max=40"`
	NameTR       string     `json:"name_tr" validate:"required,min=1,max=200"`
	NameEN       *string    `json:"name_en,omitempty" validate:"omitempty,max=200"`
	Description  *string    `json:"description,omitempty" validate:"omitempty,max=2000"`
	ParentID     *uuid.UUID `json:"parent_id,omitempty"`
	HeadUserID   *uuid.UUID `json:"head_user_id,omitempty"`
	CostCenter   *string    `json:"cost_center,omitempty" validate:"omitempty,max=60"`
	Location     *string    `json:"location,omitempty" validate:"omitempty,max=120"`
	HeadcountCap *int       `json:"headcount_cap,omitempty" validate:"omitempty,gt=0"`
}

// UpdateDepartmentInput holds patchable fields.
type UpdateDepartmentInput struct {
	NameTR       *string    `json:"name_tr,omitempty" validate:"omitempty,min=1,max=200"`
	NameEN       *string    `json:"name_en,omitempty" validate:"omitempty,max=200"`
	Description  *string    `json:"description,omitempty" validate:"omitempty,max=2000"`
	HeadUserID   *uuid.UUID `json:"head_user_id,omitempty"`
	CostCenter   *string    `json:"cost_center,omitempty" validate:"omitempty,max=60"`
	Location     *string    `json:"location,omitempty" validate:"omitempty,max=120"`
	HeadcountCap *int       `json:"headcount_cap,omitempty" validate:"omitempty,gt=0"`
	Active       *bool      `json:"active,omitempty"`
}

// TreeNode is a nested department for tree views.
type TreeNode struct {
	*domain.Department
	Children []*TreeNode `json:"children"`
}

// Create builds the ltree path, persists the department, and emits an event.
func (s *OrgService) Create(ctx context.Context, tenantID uuid.UUID, in CreateDepartmentInput) (*domain.Department, error) {
	if err := domain.ValidateCode(in.Code); err != nil {
		return nil, domain.NewValidationError(map[string]string{"code": "invalid format"})
	}
	if strings.TrimSpace(in.NameTR) == "" {
		return nil, domain.NewValidationError(map[string]string{"name_tr": "required"})
	}

	var parentPath string
	depth := 0
	if in.ParentID != nil {
		parent, err := s.depts.GetByID(ctx, tenantID, *in.ParentID)
		if err != nil {
			return nil, err
		}
		parentPath = parent.Path
		depth = domain.PathDepth(parent.Path) + 1
	}
	if depth >= s.maxDepth {
		return nil, domain.ErrMaxDepthExceeded
	}

	path := domain.BuildPath(parentPath, in.Code)
	now := time.Now().UTC()
	d := &domain.Department{
		ID:           uuid.New(),
		TenantID:     tenantID,
		ParentID:     in.ParentID,
		Code:         strings.ToLower(strings.TrimSpace(in.Code)),
		NameTR:       strings.TrimSpace(in.NameTR),
		NameEN:       in.NameEN,
		Description:  in.Description,
		Path:         path,
		Depth:        depth,
		HeadUserID:   in.HeadUserID,
		CostCenter:   in.CostCenter,
		Location:     in.Location,
		HeadcountCap: in.HeadcountCap,
		Active:       true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.depts.Create(ctx, nil, d); err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicDepartmentCreated, map[string]any{
		"department_id": d.ID,
		"tenant_id":     d.TenantID,
		"name":          d.NameTR,
		"code":          d.Code,
		"path":          d.Path,
		"parent_id":     d.ParentID,
		"created_at":    d.CreatedAt,
	})
	return d, nil
}

// Get fetches a department by ID.
func (s *OrgService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Department, error) {
	return s.depts.GetByID(ctx, tenantID, id)
}

// List returns a flat list of departments.
func (s *OrgService) List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Department, error) {
	return s.depts.List(ctx, tenantID, includeArchived)
}

// GetTree returns the hierarchy as nested TreeNode objects.
func (s *OrgService) GetTree(ctx context.Context, tenantID uuid.UUID) ([]*TreeNode, error) {
	depts, err := s.depts.List(ctx, tenantID, false)
	if err != nil {
		return nil, err
	}
	return buildTree(depts), nil
}

// GetSubtree returns descendants of the given department (root included).
func (s *OrgService) GetSubtree(ctx context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error) {
	d, err := s.depts.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	return s.depts.GetSubtree(ctx, nil, tenantID, d.Path)
}

// GetAncestors returns the breadcrumb chain.
func (s *OrgService) GetAncestors(ctx context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error) {
	if _, err := s.depts.GetByID(ctx, tenantID, id); err != nil {
		return nil, err
	}
	return s.depts.GetAncestors(ctx, tenantID, id)
}

// GetChildren returns direct children.
func (s *OrgService) GetChildren(ctx context.Context, tenantID, id uuid.UUID) ([]*domain.Department, error) {
	if _, err := s.depts.GetByID(ctx, tenantID, id); err != nil {
		return nil, err
	}
	return s.depts.ListByParent(ctx, tenantID, &id)
}

// Update applies a partial update.
func (s *OrgService) Update(ctx context.Context, tenantID, id uuid.UUID, in UpdateDepartmentInput) (*domain.Department, error) {
	d, err := s.depts.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if in.NameTR != nil {
		if strings.TrimSpace(*in.NameTR) == "" {
			return nil, domain.NewValidationError(map[string]string{"name_tr": "required"})
		}
		d.NameTR = strings.TrimSpace(*in.NameTR)
	}
	if in.NameEN != nil {
		d.NameEN = in.NameEN
	}
	if in.Description != nil {
		d.Description = in.Description
	}
	if in.HeadUserID != nil {
		d.HeadUserID = in.HeadUserID
	}
	if in.CostCenter != nil {
		d.CostCenter = in.CostCenter
	}
	if in.Location != nil {
		d.Location = in.Location
	}
	if in.HeadcountCap != nil {
		d.HeadcountCap = in.HeadcountCap
	}
	if in.Active != nil {
		d.Active = *in.Active
	}
	if err := s.depts.Update(ctx, nil, d); err != nil {
		return nil, err
	}
	_ = s.publisher.Publish(ctx, event.TopicDepartmentUpdated, map[string]any{
		"department_id": d.ID,
		"tenant_id":     d.TenantID,
		"name":          d.NameTR,
		"path":          d.Path,
		"updated_at":    d.UpdatedAt,
	})
	return d, nil
}

// Move relocates a department (and its descendants) under a new parent.
// Runs atomically in a transaction. Prevents cycles and enforces max depth.
func (s *OrgService) Move(ctx context.Context, tenantID, id uuid.UUID, newParentID *uuid.UUID) error {
	d, err := s.depts.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	var newParentPath string
	var newParent *domain.Department
	if newParentID != nil {
		if *newParentID == id {
			return domain.ErrCycleDetected
		}
		newParent, err = s.depts.GetByID(ctx, tenantID, *newParentID)
		if err != nil {
			return err
		}
		// Prevent moving into own subtree.
		if domain.IsAncestorPath(d.Path, newParent.Path) || d.Path == newParent.Path {
			return domain.ErrCycleDetected
		}
		newParentPath = newParent.Path
	}
	// Enforce max depth considering this subtree's own depth.
	subtreeDepth, err := s.subtreeMaxDepth(ctx, tenantID, d.Path)
	if err != nil {
		return err
	}
	relDepth := subtreeDepth - domain.PathDepth(d.Path)
	newRootDepth := domain.PathDepth(newParentPath) + 1
	if newRootDepth+relDepth >= s.maxDepth {
		return domain.ErrMaxDepthExceeded
	}

	oldPath := d.Path
	newPath := domain.BuildPath(newParentPath, d.Code)
	if oldPath == newPath {
		return nil
	}

	if err := s.tx.RunInTx(ctx, func(q repository.Querier) error {
		if err := s.depts.MovePaths(ctx, q, tenantID, oldPath, newPath); err != nil {
			return err
		}
		// Update parent_id on the moved department record directly. In the
		// fake/unit path the Querier is nil; the repo-level fakes update
		// parent_id through the helper below.
		if q == nil {
			return s.depts.SetParent(ctx, id, newParentID)
		}
		_, err := q.ExecContext(ctx,
			`UPDATE app.departments SET parent_id = $2, updated_at = now() WHERE id = $1`,
			id, newParentID)
		return err
	}); err != nil {
		return err
	}

	_ = s.publisher.Publish(ctx, event.TopicDepartmentMoved, map[string]any{
		"department_id": id,
		"tenant_id":     tenantID,
		"old_path":      oldPath,
		"new_path":      newPath,
		"new_parent_id": newParentID,
	})
	return nil
}

// Archive soft-deletes a department if it has no active children.
func (s *OrgService) Archive(ctx context.Context, tenantID, id uuid.UUID) error {
	d, err := s.depts.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	n, err := s.depts.CountActiveChildren(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return domain.ErrDepartmentHasChildren
	}
	if err := s.depts.Archive(ctx, id); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicDepartmentDeleted, map[string]any{
		"department_id": d.ID,
		"tenant_id":     d.TenantID,
		"path":          d.Path,
		"deleted_at":    time.Now().UTC(),
	})
	return nil
}

func (s *OrgService) subtreeMaxDepth(ctx context.Context, tenantID uuid.UUID, rootPath string) (int, error) {
	subtree, err := s.depts.GetSubtree(ctx, nil, tenantID, rootPath)
	if err != nil {
		return 0, err
	}
	max := 0
	for _, d := range subtree {
		if dd := domain.PathDepth(d.Path); dd > max {
			max = dd
		}
	}
	return max, nil
}

// buildTree assembles a nested tree from a flat, path-ordered slice.
func buildTree(depts []*domain.Department) []*TreeNode {
	byID := make(map[uuid.UUID]*TreeNode, len(depts))
	roots := []*TreeNode{}
	for _, d := range depts {
		byID[d.ID] = &TreeNode{Department: d, Children: []*TreeNode{}}
	}
	for _, d := range depts {
		node := byID[d.ID]
		if d.ParentID == nil {
			roots = append(roots, node)
			continue
		}
		if parent, ok := byID[*d.ParentID]; ok {
			parent.Children = append(parent.Children, node)
		} else {
			// Orphan (parent archived): treat as root.
			roots = append(roots, node)
		}
	}
	return roots
}
