package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/repository"
)

// WorkplaceService manages the tenant's SGK işyeri singleton.
type WorkplaceService struct {
	repo repository.WorkplaceRepository
}

// NewWorkplaceService constructs the service.
func NewWorkplaceService(repo repository.WorkplaceRepository) *WorkplaceService {
	return &WorkplaceService{repo: repo}
}

// WorkplaceRequest is the POST/PUT body.
type WorkplaceRequest struct {
	SicilNo              string  `json:"sicil_no"`
	Unvan                string  `json:"unvan"`
	VergiDairesi         string  `json:"vergi_dairesi,omitempty"`
	VergiNo              string  `json:"vergi_no"`
	Il                   string  `json:"il,omitempty"`
	Ilce                 string  `json:"ilce,omitempty"`
	Adres                string  `json:"adres,omitempty"`
	KanunTuru            string  `json:"kanun_turu,omitempty"`
	EbildirgeKullaniciAdi string `json:"ebildirge_kullanici_adi,omitempty"`
}

// Get returns the tenant's active workplace.
func (s *WorkplaceService) Get(ctx context.Context, tenantID uuid.UUID) (*domain.Workplace, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	return s.repo.GetActive(ctx, tenantID)
}

// Upsert saves (replaces) the tenant's workplace.
func (s *WorkplaceService) Upsert(ctx context.Context, tenantID uuid.UUID, req WorkplaceRequest) (*domain.Workplace, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrValidation
	}
	w := &domain.Workplace{
		TenantID:  tenantID,
		SicilNo:   strings.TrimSpace(req.SicilNo),
		Unvan:     strings.TrimSpace(req.Unvan),
		VergiNo:   strings.TrimSpace(req.VergiNo),
		KanunTuru: strings.TrimSpace(req.KanunTuru),
		IsActive:  true,
	}
	if v := strings.TrimSpace(req.VergiDairesi); v != "" {
		w.VergiDairesi = &v
	}
	if v := strings.TrimSpace(req.Il); v != "" {
		w.Il = &v
	}
	if v := strings.TrimSpace(req.Ilce); v != "" {
		w.Ilce = &v
	}
	if v := strings.TrimSpace(req.Adres); v != "" {
		w.Adres = &v
	}
	if v := strings.TrimSpace(req.EbildirgeKullaniciAdi); v != "" {
		w.EbildirgeKullaniciAdi = &v
	}
	w.ApplyDefaults()
	if err := w.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Upsert(ctx, w); err != nil {
		return nil, err
	}
	return w, nil
}
