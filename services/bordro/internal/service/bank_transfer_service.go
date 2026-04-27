package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/bordro"
	"github.com/upcore/bordrosvc/internal/repository"
)

// BankTransferService builds payee files in bank-specific formats.
type BankTransferService struct {
	runs     repository.RunRepository
	periods  repository.PeriodRepository
	slips    repository.SlipRepository
	workplace repository.WorkplaceRepository
	bank     repository.BankTransferRepository
}

// NewBankTransferService wires the dependencies.
func NewBankTransferService(
	runs repository.RunRepository,
	periods repository.PeriodRepository,
	slips repository.SlipRepository,
	workplace repository.WorkplaceRepository,
	bank repository.BankTransferRepository,
) *BankTransferService {
	return &BankTransferService{runs: runs, periods: periods, slips: slips, workplace: workplace, bank: bank}
}

// BuildResult is the file + diagnostic info returned to the handler.
type BuildResult struct {
	Body       []byte
	FileName   string
	MimeType   string
	RowCount   int
	TotalNet   float64
	Missing    []MissingIBAN
}

// MissingIBAN marks an employee whose slip was skipped due to missing IBAN.
type MissingIBAN struct {
	EmployeeID uuid.UUID `json:"employee_id"`
	EmployeeNo string    `json:"employee_no"`
	FullName   string    `json:"full_name"`
}

// Build produces a batch payment file for the given run in the specified
// format. Employees without IBAN are excluded and returned in Missing so
// payroll ops can contact them before uploading the file.
//
// SenderIBAN must be provided (the company's account that will be debited).
// ValueDate defaults to today+1 business day if zero.
func (s *BankTransferService) Build(
	ctx context.Context,
	tenantID, runID uuid.UUID,
	format bordro.BankTransferFormat,
	senderIBAN string,
	valueDate time.Time,
) (*BuildResult, error) {
	if tenantID == uuid.Nil {
		return nil, errors.New("tenant required")
	}
	if !format.IsValid() {
		return nil, fmt.Errorf("unknown bank format: %s", format)
	}
	if strings.TrimSpace(senderIBAN) == "" {
		return nil, errors.New("sender IBAN required")
	}

	run, err := s.runs.GetByID(ctx, tenantID, runID)
	if err != nil {
		return nil, err
	}
	period, err := s.periods.GetByID(ctx, tenantID, run.PeriodID)
	if err != nil {
		return nil, err
	}
	wp, _ := s.workplace.GetActive(ctx, tenantID)

	rows, err := s.bank.LoadRunRows(ctx, tenantID, runID)
	if err != nil {
		return nil, err
	}

	if valueDate.IsZero() {
		valueDate = nextBusinessDay(time.Now())
	}
	periodStr := fmt.Sprintf("%04d-%02d", period.PeriodYear, period.PeriodMonth)

	senderTitle := "UpCore Tenant"
	vergiNo := ""
	if wp != nil {
		senderTitle = wp.Unvan
		vergiNo = wp.VergiNo
	}

	cfg := bordro.BankTransferConfig{
		Format:       format,
		SenderTitle:  senderTitle,
		SenderIBAN:   senderIBAN,
		ValueDate:    valueDate,
		Period:       periodStr,
		CompanyTaxNo: vergiNo,
	}

	brows := make([]bordro.BankTransferRow, 0, len(rows))
	missing := []MissingIBAN{}
	total := 0.0
	for _, r := range rows {
		if r.IBAN == nil || strings.TrimSpace(*r.IBAN) == "" {
			missing = append(missing, MissingIBAN{
				EmployeeID: r.EmployeeID,
				EmployeeNo: r.EmployeeNo,
				FullName:   r.Ad + " " + r.Soyad,
			})
			continue
		}
		tckn := ""
		if r.TCKN != nil {
			tckn = *r.TCKN
		}
		brows = append(brows, bordro.BankTransferRow{
			EmployeeNo: r.EmployeeNo,
			FullName:   r.Ad + " " + r.Soyad,
			TCKN:       tckn,
			IBAN:       strings.ReplaceAll(strings.ToUpper(*r.IBAN), " ", ""),
			Amount:     r.NetSalary,
			Currency:   "TRY",
			Reference:  periodStr + " Maaş",
		})
		total += r.NetSalary
	}

	if len(brows) == 0 {
		return &BuildResult{RowCount: 0, Missing: missing}, nil
	}

	body, fname, mime := bordro.BuildBankTransferFile(cfg, brows)
	return &BuildResult{
		Body: body, FileName: fname, MimeType: mime,
		RowCount: len(brows), TotalNet: total,
		Missing: missing,
	}, nil
}

// nextBusinessDay returns the first weekday after `t` (Mon=1 … Fri=5).
func nextBusinessDay(t time.Time) time.Time {
	t = t.AddDate(0, 0, 1)
	for t.Weekday() == time.Saturday || t.Weekday() == time.Sunday {
		t = t.AddDate(0, 0, 1)
	}
	return t
}
