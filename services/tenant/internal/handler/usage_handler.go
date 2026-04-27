package handler

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/upcore/tenant/internal/domain"
	"github.com/upcore/tenant/internal/middleware"
	"github.com/upcore/tenant/internal/repository"
	"github.com/upcore/tenant/internal/service"
)

// UsageHandler exposes usage-tracking endpoints.
type UsageHandler struct {
	svc   *service.UsageService
	subs  repository.SubscriptionRepository
	plans repository.PlanRepository
	dep   Dependencies
}

// NewUsageHandler constructs a UsageHandler.
func NewUsageHandler(svc *service.UsageService, dep Dependencies) *UsageHandler {
	return &UsageHandler{svc: svc, dep: dep}
}

// NewUsageHandlerWithPlans constructs a UsageHandler with plan lookup enabled —
// required for the detailed /usage endpoint that returns used/limit/percent.
func NewUsageHandlerWithPlans(
	svc *service.UsageService,
	subs repository.SubscriptionRepository,
	plans repository.PlanRepository,
	dep Dependencies,
) *UsageHandler {
	return &UsageHandler{svc: svc, subs: subs, plans: plans, dep: dep}
}

// GetCurrent handles GET /usage — returns simple metric → value map.
func (h *UsageHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	m, err := h.svc.CurrentUsage(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, m)
}

// UsageResourceView describes a single resource's used/limit/percent.
type UsageResourceView struct {
	Resource string  `json:"resource"`
	Used     int64   `json:"used"`
	Limit    int64   `json:"limit"` // 0 = unlimited
	Percent  float64 `json:"percent"`
	OverLimit bool   `json:"over_limit"`
}

// UsageReport is the response shape for GET /api/v1/usage (detailed).
type UsageReport struct {
	TenantID  uuid.UUID           `json:"tenant_id"`
	PlanID    string              `json:"plan_id"`
	PlanName  string              `json:"plan_name"`
	PlanTier  string              `json:"plan_tier"`
	Resources []UsageResourceView `json:"resources"`
}

// GetDetailed handles GET /api/v1/usage — returns per-resource used/limit/percent.
// Frontend panel widget'ı (Ayarlar → Abonelik) bunu tüketir.
func (h *UsageHandler) GetDetailed(w http.ResponseWriter, r *http.Request) {
	tid := middleware.TenantIDFromContext(r.Context())
	if tid == uuid.Nil {
		WriteJSON(w, http.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
		return
	}
	if h.subs == nil || h.plans == nil {
		// Fallback — kurucuda plan dependency yoksa eski payload
		h.GetCurrent(w, r)
		return
	}

	usage, err := h.svc.CurrentUsage(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	sub, err := h.subs.GetByTenantID(r.Context(), tid)
	if err != nil {
		WriteError(w, err)
		return
	}
	plan, err := h.plans.GetByID(r.Context(), sub.PlanID)
	if err != nil {
		WriteError(w, err)
		return
	}

	report := UsageReport{
		TenantID: tid,
		PlanID:   plan.ID,
		PlanName: plan.Name,
		PlanTier: string(plan.Tier),
		Resources: []UsageResourceView{
			buildResourceView(domain.MetricEmployees, usage, int64(plan.SeatCap())),
			buildResourceView(domain.MetricAssessments, usage, 0),
			buildResourceView(domain.MetricStorageMB, usage, 0),
			buildResourceView(domain.MetricAPICalls, usage, 0),
		},
	}
	WriteJSON(w, http.StatusOK, report)
}

func buildResourceView(metric domain.Metric, usage map[string]int64, limit int64) UsageResourceView {
	used := usage[string(metric)]
	v := UsageResourceView{
		Resource: string(metric),
		Used:     used,
		Limit:    limit,
	}
	if limit > 0 {
		v.Percent = (float64(used) / float64(limit)) * 100.0
		if v.Percent > 100 {
			v.Percent = 100
		}
		v.OverLimit = used >= limit
	} else {
		v.Percent = 0
		v.OverLimit = false
	}
	return v
}
