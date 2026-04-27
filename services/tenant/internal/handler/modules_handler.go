package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/service"
)

// ModulesHandler returns the tenant's active/available module list,
// combining subscription plan features with UpCore's product catalog.
type ModulesHandler struct {
	sub *service.SubscriptionService
}

// NewModulesHandler constructs ModulesHandler.
func NewModulesHandler(sub *service.SubscriptionService) *ModulesHandler {
	return &ModulesHandler{sub: sub}
}

// ProductModule describes a single UpCore product module (customer-facing catalog).
type ProductModule struct {
	ID              string   `json:"id"`
	NameTR          string   `json:"name_tr"`
	DescTR          string   `json:"description_tr"`
	Category        string   `json:"category"` // kazanim|surdurme|gelistirme|yerlestirme|koruma
	Active          bool     `json:"active"`
	PriceMonthly    *int64   `json:"price_monthly_try,omitempty"`
	Features        []string `json:"features_tr"`
}

// catalog is the canonical UpCore module catalog, Asena's 5-pillar framework.
var catalog = []ProductModule{
	{
		ID:       "kazanim",
		NameTR:   "Kazanım",
		DescTR:   "İşe alım, ATS, psikometrik değerlendirme ve JD-R fit skoru.",
		Category: "kazanim",
		Features: []string{"ATS pipeline", "BAT-12-TR + IPIP-50-TR", "Kariyer.net + LinkedIn feed", "JD-R fit skoru"},
	},
	{
		ID:       "surdurme",
		NameTR:   "Sürdürme",
		DescTR:   "Tükenmişlik (BAT-TR) + bağlılık (UWES-9) + JD-R dashboard.",
		Category: "surdurme",
		Features: []string{"BAT-12-TR pulse", "COPSOQ-III-TR", "JD-R heatmap", "30 günlük trend"},
	},
	{
		ID:       "gelistirme",
		NameTR:   "Geliştirme",
		DescTR:   "Güçlü yönler (VIA), Job Crafting ve PsyCap gelişimi.",
		Category: "gelistirme",
		Features: []string{"VIA 24 karakter gücü", "JCS (Job Crafting Scale)", "UpCap-TR PsyCap"},
	},
	{
		ID:       "yerlestirme",
		NameTR:   "Yerleştirme",
		DescTR:   "İç mobilite, kariyer yolları ve yedekleme planlaması.",
		Category: "yerlestirme",
		Features: []string{"İç rotasyon akışı", "Kariyer yolu şablonları", "Succession havuzu"},
	},
	{
		ID:       "koruma",
		NameTR:   "Koruma",
		DescTR:   "Evidence-based müdahale kataloğu + outcome takibi.",
		Category: "koruma",
		Features: []string{"20+ kanıta dayalı müdahale", "Outcome tracking", "Müdahale ROI"},
	},
}

// ModulesResponse is the shape returned by GET /tenants/me/modules.
type ModulesResponse struct {
	PlanID      string          `json:"plan_id"`
	PlanTier    string          `json:"plan_tier"`
	Modules     []ProductModule `json:"modules"`
	ActiveCount int             `json:"active_count"`
}

// GetForCurrent handles GET /tenants/me/modules.
func (h *ModulesHandler) GetForCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}

	view, err := h.sub.GetCurrent(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}

	activeSet := make(map[string]struct{}, len(view.Plan.Features.Modules))
	for _, m := range view.Plan.Features.Modules {
		activeSet[m] = struct{}{}
	}

	mods := make([]ProductModule, 0, len(catalog))
	activeCount := 0
	for _, m := range catalog {
		copy := m
		if _, ok := activeSet[m.ID]; ok {
			copy.Active = true
			activeCount++
		}
		mods = append(mods, copy)
	}

	WriteJSON(w, http.StatusOK, ModulesResponse{
		PlanID:      view.Plan.ID,
		PlanTier:    string(view.Plan.Tier),
		Modules:     mods,
		ActiveCount: activeCount,
	})
}
