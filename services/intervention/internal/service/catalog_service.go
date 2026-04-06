package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/intervention/internal/domain"
	"github.com/upcore/intervention/internal/event"
	"github.com/upcore/intervention/internal/repository"
)

// CatalogService manages intervention catalog CRUD.
type CatalogService struct {
	catalog   repository.CatalogRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewCatalogService constructs a CatalogService.
func NewCatalogService(catalog repository.CatalogRepository, publisher event.Publisher, log zerolog.Logger) *CatalogService {
	return &CatalogService{
		catalog:   catalog,
		publisher: publisher,
		log:       log.With().Str("component", "catalog_service").Logger(),
	}
}

// List returns catalog entries filtered by criteria.
func (s *CatalogService) List(ctx context.Context, f domain.CatalogFilter) ([]*domain.Intervention, int, error) {
	return s.catalog.List(ctx, f)
}

// Get returns a catalog entry by ID.
func (s *CatalogService) Get(ctx context.Context, id uuid.UUID) (*domain.Intervention, error) {
	return s.catalog.GetByID(ctx, id)
}

// Create creates a new catalog entry.
func (s *CatalogService) Create(ctx context.Context, i *domain.Intervention) error {
	if err := i.Validate(); err != nil {
		return err
	}
	i.Active = true
	if err := s.catalog.Create(ctx, i); err != nil {
		return fmt.Errorf("create intervention: %w", err)
	}
	s.log.Info().Str("code", i.Code).Msg("intervention created")
	return nil
}

// Update updates an existing catalog entry.
func (s *CatalogService) Update(ctx context.Context, id uuid.UUID, updates map[string]any) (*domain.Intervention, error) {
	i, err := s.catalog.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if v, ok := updates["title_tr"].(string); ok {
		i.TitleTR = v
	}
	if v, ok := updates["description_tr"].(string); ok {
		i.DescriptionTR = v
	}
	if v, ok := updates["category"].(string); ok {
		i.Category = domain.Category(v)
	}
	if v, ok := updates["evidence_tier"].(string); ok {
		i.EvidenceTier = domain.EvidenceTier(v)
	}
	if v, ok := updates["delivery_mode"].(string); ok {
		i.DeliveryMode = domain.DeliveryMode(v)
	}
	if err := i.Validate(); err != nil {
		return nil, err
	}
	if err := s.catalog.Update(ctx, i); err != nil {
		return nil, err
	}
	return i, nil
}

// Activate activates a catalog entry.
func (s *CatalogService) Activate(ctx context.Context, id uuid.UUID) error {
	i, err := s.catalog.GetByID(ctx, id)
	if err != nil {
		return err
	}
	i.Active = true
	return s.catalog.Update(ctx, i)
}

// Deactivate deactivates a catalog entry.
func (s *CatalogService) Deactivate(ctx context.Context, id uuid.UUID) error {
	i, err := s.catalog.GetByID(ctx, id)
	if err != nil {
		return err
	}
	i.Active = false
	return s.catalog.Update(ctx, i)
}

// Search searches the catalog.
func (s *CatalogService) Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Intervention, error) {
	return s.catalog.Search(ctx, tenantID, q, limit)
}

// SeedDefaults seeds 20+ evidence-based interventions for a tenant.
func (s *CatalogService) SeedDefaults(ctx context.Context, tenantID uuid.UUID) error {
	defaults := defaultCatalog(tenantID)
	for _, d := range defaults {
		if err := s.catalog.Create(ctx, d); err != nil {
			// Skip if already exists
			if err == domain.ErrCodeTaken {
				continue
			}
			return fmt.Errorf("seed %s: %w", d.Code, err)
		}
	}
	s.log.Info().Int("count", len(defaults)).Msg("default catalog seeded")
	return nil
}

func defaultCatalog(tenantID uuid.UUID) []*domain.Intervention {
	tid := &tenantID
	return []*domain.Intervention{
		{TenantID: tid, Code: "coaching_1on1", TitleTR: "Bireysel Koçluk", DescriptionTR: "Profesyonel koç eşliğinde bireysel gelişim ve stres yönetimi seansları", Category: domain.CategoryCoaching, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryMode1on1, Active: true},
		{TenantID: tid, Code: "cbt_workshop", TitleTR: "BDT Atölyesi", DescriptionTR: "Bilişsel davranışçı terapi temelli stres yönetimi grup atölyesi", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "mindfulness_8wk", TitleTR: "Farkındalık Programı (8 Hafta)", DescriptionTR: "8 haftalık yapılandırılmış mindfulness tabanlı stres azaltma programı", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModeGroup, Active: true},
		{TenantID: tid, Code: "workload_audit", TitleTR: "İş Yükü Analizi", DescriptionTR: "Sistematik iş yükü değerlendirmesi ve görev yeniden dağılımı", Category: domain.CategoryWorkload, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModePolicyChange, Active: true},
		{TenantID: tid, Code: "flexible_work", TitleTR: "Esnek Çalışma Düzenlemeleri", DescriptionTR: "Hibrit/uzaktan çalışma ve esnek saat politikası uygulaması", Category: domain.CategoryFlexibility, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModePolicyChange, Active: true},
		{TenantID: tid, Code: "recognition_program", TitleTR: "Tanıma ve Takdir Programı", DescriptionTR: "Yapılandırılmış çalışan tanıma ve ödüllendirme sistemi", Category: domain.CategoryRecognition, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeTool, Active: true},
		{TenantID: tid, Code: "job_crafting", TitleTR: "İş Tasarımı Atölyesi", DescriptionTR: "Çalışanların görevlerini, ilişkilerini ve iş algılarını yeniden şekillendirmesi", Category: domain.CategoryRoleDesign, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "eap_referral", TitleTR: "EAP Yönlendirmesi", DescriptionTR: "Çalışan destek programı kapsamında profesyonel psikolojik destek", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryMode1on1, Active: true},
		{TenantID: tid, Code: "team_ritual", TitleTR: "Takım Ritüelleri", DescriptionTR: "Düzenli takım check-in, retrospektif ve sosyal etkinlikler", Category: domain.CategorySocialSupport, EvidenceTier: domain.EvidenceTierC, DeliveryMode: domain.DeliveryModeGroup, Active: true},
		{TenantID: tid, Code: "autonomy_training", TitleTR: "Özerklik Geliştirme Eğitimi", DescriptionTR: "Yöneticiler için mikro-yönetimden kaçınma ve yetkilendirme eğitimi", Category: domain.CategoryLeadership, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "career_dev", TitleTR: "Kariyer Gelişim Planlaması", DescriptionTR: "Bireysel kariyer yol haritası oluşturma ve mentorluk", Category: domain.CategorySkillDev, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryMode1on1, Active: true},
		{TenantID: tid, Code: "role_clarity", TitleTR: "Rol Netleştirme Çalıştayı", DescriptionTR: "Görev tanımları, sorumluluklar ve beklentilerin netleştirilmesi", Category: domain.CategoryRoleDesign, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "peer_support", TitleTR: "Akran Destek Grupları", DescriptionTR: "Yapılandırılmış akran destek ve paylaşım grupları", Category: domain.CategorySocialSupport, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeGroup, Active: true},
		{TenantID: tid, Code: "sleep_hygiene", TitleTR: "Uyku Hijyeni Programı", DescriptionTR: "Uyku kalitesini artırmaya yönelik psikoeğitim ve davranış değişikliği", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModeAsync, Active: true},
		{TenantID: tid, Code: "physical_activity", TitleTR: "Fiziksel Aktivite Programı", DescriptionTR: "İşyerinde egzersiz ve hareket programları", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierA, DeliveryMode: domain.DeliveryModeSelfService, Active: true},
		{TenantID: tid, Code: "boundary_setting", TitleTR: "Sınır Belirleme Eğitimi", DescriptionTR: "İş-yaşam dengesi için sağlıklı sınır koyma becerileri", Category: domain.CategoryFlexibility, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "gratitude_practice", TitleTR: "Şükran Pratiği", DescriptionTR: "Günlük şükran günlüğü ve pozitif psikoloji uygulamaları", Category: domain.CategoryWellbeing, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeSelfService, Active: true},
		{TenantID: tid, Code: "conflict_resolution", TitleTR: "Çatışma Çözümleme Eğitimi", DescriptionTR: "İşyerinde çatışma yönetimi ve iletişim becerileri", Category: domain.CategorySocialSupport, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "time_management", TitleTR: "Zaman Yönetimi Eğitimi", DescriptionTR: "Önceliklendirme, planlama ve verimlilik teknikleri", Category: domain.CategorySkillDev, EvidenceTier: domain.EvidenceTierC, DeliveryMode: domain.DeliveryModeWorkshop, Active: true},
		{TenantID: tid, Code: "ergonomic_review", TitleTR: "Ergonomik İşyeri Değerlendirmesi", DescriptionTR: "İşyeri ergonomi analizi ve iyileştirme önerileri", Category: domain.CategoryEnvironment, EvidenceTier: domain.EvidenceTierB, DeliveryMode: domain.DeliveryModePolicyChange, Active: true},
	}
}
