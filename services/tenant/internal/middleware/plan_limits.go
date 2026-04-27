package middleware

// plan_limits.go — Plan-based enforcement middleware (seat cap, modules, API rate).
//
// Bu middleware tenant servisine gelen her yazma isteğinden önce çağrılır
// (veya üst servisler — employee, assessment, vb. tarafından HTTP call
// ile tüketilir). 402 Payment Required döner ve upgrade URL'ini payload'a
// ekler. Frontend response'u yakalayıp toast + "Planı yükselt" CTA gösterir.
//
// Kullanım (tenant service cmd/main.go içinde):
//
//   limiter := middleware.NewPlanLimiter(usageSvc, log)
//   r.With(limiter.CheckEmployeeLimit).Post("/employees", empH.Create)
//
// Başka servisten HTTP üzerinden:
//
//   GET /api/v1/plan-limits/check?resource=employees
//   → 200 OK {"allowed": true, "used": 23, "limit": 50}
//   → 402 Payment Required {"error": "seat_cap_reached", ...}

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/tenant/internal/domain"
)

// UsageChecker abstracts UsageService to avoid import cycles and make
// the middleware testable.
type UsageChecker interface {
	CheckSeatCap(ctx context.Context, tenantID uuid.UUID) (bool, error)
	CurrentUsage(ctx context.Context, tenantID uuid.UUID) (map[string]int64, error)
}

// PlanResolver returns the tenant's active plan (modules + caps).
type PlanResolver interface {
	GetCurrentPlan(ctx context.Context, tenantID uuid.UUID) (*domain.Plan, error)
}

// PlanLimiter wires usage and plan lookups into HTTP middleware.
type PlanLimiter struct {
	usage UsageChecker
	plans PlanResolver
	log   zerolog.Logger

	// Simple in-memory token bucket for per-tenant API rate limiting.
	// Production'da Redis backed olmalı — bu default staging/dev için.
	rateMu      sync.Mutex
	rateBuckets map[uuid.UUID]*rateBucket
}

type rateBucket struct {
	tokens    float64
	lastRefil time.Time
}

// NewPlanLimiter constructs a PlanLimiter.
func NewPlanLimiter(usage UsageChecker, plans PlanResolver, log zerolog.Logger) *PlanLimiter {
	return &PlanLimiter{
		usage:       usage,
		plans:       plans,
		log:         log,
		rateBuckets: make(map[uuid.UUID]*rateBucket),
	}
}

// ErrPlanLimit is the canonical error for 402 responses.
var (
	ErrEmployeeLimitReached = errors.New("employee_limit_reached")
	ErrModuleNotInPlan      = errors.New("module_not_in_plan")
	ErrAPIRateLimitExceeded = errors.New("api_rate_limit_exceeded")
)

// limitResponse is the 402 payload shape. Frontend interceptor'u (bkz
// apps/web/src/lib/api-client.ts) bunu yakalar ve toast + upgrade CTA üretir.
type limitResponse struct {
	Error       string         `json:"error"`
	Code        string         `json:"code"`
	Message     string         `json:"message"`
	MessageTR   string         `json:"message_tr"`
	Resource    string         `json:"resource,omitempty"`
	Used        *int64         `json:"used,omitempty"`
	Limit       *int64         `json:"limit,omitempty"`
	UpgradeURL  string         `json:"upgrade_url"`
	RetryAfter  int            `json:"retry_after_seconds,omitempty"`
	RequiredPlan string        `json:"required_plan,omitempty"`
	ExtraMeta   map[string]any `json:"meta,omitempty"`
}

func write402(w http.ResponseWriter, payload limitResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if payload.UpgradeURL == "" {
		payload.UpgradeURL = "/panel/ayarlar/abonelik"
	}
	w.WriteHeader(http.StatusPaymentRequired)
	_ = json.NewEncoder(w).Encode(payload)
}

// CheckEmployeeLimit enforces plan.max_employees before POST /employees.
// Middleware çağıran router'da RequireAuth sonrası chain edilmelidir.
func (p *PlanLimiter) CheckEmployeeLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := TenantIDFromContext(r.Context())
		if tid == uuid.Nil {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		if err := p.EnforceEmployeeLimit(r.Context(), tid, w); err != nil {
			return // response already written
		}
		next.ServeHTTP(w, r)
	})
}

// EnforceEmployeeLimit returns non-nil after writing 402 body if over limit.
// Used both by HTTP middleware and by other services over gRPC/HTTP.
func (p *PlanLimiter) EnforceEmployeeLimit(ctx context.Context, tenantID uuid.UUID, w http.ResponseWriter) error {
	ok, err := p.usage.CheckSeatCap(ctx, tenantID)
	if err != nil {
		p.log.Error().Err(err).Str("tenant_id", tenantID.String()).Msg("plan limit check failed")
		if w != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		}
		return err
	}
	if ok {
		return nil
	}

	// Over limit — fetch current + cap for body.
	usage, _ := p.usage.CurrentUsage(ctx, tenantID)
	plan, _ := p.plans.GetCurrentPlan(ctx, tenantID)
	var used, limit int64
	if v, has := usage[string(domain.MetricEmployees)]; has {
		used = v
	}
	if plan != nil {
		limit = int64(plan.SeatCap())
	}

	if w != nil {
		write402(w, limitResponse{
			Error:       "payment_required",
			Code:        "employee_limit_reached",
			Message:     "Employee seat cap reached for current plan.",
			MessageTR:   "Mevcut planınızda çalışan sayısı limitine ulaştınız. Yeni çalışan eklemek için planınızı yükseltin.",
			Resource:    string(domain.MetricEmployees),
			Used:        &used,
			Limit:       &limit,
			RequiredPlan: nextTier(plan),
			UpgradeURL:  "/panel/ayarlar/abonelik?kaynak=employee_limit",
		})
	}
	return ErrEmployeeLimitReached
}

// CheckModuleAccess enforces that the tenant's plan includes the requested module.
// moduleID: "burnout", "mobility", "performance", "ats", "bordro", ...
func (p *PlanLimiter) CheckModuleAccess(moduleID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tid := TenantIDFromContext(r.Context())
			if tid == uuid.Nil {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			if err := p.EnforceModuleAccess(r.Context(), tid, moduleID, w); err != nil {
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// EnforceModuleAccess is the direct (non-HTTP) variant callable from other services.
func (p *PlanLimiter) EnforceModuleAccess(ctx context.Context, tenantID uuid.UUID, moduleID string, w http.ResponseWriter) error {
	plan, err := p.plans.GetCurrentPlan(ctx, tenantID)
	if err != nil {
		if w != nil {
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
		}
		return err
	}
	if plan.HasModule(moduleID) {
		return nil
	}
	if w != nil {
		write402(w, limitResponse{
			Error:       "payment_required",
			Code:        "module_not_in_plan",
			Message:     "Requested module is not included in the current plan.",
			MessageTR:   "Bu modül mevcut planınızda bulunmuyor. Erişim için planınızı yükseltin.",
			Resource:    moduleID,
			RequiredPlan: moduleRequiredTier(moduleID),
			UpgradeURL:  "/panel/ayarlar/abonelik?kaynak=module_" + moduleID,
		})
	}
	return ErrModuleNotInPlan
}

// CheckApiRateLimit enforces a per-tenant-per-minute API call budget.
// Default: plan'dan türetilir — starter=60, growth=600, platform=6000, enterprise=unlimited.
func (p *PlanLimiter) CheckApiRateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := TenantIDFromContext(r.Context())
		if tid == uuid.Nil {
			next.ServeHTTP(w, r)
			return
		}
		if err := p.EnforceApiRateLimit(r.Context(), tid, w); err != nil {
			return
		}
		next.ServeHTTP(w, r)
	})
}

// EnforceApiRateLimit returns non-nil after writing 402 body if over rate.
func (p *PlanLimiter) EnforceApiRateLimit(ctx context.Context, tenantID uuid.UUID, w http.ResponseWriter) error {
	plan, err := p.plans.GetCurrentPlan(ctx, tenantID)
	if err != nil {
		return nil // silent fail — rate limit'in asla auth'u bloklayamaması için
	}
	rpm := rateForPlan(plan)
	if rpm <= 0 {
		return nil // unlimited
	}

	p.rateMu.Lock()
	defer p.rateMu.Unlock()

	now := time.Now()
	bucket, has := p.rateBuckets[tenantID]
	if !has {
		bucket = &rateBucket{tokens: float64(rpm), lastRefil: now}
		p.rateBuckets[tenantID] = bucket
	}

	// Refill proportional to elapsed time.
	elapsed := now.Sub(bucket.lastRefil).Seconds()
	refill := elapsed * (float64(rpm) / 60.0)
	bucket.tokens += refill
	if bucket.tokens > float64(rpm) {
		bucket.tokens = float64(rpm)
	}
	bucket.lastRefil = now

	if bucket.tokens < 1.0 {
		// Over budget — compute retry-after
		deficit := 1.0 - bucket.tokens
		retry := int((deficit / (float64(rpm) / 60.0)) + 1)
		if w != nil {
			w.Header().Set("Retry-After", strings.TrimSpace(intToStr(retry)))
			write402(w, limitResponse{
				Error:      "payment_required",
				Code:       "api_rate_limit_exceeded",
				Message:    "API rate limit exceeded for current plan.",
				MessageTR:  "Mevcut planınızın saatlik/dakikalık API çağrı limitini aştınız.",
				Resource:   "api_calls",
				RetryAfter: retry,
				UpgradeURL: "/panel/ayarlar/abonelik?kaynak=api_rate",
				ExtraMeta:  map[string]any{"plan_rpm": rpm},
			})
		}
		return ErrAPIRateLimitExceeded
	}
	bucket.tokens -= 1.0
	return nil
}

// --- helpers ---------------------------------------------------------------

func nextTier(plan *domain.Plan) string {
	if plan == nil {
		return string(domain.PlanTierStarter)
	}
	switch plan.Tier {
	case domain.PlanTierFree:
		return string(domain.PlanTierStarter)
	case domain.PlanTierStarter:
		return string(domain.PlanTierGrowth)
	case domain.PlanTierGrowth:
		return string(domain.PlanTierPlatform)
	case domain.PlanTierPlatform:
		return string(domain.PlanTierEnterprise)
	default:
		return string(domain.PlanTierEnterprise)
	}
}

func moduleRequiredTier(moduleID string) string {
	switch moduleID {
	case "burnout", "koruma":
		return string(domain.PlanTierGrowth)
	case "mobility", "succession":
		return string(domain.PlanTierPlatform)
	case "ats":
		return string(domain.PlanTierGrowth)
	case "performance":
		return string(domain.PlanTierPlatform)
	case "bordro":
		return string(domain.PlanTierPlatform)
	default:
		return string(domain.PlanTierGrowth)
	}
}

func rateForPlan(plan *domain.Plan) int {
	if plan == nil {
		return 30 // safe fallback for unknown plan
	}
	switch plan.Tier {
	case domain.PlanTierFree:
		return 30
	case domain.PlanTierStarter:
		return 60
	case domain.PlanTierGrowth:
		return 600
	case domain.PlanTierPlatform:
		return 6000
	case domain.PlanTierEnterprise:
		return 0 // unlimited
	default:
		return 60
	}
}

// intToStr avoids strconv import churn in this file.
func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := make([]byte, 0, 10)
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	if neg {
		buf = append([]byte{'-'}, buf...)
	}
	return string(buf)
}
