// Package service bundles bordro business logic.
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/jmoiron/sqlx"

	"github.com/upcore/bordro"
	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/event"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
)

// PayrollService orchestrates the full period → run → slip flow.
type PayrollService struct {
	periods    repository.PeriodRepository
	runs       repository.RunRepository
	slips      repository.SlipRepository
	empComp    repository.EmployeeCompRepository
	settings   repository.SettingsRepository
	deductions repository.DeductionRepository
	publisher  event.Publisher
	outbox     *event.OutboxWriter // optional — when set, emit() writes to outbox
	db         *sqlx.DB            // used by emit() for outbox tx
	log        zerolog.Logger
}

// NewPayrollService constructs the service. outbox + db may be nil; when nil,
// emit() falls back to direct Publisher.Publish (broker-unsafe but simpler).
// deductions may also be nil — if so, calculate skips the ek kesinti step.
func NewPayrollService(
	periods repository.PeriodRepository,
	runs repository.RunRepository,
	slips repository.SlipRepository,
	empComp repository.EmployeeCompRepository,
	settings repository.SettingsRepository,
	deductions repository.DeductionRepository,
	publisher event.Publisher,
	outbox *event.OutboxWriter,
	db *sqlx.DB,
	log zerolog.Logger,
) *PayrollService {
	return &PayrollService{
		periods: periods, runs: runs, slips: slips,
		empComp: empComp, settings: settings, deductions: deductions,
		publisher: publisher, outbox: outbox, db: db, log: log,
	}
}

// emit durably stores the event. Two modes:
//  1. Outbox mode (outbox+db wired): writes to app.event_outbox in a short tx.
//     Background OutboxDispatcher will ship to broker. Broker downtime OK.
//  2. Direct mode (fallback): Publisher.Publish immediately. Broker must be up.
//
// tenantID must be provided in both modes. aggregateID optional.
func (s *PayrollService) emit(
	ctx context.Context,
	tenantID uuid.UUID,
	aggregateID *uuid.UUID,
	topic string,
	payload any,
) {
	if tenantID == uuid.Nil {
		return
	}
	if s.outbox != nil && s.db != nil {
		tx, err := s.db.BeginTxx(ctx, nil)
		if err != nil {
			s.log.Warn().Err(err).Str("topic", topic).Msg("outbox: begin tx failed")
			return
		}
		defer func() { _ = tx.Rollback() }()
		if _, err := tx.ExecContext(ctx,
			"SELECT set_config('app.tenant_id', $1, true)",
			tenantID.String()); err != nil {
			s.log.Warn().Err(err).Str("topic", topic).Msg("outbox: set rls failed")
			return
		}
		if err := s.outbox.Append(ctx, tx, tenantID, topic, aggregateID, payload); err != nil {
			s.log.Warn().Err(err).Str("topic", topic).Msg("outbox: append failed")
			return
		}
		if err := tx.Commit(); err != nil {
			s.log.Warn().Err(err).Str("topic", topic).Msg("outbox: commit failed")
		}
		return
	}
	// Direct mode fallback.
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish failed")
	}
}

// ============================================================================
// Period operations
// ============================================================================

// PeriodRequest is the Create/Update body.
type PeriodRequest struct {
	PeriodYear  int    `json:"period_year"`
	PeriodMonth int    `json:"period_month"`
	PayDate     string `json:"pay_date,omitempty"`
	Status      string `json:"status,omitempty"`
}

// CreatePeriod opens a new monthly period.
func (s *PayrollService) CreatePeriod(ctx context.Context, tenantID, actorID uuid.UUID, req PeriodRequest) (*domain.Period, error) {
	p := &domain.Period{
		TenantID:    tenantID,
		PeriodYear:  req.PeriodYear,
		PeriodMonth: req.PeriodMonth,
	}
	if t, err := parseDate(req.PayDate); err == nil {
		p.PayDate = t
	}
	if actorID != uuid.Nil {
		p.CreatedBy = &actorID
	}
	p.ApplyDefaults()
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if err := s.periods.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// GetPeriod returns a period by ID.
func (s *PayrollService) GetPeriod(ctx context.Context, tenantID, id uuid.UUID) (*domain.Period, error) {
	return s.periods.GetByID(ctx, tenantID, id)
}

// ListPeriods returns periods filtered by year.
func (s *PayrollService) ListPeriods(ctx context.Context, tenantID uuid.UUID, year, page, limit int) ([]*domain.Period, int, error) {
	if limit <= 0 {
		limit = 24
	}
	if page < 0 {
		page = 0
	}
	return s.periods.List(ctx, tenantID, year, limit, page*limit)
}

// LockPeriod moves a period to `locked` status (no new runs).
func (s *PayrollService) LockPeriod(ctx context.Context, tenantID, id uuid.UUID) (*domain.Period, error) {
	p, err := s.periods.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if p.Status == domain.PeriodFinalised || p.Status == domain.PeriodClosed {
		return nil, domain.ErrPeriodLocked
	}
	p.Status = domain.PeriodLocked
	if err := s.periods.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// ClosePeriod moves a period to `closed` status — retrospective.
func (s *PayrollService) ClosePeriod(ctx context.Context, tenantID, id uuid.UUID) (*domain.Period, error) {
	p, err := s.periods.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	p.Status = domain.PeriodClosed
	if err := s.periods.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// ============================================================================
// Run operations
// ============================================================================

// RunRequest is the Create body.
type RunRequest struct {
	PeriodID uuid.UUID `json:"period_id"`
	RunType  string    `json:"run_type,omitempty"`
	Notes    string    `json:"notes,omitempty"`
}

// CreateRun opens a preview run on top of a period.
func (s *PayrollService) CreateRun(ctx context.Context, tenantID uuid.UUID, req RunRequest) (*domain.Run, error) {
	period, err := s.periods.GetByID(ctx, tenantID, req.PeriodID)
	if err != nil {
		return nil, err
	}
	if !period.Status.IsEditable() {
		return nil, domain.ErrPeriodLocked
	}
	run := &domain.Run{
		TenantID: tenantID,
		PeriodID: req.PeriodID,
		RunType:  domain.RunType(strings.TrimSpace(req.RunType)),
		Status:   domain.RunPreview,
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		run.Notes = &v
	}
	run.ApplyDefaults()
	if err := run.Validate(); err != nil {
		return nil, err
	}
	if err := s.runs.Create(ctx, run); err != nil {
		return nil, err
	}
	return run, nil
}

// GetRun returns a run.
func (s *PayrollService) GetRun(ctx context.Context, tenantID, id uuid.UUID) (*domain.Run, error) {
	return s.runs.GetByID(ctx, tenantID, id)
}

// ListRuns returns runs for a period.
func (s *PayrollService) ListRuns(ctx context.Context, tenantID, periodID uuid.UUID) ([]*domain.Run, error) {
	return s.runs.List(ctx, tenantID, periodID)
}

// CalculateRun iterates over all inputs, computes slips, persists them
// and updates the run totals. Returns the updated run.
func (s *PayrollService) CalculateRun(ctx context.Context, tenantID, runID uuid.UUID, inputs []domain.SlipInput) (*domain.Run, []*domain.Slip, error) {
	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, nil, err
	}
	if run.Status != domain.RunPreview && run.Status != domain.RunCalculated {
		return nil, nil, domain.ErrInvalidStatus
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, nil, err
	}
	if !period.Status.IsEditable() {
		return nil, nil, domain.ErrPeriodLocked
	}

	// Tenant settings (if service is wired). Defaults otherwise.
	settings := (*domain.BordroSettings)(nil)
	if s.settings != nil {
		settings, _ = s.settings.GetOrDefault(ctx, tenantID)
	}

	var totalGross, totalNet, totalIncomeTax, totalSGKEmp, totalSGKEmpr, totalStamp float64
	slips := make([]*domain.Slip, 0, len(inputs))

	for _, in := range inputs {
		if err := in.Validate(); err != nil {
			return nil, nil, err
		}
		cumulative := in.CumulativeTaxBase
		if cumulative == 0 {
			cumulative, _ = s.slips.CumulativeTaxBase(ctx, tenantID, in.EmployeeID, period.PeriodYear, period.PeriodMonth)
		}
		worked := in.WorkedDays
		if worked == 0 {
			worked = 30
		}

		// Yemek + yol hesabı (tenant cap'leri ile).
		allowanceTaxable := in.AllowanceTaxable
		allowanceExempt := in.AllowanceExempt
		var allowance bordro.AllowanceBreakdown
		if settings != nil {
			mealDaily := settings.MealDailyGross
			if in.MealDailyGrossOverride != nil {
				mealDaily = *in.MealDailyGrossOverride
			}
			transportDaily := settings.TransportDailyGross
			if in.TransportDailyGrossOverride != nil {
				transportDaily = *in.TransportDailyGrossOverride
			}
			if mealDaily > 0 || transportDaily > 0 {
				// İş günü ~22, ama tenant override için worked_days'i kullanırız:
				// normalde worked_days = 30 takvim günü, bu nedenle 22/30 oranıyla
				// dönüştürüp hem adil hem basit yol seçiyoruz.
				workingDays := worked * (22.0 / 30.0)
				allowance = bordro.ComputeAllowances(bordro.AllowanceConfig{
					WorkingDays:             workingDays,
					MealDailyGross:          mealDaily,
					MealExemptDailyCap:      settings.MealExemptDaily,
					TransportDailyGross:     transportDaily,
					TransportExemptDailyCap: settings.TransportExemptDaily,
				})
				allowanceTaxable += allowance.TotalTaxable
				allowanceExempt += allowance.TotalExempt
			}
		}

		applyMinWage := true
		if settings != nil {
			applyMinWage = settings.ApplyMinWageExemption
		}

		calcIn := bordro.Slip{
			GrossBase:             in.BaseSalaryGross,
			OvertimeGross:         in.OvertimeGross,
			BonusGross:            in.BonusGross,
			AllowanceTaxable:      allowanceTaxable,
			AllowanceExempt:       allowanceExempt,
			CumulativeTaxBase:     cumulative,
			WorkedDays:            worked,
			Year:                  period.PeriodYear,
			// GVK Geçici 86 + DVK istisnası: Türkiye'de yasal zorunluluk.
			// Tenant false yaparsa override edilir (test/dev amaçlı).
			ApplyMinWageExemption: applyMinWage,
		}
		r := bordro.Calculate(calcIn)

		// ─── Ek kesintiler (avans/icra/nafaka/sendika) ───
		netAfterDeductions := r.NetPay
		var deductionLines []bordro.DeductionLine
		var deductionTotalApplied float64
		if s.deductions != nil {
			periodStr := fmt.Sprintf("%04d-%02d", period.PeriodYear, period.PeriodMonth)
			ds, _ := s.deductions.ListActiveForPeriod(ctx, tenantID, in.EmployeeID, periodStr)
			inputs := make([]bordro.DeductionInput, 0, len(ds))
			for _, d := range ds {
				remaining := 0.0
				if d.TotalCap != nil {
					remaining = *d.TotalCap - d.Consumed
				}
				inputs = append(inputs, bordro.DeductionInput{
					ID:           d.ID.String(),
					Kind:         bordro.DeductionKind(d.DeductionType),
					Label:        d.Label,
					MonthlyLimit: d.MonthlyAmount,
					Remaining:    remaining,
					Priority:     d.Priority,
				})
			}
			deductionTotalApplied, deductionLines, netAfterDeductions = bordro.ApplyDeductions(r.NetPay, inputs)
			// İşveren SGK teşvikleri (5510/6111/6645 vs.). Tenant-level tanım
			// yoksa default [] → değişiklik yok. Gerçek uygulamada tesvikler
			// employee_sgk_tesvikler tablosundan çekilir; şimdilik settings
			// bazlı tenant default.
			if tesvikler := defaultTesviklerForTenant(settings); len(tesvikler) > 0 {
				actual, _ := bordro.ApplyTesvik(r.SGKEmployer, tesvikler)
				r.SGKEmployer = actual
			}
			// Persist consumed updates for successful deductions.
			for _, line := range deductionLines {
				if line.AmountApplied <= 0 || line.ID == "" {
					continue
				}
				if dID, perr := uuid.Parse(line.ID); perr == nil {
					_ = s.deductions.IncrementConsumed(ctx, tenantID, dID, line.AmountApplied)
				}
			}
		}

		slip := &domain.Slip{
			TenantID:             tenantID,
			RunID:                run.ID,
			EmployeeID:           in.EmployeeID,
			PeriodYear:           period.PeriodYear,
			PeriodMonth:          period.PeriodMonth,
			WorkedDays:           worked,
			BaseSalaryGross:      in.BaseSalaryGross,
			OvertimeGross:        in.OvertimeGross,
			BonusGross:           in.BonusGross,
			AllowanceGross:       in.AllowanceTaxable + in.AllowanceExempt,
			TotalGross:           r.GrossTotal,
			SGKEmployee:          r.SGKEmployee,
			SGKUnemploymentEmp:   r.UnemploymentEmp,
			IncomeTaxBase:        r.IncomeTaxBase,
			IncomeTax:            r.IncomeTax,
			CumulativeTaxBase:    r.CumulativeTaxBaseAfter,
			StampTax:             r.StampTax,
			SGKEmployer:          r.SGKEmployer,
			UnemploymentEmployer: r.UnemploymentEmpr,
			TotalNet:             netAfterDeductions,
		}
		items := buildSlipItems(slip, &r, in)
		// Audit: ek kesinti satırlarını slip'e bilgi olarak ekle.
		for _, line := range deductionLines {
			if line.AmountApplied > 0 {
				items = append(items, domain.SlipItem{
					ItemType:    domain.ItemDeduction,
					Code:        "ek_kesinti_" + string(line.Kind),
					Description: line.Label,
					Quantity:    1,
					Amount:      line.AmountApplied,
					OrderIndex:  len(items),
				})
			} else if line.ReasonSkipped != "" {
				items = append(items, domain.SlipItem{
					ItemType:    domain.ItemInfo,
					Code:        "ek_kesinti_atlandi_" + string(line.Kind),
					Description: line.Label + " — atlandı: " + line.ReasonSkipped,
					Quantity:    1,
					Amount:      0,
					OrderIndex:  len(items),
				})
			}
		}
		_ = deductionTotalApplied
		if err := s.slips.UpsertWithItems(ctx, slip, items); err != nil {
			return nil, nil, err
		}
		middleware.PayrollSlipsGenerated.WithLabelValues("manual").Inc()
		slips = append(slips, slip)

		totalGross += r.GrossTotal
		totalNet += netAfterDeductions
		totalIncomeTax += r.IncomeTax
		totalSGKEmp += r.SGKEmployee + r.UnemploymentEmp
		totalSGKEmpr += r.SGKEmployer + r.UnemploymentEmpr
		totalStamp += r.StampTax
	}

	if err := s.runs.UpdateTotals(ctx, tenantID, run.ID,
		totalGross, totalNet, totalIncomeTax, totalSGKEmp, totalSGKEmpr, totalStamp, len(inputs)); err != nil {
		return nil, nil, err
	}
	if err := s.runs.UpdateStatus(ctx, tenantID, run.ID, domain.RunCalculated, nil); err != nil {
		return nil, nil, err
	}
	middleware.PayrollRunsTotal.WithLabelValues(string(domain.RunCalculated), string(run.RunType)).Inc()
	run.Status = domain.RunCalculated
	runIDCopy := run.ID
	s.emit(ctx, tenantID, &runIDCopy, event.TopicPayrollRunCalculated, map[string]any{
		"run_id":         run.ID,
		"period_id":      run.PeriodID,
		"tenant_id":      tenantID,
		"employee_count": len(inputs),
		"total_gross":    totalGross,
		"total_net":      totalNet,
	})
	run.TotalGross = totalGross
	run.TotalNet = totalNet
	run.TotalIncomeTax = totalIncomeTax
	run.TotalSGKEmp = totalSGKEmp
	run.TotalSGKEmpr = totalSGKEmpr
	run.TotalStamp = totalStamp
	run.EmployeeCount = len(inputs)
	return run, slips, nil
}

// CalculateAllActive fetches all active employees with a base-salary
// compensation record effective on or before the period end and computes
// a slip for each. Returns the updated run + generated slips.
//
// Enterprise flow — no manual UUID entry required. HR opens a period,
// creates a run, hits "Tüm aktif çalışanları hesapla" and gets N slips.
func (s *PayrollService) CalculateAllActive(ctx context.Context, tenantID, runID uuid.UUID) (*domain.Run, []*domain.Slip, error) {
	if s.empComp == nil {
		return nil, nil, errors.New("bulk calculate enabled değil (empComp nil)")
	}
	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, nil, err
	}
	if run.Status != domain.RunPreview && run.Status != domain.RunCalculated {
		return nil, nil, domain.ErrInvalidStatus
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, nil, err
	}
	if !period.Status.IsEditable() {
		return nil, nil, domain.ErrPeriodLocked
	}

	periodEnd := time.Date(period.PeriodYear, time.Month(period.PeriodMonth)+1, 0, 23, 59, 59, 0, time.UTC)
	rows, err := s.empComp.ListActiveWithBaseSalary(ctx, tenantID, periodEnd)
	if err != nil {
		return nil, nil, err
	}
	if len(rows) == 0 {
		return nil, nil, errors.New("dönem sonu itibarıyla base_salary'si olan aktif çalışan yok")
	}

	inputs := make([]domain.SlipInput, 0, len(rows))
	for _, row := range rows {
		inputs = append(inputs, domain.SlipInput{
			EmployeeID:      row.EmployeeID,
			BaseSalaryGross: row.BaseSalaryGross,
			WorkedDays:      30,
		})
	}
	return s.CalculateRun(ctx, tenantID, runID, inputs)
}

// CalculateKamuRun computes 657 kamu (memur) maaşlarını tüm aktif kadrolu
// personel için. Özel sektör (4857) çalışanları atlanır. Gösterge + ek
// gösterge + taban + kıdem aylığı + tazminatlar + aile/çocuk yardımları
// hesaplanır; gelir vergisi + damga + emekli keseneği düşülür.
//
// Belediye/kamu kurumu tenant'ı için enterprise akış: HR Period aç → Run
// oluştur → "Kamu memur maaşı hesapla" tek tık → N slip + ayrıntılı kırılım.
func (s *PayrollService) CalculateKamuRun(ctx context.Context, tenantID, runID uuid.UUID) (*domain.Run, []*domain.Slip, error) {
	if s.empComp == nil {
		return nil, nil, errors.New("kamu calculate enabled değil (empComp nil)")
	}
	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, nil, err
	}
	if run.Status != domain.RunPreview && run.Status != domain.RunCalculated {
		return nil, nil, domain.ErrInvalidStatus
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, nil, err
	}
	if !period.Status.IsEditable() {
		return nil, nil, domain.ErrPeriodLocked
	}

	periodEnd := time.Date(period.PeriodYear, time.Month(period.PeriodMonth)+1, 0, 23, 59, 59, 0, time.UTC)
	rows, err := s.empComp.ListActiveKamu(ctx, tenantID, periodEnd)
	if err != nil {
		return nil, nil, err
	}
	if len(rows) == 0 {
		return nil, nil, errors.New("aktif kamu personeli (657/4B/4C) bulunamadı")
	}

	coefs := bordro.DefaultKamuCoefs2026H1()
	if period.PeriodYear == 2026 && period.PeriodMonth >= 7 {
		coefs.HalfPeriod = 2
	}
	rates := bordro.DefaultSGKRates()

	var totalGross, totalNet, totalIncomeTax, totalStamp, totalEmekli, totalEmekliIsv float64
	slips := make([]*domain.Slip, 0, len(rows))

	for _, row := range rows {
		gosterge := row.Gosterge
		if gosterge == 0 && row.KadroDerece > 0 && row.KadroKademe > 0 {
			gosterge = bordro.GostergeFor(row.KadroDerece, row.KadroKademe)
		}
		ekGosterge := row.EkGosterge
		if ekGosterge == 0 && row.HizmetSinifi != "" && row.KadroDerece > 0 {
			ekGosterge = bordro.EkGostergeFor(row.HizmetSinifi, row.KadroDerece)
		}

		cumulative, _ := s.slips.CumulativeTaxBase(ctx, tenantID, row.EmployeeID, period.PeriodYear, period.PeriodMonth)

		kamuIn := bordro.KamuSalaryInput{
			Gosterge:             gosterge,
			EkGosterge:           ekGosterge,
			KidemYili:            row.KidemYili,
			YanOdemePuani:        row.HizmetPuani,
			EsYardimi:            row.MedeniHal == "evli" && !row.EsCalisiyorMu,
			Cocuk06:              row.Cocuk06,
			Cocuk6Plus:           row.Cocuk6Plus,
			EngelliIndirimiAylik: row.EngelliIndirimiAylik,
			CumulativeGross:      cumulative,
		}
		k := bordro.CalculateKamu(kamuIn, coefs, rates, period.PeriodYear)

		slip := &domain.Slip{
			TenantID:           tenantID,
			RunID:              run.ID,
			EmployeeID:         row.EmployeeID,
			PeriodYear:         period.PeriodYear,
			PeriodMonth:        period.PeriodMonth,
			WorkedDays:         30,
			BaseSalaryGross:    k.AylikGostergeAyligi + k.AylikEkGosterge + k.AylikTabanAyligi + k.AylikKidemAyligi,
			AllowanceGross:     k.AileYardimi + k.CocukYardimi + k.MakamTazminati + k.TemsilTazminati + k.GorevTazminati,
			TotalGross:         k.BrutToplam,
			IncomeTaxBase:      k.GelirVergisiMatrahi,
			IncomeTax:          k.GelirVergisiNet,
			CumulativeTaxBase:  cumulative + k.GelirVergisiMatrahi,
			StampTax:           k.DamgaVergisiNet,
			TotalNet:           k.NetMaas,
		}
		items := buildKamuSlipItems(slip, &k)
		if err := s.slips.UpsertWithItems(ctx, slip, items); err != nil {
			return nil, nil, err
		}
		middleware.PayrollSlipsGenerated.WithLabelValues("kamu").Inc()
		slips = append(slips, slip)

		totalGross += k.BrutToplam
		totalNet += k.NetMaas
		totalIncomeTax += k.GelirVergisiNet
		totalStamp += k.DamgaVergisiNet
		totalEmekli += k.EmekliKesenegi
		totalEmekliIsv += k.EmekliKesenegiIsveren
	}

	if err := s.runs.UpdateTotals(ctx, tenantID, run.ID,
		totalGross, totalNet, totalIncomeTax, totalEmekli, totalEmekliIsv, totalStamp, len(rows)); err != nil {
		return nil, nil, err
	}
	if err := s.runs.UpdateStatus(ctx, tenantID, run.ID, domain.RunCalculated, nil); err != nil {
		return nil, nil, err
	}
	middleware.PayrollRunsTotal.WithLabelValues(string(domain.RunCalculated), "kamu").Inc()
	run.Status = domain.RunCalculated
	runIDCopy := run.ID
	s.emit(ctx, tenantID, &runIDCopy, event.TopicPayrollRunCalculated, map[string]any{
		"run_id":         run.ID,
		"period_id":      run.PeriodID,
		"tenant_id":      tenantID,
		"employee_count": len(rows),
		"total_gross":    totalGross,
		"total_net":      totalNet,
		"flavor":         "kamu_657",
	})
	run.TotalGross = totalGross
	run.TotalNet = totalNet
	run.TotalIncomeTax = totalIncomeTax
	run.TotalSGKEmp = totalEmekli
	run.TotalSGKEmpr = totalEmekliIsv
	run.TotalStamp = totalStamp
	run.EmployeeCount = len(rows)
	return run, slips, nil
}

func buildKamuSlipItems(slip *domain.Slip, k *bordro.KamuSalaryResult) []domain.SlipItem {
	out := []domain.SlipItem{}
	add := func(t domain.SlipItemType, code, desc string, amount float64, taxable bool) {
		if amount == 0 {
			return
		}
		out = append(out, domain.SlipItem{
			ItemType: t, Code: code, Description: desc,
			Quantity: 1, Amount: amount, IsTaxable: taxable, IsSGKable: false,
			OrderIndex: len(out),
		})
	}
	add(domain.ItemEarning, "gosterge_ayligi", "Gösterge aylığı", k.AylikGostergeAyligi, true)
	add(domain.ItemEarning, "ek_gosterge", "Ek gösterge aylığı", k.AylikEkGosterge, true)
	add(domain.ItemEarning, "taban_ayligi", "Taban aylığı", k.AylikTabanAyligi, true)
	add(domain.ItemEarning, "kidem_ayligi", "Kıdem aylığı", k.AylikKidemAyligi, true)
	add(domain.ItemEarning, "yan_odeme", "Yan ödeme", k.YanOdeme, true)
	add(domain.ItemEarning, "ozel_hizmet_tazminati", "Özel hizmet tazminatı", k.OzelHizmetTazminati, true)
	add(domain.ItemEarning, "makam_tazminati", "Makam tazminatı (vergi istisnalı)", k.MakamTazminati, false)
	add(domain.ItemEarning, "temsil_tazminati", "Temsil tazminatı (vergi istisnalı)", k.TemsilTazminati, false)
	add(domain.ItemEarning, "gorev_tazminati", "Görev tazminatı (vergi istisnalı)", k.GorevTazminati, false)
	add(domain.ItemEarning, "aile_yardimi", "Aile yardımı (vergi + damga istisnalı)", k.AileYardimi, false)
	add(domain.ItemEarning, "cocuk_yardimi", "Çocuk yardımı (vergi + damga istisnalı)", k.CocukYardimi, false)

	add(domain.ItemDeduction, "emekli_kesenegi_16", "Emekli keseneği memur payı %16", k.EmekliKesenegi, false)
	if k.GelirVergisiIstisna > 0 {
		add(domain.ItemInfo, "gelir_vergisi_brut", "Gelir vergisi (istisnasız)", k.GelirVergisiBrut, false)
		add(domain.ItemInfo, "asgari_ucret_istisnasi", "Asgari ücret gelir vergisi istisnası (GVK Gç.86)", k.GelirVergisiIstisna, false)
	}
	add(domain.ItemDeduction, "gelir_vergisi", "Gelir vergisi (ödenecek)", k.GelirVergisiNet, false)
	add(domain.ItemDeduction, "damga_vergisi", "Damga vergisi (ödenecek)", k.DamgaVergisiNet, false)

	add(domain.ItemEmployerContribution, "emekli_kesenegi_isv", "Emekli keseneği kurum payı %20", k.EmekliKesenegiIsveren, false)
	add(domain.ItemInfo, "vergi_istisnali_tutar", "Vergi istisnalı kazançlar toplamı", k.VergiIstisnaliTutar, false)

	_ = slip
	return out
}

// OvertimeEntryRequest mirrors bordro.OvertimeEntry for HTTP input.
type OvertimeEntryRequest struct {
	Kind  string  `json:"kind"`
	Hours float64 `json:"hours"`
}

// ApplyOvertime computes and records overtime for a single employee in a
// calculated (or preview) run. Recomputes the slip totals using current base
// salary + the overtime gross addition. Returns the updated slip.
func (s *PayrollService) ApplyOvertime(
	ctx context.Context,
	tenantID, runID, employeeID uuid.UUID,
	entries []OvertimeEntryRequest,
	cumulativeWeekdayYTD float64,
) (*domain.Slip, error) {
	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, err
	}
	if run.Status != domain.RunPreview && run.Status != domain.RunCalculated {
		return nil, domain.ErrInvalidStatus
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, err
	}
	if !period.Status.IsEditable() {
		return nil, domain.ErrPeriodLocked
	}

	// Existing slip is required (run must have been calculated once).
	runSlips, err := s.slips.ListByRun(ctx, tenantID, run.ID)
	if err != nil {
		return nil, err
	}
	var slip *domain.Slip
	for _, sl := range runSlips {
		if sl.EmployeeID == employeeID {
			slip = sl
			break
		}
	}
	if slip == nil {
		return nil, errors.New("çalışana ait slip bulunamadı — önce bordroyu hesaplayın")
	}

	otEntries := make([]bordro.OvertimeEntry, 0, len(entries))
	for _, e := range entries {
		k := bordro.OvertimeKind(strings.TrimSpace(e.Kind))
		if !k.IsValid() || e.Hours <= 0 {
			continue
		}
		otEntries = append(otEntries, bordro.OvertimeEntry{Hours: e.Hours, Kind: k})
	}

	hoursPerMonth := 225.0
	if s.settings != nil {
		if set, _ := s.settings.GetOrDefault(ctx, tenantID); set != nil && set.HoursPerMonth > 0 {
			hoursPerMonth = set.HoursPerMonth
		}
	}
	ot, err := bordro.ComputeOvertime(slip.BaseSalaryGross, hoursPerMonth, cumulativeWeekdayYTD, otEntries)
	if err != nil && !errors.Is(err, bordro.ErrAnnualLimitExceeded) {
		return nil, err
	}
	annualLimitHit := errors.Is(err, bordro.ErrAnnualLimitExceeded)

	// Recalculate slip with overtime added.
	cumulative, _ := s.slips.CumulativeTaxBase(ctx, tenantID, employeeID, period.PeriodYear, period.PeriodMonth)

	applyMinWage := true
	if s.settings != nil {
		if set, _ := s.settings.GetOrDefault(ctx, tenantID); set != nil {
			applyMinWage = set.ApplyMinWageExemption
		}
	}
	calcIn := bordro.Slip{
		GrossBase:             slip.BaseSalaryGross,
		OvertimeGross:         ot.TotalGrossAddition,
		BonusGross:            slip.BonusGross,
		AllowanceTaxable:      slip.AllowanceGross,
		CumulativeTaxBase:     cumulative,
		WorkedDays:            slip.WorkedDays,
		Year:                  period.PeriodYear,
		ApplyMinWageExemption: applyMinWage,
	}
	r := bordro.Calculate(calcIn)

	slip.OvertimeGross = ot.TotalGrossAddition
	slip.TotalGross = r.GrossTotal
	slip.SGKEmployee = r.SGKEmployee
	slip.SGKUnemploymentEmp = r.UnemploymentEmp
	slip.IncomeTaxBase = r.IncomeTaxBase
	slip.IncomeTax = r.IncomeTax
	slip.CumulativeTaxBase = r.CumulativeTaxBaseAfter
	slip.StampTax = r.StampTax
	slip.SGKEmployer = r.SGKEmployer
	slip.UnemploymentEmployer = r.UnemploymentEmpr
	slip.TotalNet = r.NetPay

	items := buildSlipItems(slip, &r, domain.SlipInput{
		EmployeeID:       employeeID,
		BaseSalaryGross:  slip.BaseSalaryGross,
		OvertimeGross:    ot.TotalGrossAddition,
		BonusGross:       slip.BonusGross,
		AllowanceTaxable: slip.AllowanceGross,
		WorkedDays:       slip.WorkedDays,
	})
	// Append overtime breakdown as info items.
	for kind, gross := range ot.ByKind {
		items = append(items, domain.SlipItem{
			ItemType: domain.ItemInfo, Code: "overtime_" + string(kind),
			Description: "Fazla mesai detay: " + string(kind),
			Quantity:    1, Amount: gross,
			OrderIndex: len(items),
		})
	}

	if err := s.slips.UpsertWithItems(ctx, slip, items); err != nil {
		return nil, err
	}
	if annualLimitHit {
		s.log.Warn().Str("employee_id", employeeID.String()).
			Msg("yıllık 270 saat fazla mesai sınırı aşıldı (4857/41) — HR onayı gerekli")
	}
	return slip, nil
}

// defaultTesviklerForTenant returns SGK incentives for the tenant's settings.
// Currently a stub: if tenant opted-in to the generic 5510 %5 incentive we
// return it; production reads from a per-employee table.
func defaultTesviklerForTenant(settings *domain.BordroSettings) []bordro.Tesvik {
	if settings == nil || !settings.Enable5510Incentive {
		return nil
	}
	return []bordro.Tesvik{
		{Code: bordro.Tesvik5510Genel, Label: "5510/81 Genel (%5)", EmployerShareCut: 0.05},
	}
}

// Approve transitions a calculated run to approved.
func (s *PayrollService) Approve(ctx context.Context, tenantID, runID, approverID uuid.UUID) (*domain.Run, error) {
	return s.transitionRun(ctx, tenantID, runID, domain.RunApproved, &approverID)
}

// Finalise locks an approved run (no further edits).
func (s *PayrollService) Finalise(ctx context.Context, tenantID, runID uuid.UUID) (*domain.Run, error) {
	return s.transitionRun(ctx, tenantID, runID, domain.RunFinalised, nil)
}

// Void discards a run (can only happen before finalise).
func (s *PayrollService) Void(ctx context.Context, tenantID, runID uuid.UUID) (*domain.Run, error) {
	return s.transitionRun(ctx, tenantID, runID, domain.RunVoided, nil)
}

func (s *PayrollService) transitionRun(ctx context.Context, tenantID, id uuid.UUID, next domain.RunStatus, approverID *uuid.UUID) (*domain.Run, error) {
	run, err := s.runs.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !run.CanTransitionTo(next) {
		return nil, domain.ErrInvalidStatus
	}
	if err := s.runs.UpdateStatus(ctx, tenantID, id, next, approverID); err != nil {
		return nil, err
	}
	run.Status = next
	middleware.PayrollRunsTotal.WithLabelValues(string(next), string(run.RunType)).Inc()

	var topic string
	switch next {
	case domain.RunApproved:
		topic = event.TopicPayrollRunApproved
	case domain.RunFinalised:
		topic = event.TopicPayrollRunFinalised
	}
	if topic != "" {
		runID := run.ID
		s.emit(ctx, tenantID, &runID, topic, map[string]any{
			"run_id":    run.ID,
			"period_id": run.PeriodID,
			"tenant_id": tenantID,
			"status":    string(next),
		})
	}
	return run, nil
}

// ListSlips returns all slips for a run.
func (s *PayrollService) ListSlips(ctx context.Context, tenantID, runID uuid.UUID) ([]*domain.Slip, error) {
	return s.slips.ListByRun(ctx, tenantID, runID)
}

// EmployeeSlips returns slips for an employee within a year.
func (s *PayrollService) EmployeeSlips(ctx context.Context, tenantID, employeeID uuid.UUID, year int) ([]*domain.Slip, error) {
	return s.slips.ListByEmployee(ctx, tenantID, employeeID, year)
}

// GetSlip returns a single slip with items.
func (s *PayrollService) GetSlip(ctx context.Context, tenantID, id uuid.UUID) (*domain.Slip, error) {
	return s.slips.GetByID(ctx, tenantID, id)
}

// ============================================================================
// Helpers
// ============================================================================

func buildSlipItems(slip *domain.Slip, r *bordro.Result, in domain.SlipInput) []domain.SlipItem {
	out := []domain.SlipItem{}
	add := func(t domain.SlipItemType, code, desc string, amount float64, taxable, sgkable bool) {
		if amount == 0 {
			return
		}
		out = append(out, domain.SlipItem{
			ItemType:    t,
			Code:        code,
			Description: desc,
			Quantity:    1,
			Amount:      amount,
			IsTaxable:   taxable,
			IsSGKable:   sgkable,
			OrderIndex:  len(out),
		})
	}
	add(domain.ItemEarning, "base_salary", "Baz maaş (brüt)", in.BaseSalaryGross, true, true)
	add(domain.ItemEarning, "overtime", "Fazla mesai", in.OvertimeGross, true, true)
	add(domain.ItemEarning, "bonus", "Prim/ikramiye", in.BonusGross, true, true)
	add(domain.ItemEarning, "allowance_taxable", "Vergili yan hak", in.AllowanceTaxable, true, true)
	add(domain.ItemEarning, "allowance_exempt", "Muaf yan hak", in.AllowanceExempt, false, false)

	add(domain.ItemDeduction, "sgk_employee_14", "SGK işçi payı %14", r.SGKEmployee, false, false)
	add(domain.ItemDeduction, "unemployment_emp_1", "İşsizlik işçi payı %1", r.UnemploymentEmp, false, false)
	// Vergi kırılımı: brüt ve istisna ayrı satır, net final satır.
	if r.IncomeTaxExemption > 0 {
		add(domain.ItemInfo, "income_tax_gross", "Gelir vergisi (istisnasız)", r.IncomeTaxGross, false, false)
		add(domain.ItemInfo, "min_wage_income_tax_exemption", "Asgari ücret gelir vergisi istisnası (GVK Gç.86)", r.IncomeTaxExemption, false, false)
	}
	add(domain.ItemDeduction, "income_tax", "Gelir vergisi (ödenecek)", r.IncomeTax, false, false)
	if r.StampTaxExemption > 0 {
		add(domain.ItemInfo, "stamp_tax_gross", "Damga vergisi (istisnasız)", r.StampTaxGross, false, false)
		add(domain.ItemInfo, "min_wage_stamp_exemption", "Asgari ücret damga vergisi istisnası", r.StampTaxExemption, false, false)
	}
	add(domain.ItemDeduction, "stamp_tax", "Damga vergisi (ödenecek)", r.StampTax, false, false)

	add(domain.ItemEmployerContribution, "sgk_employer", "SGK işveren payı", r.SGKEmployer, false, false)
	add(domain.ItemEmployerContribution, "unemployment_emp_2", "İşsizlik işveren payı %2", r.UnemploymentEmpr, false, false)

	add(domain.ItemInfo, "cumulative_tax_base_after", "Kümülatif vergi matrahı", r.CumulativeTaxBaseAfter, false, false)
	return out
}

func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("empty")
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("unparseable")
}
