package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/repository"
)

// SearchService wraps trigram-based full-text employee search.
type SearchService struct {
	employees repository.EmployeeRepository
}

// NewSearchService constructs a SearchService.
func NewSearchService(employees repository.EmployeeRepository) *SearchService {
	return &SearchService{employees: employees}
}

// Search returns up to limit employees whose ad/soyad/employee_no/email match q.
// When q is empty it returns an empty slice.
func (s *SearchService) Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Employee, error) {
	q = strings.TrimSpace(q)
	if q == "" {
		return []*domain.Employee{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.employees.Search(ctx, tenantID, q, limit)
}

// Suggest returns up to 10 name completions for the given prefix.
func (s *SearchService) Suggest(ctx context.Context, tenantID uuid.UUID, prefix string) ([]string, error) {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return []string{}, nil
	}
	emps, err := s.employees.Search(ctx, tenantID, prefix, 10)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(emps))
	for _, e := range emps {
		name := strings.TrimSpace(e.Ad + " " + e.Soyad)
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out, nil
}
