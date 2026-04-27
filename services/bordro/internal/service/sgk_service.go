package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/bordrosvc/internal/domain"
	"github.com/upcore/bordrosvc/internal/middleware"
	"github.com/upcore/bordrosvc/internal/repository"
	"github.com/upcore/bordrosvc/internal/sgk"
)

// SGKService builds SGK e-Bildirge XML directly from persisted state —
// no manual payload pasting. Requires a configured tenant workplace.
type SGKService struct {
	runs      repository.RunRepository
	periods   repository.PeriodRepository
	workplace repository.WorkplaceRepository
	join      repository.SGKRepository
}

// NewSGKService wires all dependencies.
func NewSGKService(
	runs repository.RunRepository,
	periods repository.PeriodRepository,
	workplace repository.WorkplaceRepository,
	join repository.SGKRepository,
) *SGKService {
	return &SGKService{runs: runs, periods: periods, workplace: workplace, join: join}
}

// ErrWorkplaceMissing is returned when no active SGK workplace is configured.
var ErrWorkplaceMissing = errors.New("sgk: tenant için aktif workplace yok — önce /workplace endpoint'ini doldurun")

// BuildAPBForRun takes a calculated/approved/finalised run and produces an APB XML.
// Validation:
//   - Run must be in a completed state (calculated | approved | finalised).
//   - Tenant must have an active workplace.
//   - Every slip in the run must map to an employee with a valid TCKN.
func (s *SGKService) BuildAPBForRun(ctx context.Context, tenantID, runID uuid.UUID) ([]byte, string, error) {
	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, "", err
	}
	if run.Status != domain.RunCalculated && run.Status != domain.RunApproved && run.Status != domain.RunFinalised {
		return nil, "", fmt.Errorf("sgk: run APB için 'calculated' veya sonrası olmalı (current: %s): %w",
			run.Status, domain.ErrInvalidStatus)
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, "", err
	}
	wp, err := s.workplace.GetActive(ctx, tenantID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, "", ErrWorkplaceMissing
		}
		return nil, "", err
	}
	rows, err := s.join.LoadAPBRowsForRun(ctx, tenantID, runID)
	if err != nil {
		return nil, "", err
	}
	if len(rows) == 0 {
		return nil, "", fmt.Errorf("sgk: run'da bordro satırı yok: %w", domain.ErrValidation)
	}

	payload := sgk.APBPayload{
		Workplace: mapWorkplace(wp),
		Period:    time.Date(period.PeriodYear, time.Month(period.PeriodMonth), 1, 0, 0, 0, 0, time.UTC),
		KanunTuru: wp.KanunTuru,
	}
	for _, r := range rows {
		if r.TCKN == nil || *r.TCKN == "" {
			return nil, "", fmt.Errorf("sgk: çalışan %s için TCKN eksik: %w", r.EmployeeID, domain.ErrValidation)
		}
		payload.Matrahlar = append(payload.Matrahlar, sgk.APBMatrah{
			Employee:      mapEmployee(r),
			PrimGunSayisi: r.PrimGun,
			KazancTutari:  r.KazancTutari,
		})
	}

	body, err := sgk.BuildAPBXML(payload)
	if err != nil {
		return nil, "", err
	}
	filename := sgk.SafeFilename(
		sgk.BildirgeAPB,
		wp.SicilNo,
		fmt.Sprintf("%04d%02d", period.PeriodYear, period.PeriodMonth),
	)
	middleware.SGKXMLGenerated.WithLabelValues("APB").Inc()
	return body, filename, nil
}

// BuildIGBForEmployee produces an İşe Giriş Bildirgesi XML for a single employee.
// The SGK start date defaults to employee.sgk_ise_giris_tarihi or hire_date.
func (s *SGKService) BuildIGBForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]byte, string, error) {
	wp, err := s.workplace.GetActive(ctx, tenantID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, "", ErrWorkplaceMissing
		}
		return nil, "", err
	}
	row, err := s.join.LoadEmployeeSGK(ctx, tenantID, employeeID)
	if err != nil {
		return nil, "", err
	}
	if row.TCKN == nil || *row.TCKN == "" {
		return nil, "", fmt.Errorf("sgk: çalışan için TCKN eksik: %w", domain.ErrValidation)
	}
	if row.SGKIseGiris == nil {
		return nil, "", fmt.Errorf("sgk: çalışan için sgk_ise_giris_tarihi eksik: %w", domain.ErrValidation)
	}
	payload := sgk.IGBPayload{
		Workplace:      mapWorkplace(wp),
		Employee:       mapEmployee(*row),
		IseGirisTarihi: *row.SGKIseGiris,
		CalismaSekli:   "A",
	}
	if row.MeslekKodu != nil {
		payload.GorevKodu = *row.MeslekKodu
	}
	body, err := sgk.BuildIGBXML(payload)
	if err != nil {
		return nil, "", err
	}
	filename := sgk.SafeFilename(sgk.BildirgeIGB, wp.SicilNo,
		row.SGKIseGiris.Format("20060102")+"_"+*row.TCKN)
	middleware.SGKXMLGenerated.WithLabelValues("IGB").Inc()
	return body, filename, nil
}

/* ─── helpers ─── */

func mapWorkplace(w *domain.Workplace) sgk.Workplace {
	out := sgk.Workplace{
		SicilNo: w.SicilNo,
		UnvanTR: w.Unvan,
		VergiNo: w.VergiNo,
	}
	if w.VergiDairesi != nil {
		out.VergiDairesi = *w.VergiDairesi
	}
	if w.Il != nil {
		out.Il = *w.Il
	}
	if w.Ilce != nil {
		out.Ilce = *w.Ilce
	}
	return out
}

func mapEmployee(row repository.SGKSlipRow) sgk.Employee {
	e := sgk.Employee{
		Ad:    row.Ad,
		Soyad: row.Soyad,
	}
	if row.TCKN != nil {
		e.TCKN = *row.TCKN
	}
	if row.MeslekKodu != nil {
		e.MeslekKodu = *row.MeslekKodu
	}
	if row.BabaAdi != nil {
		e.BabaAdi = *row.BabaAdi
	}
	if row.DogumTarihi != nil {
		e.DogumTarihi = *row.DogumTarihi
	}
	if row.SGKNo != nil {
		e.SGKNo = *row.SGKNo
	}
	return e
}
