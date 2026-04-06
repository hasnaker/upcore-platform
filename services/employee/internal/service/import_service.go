package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
	"github.com/upcore/employee/internal/validator"
)

// ImportRowError describes a per-row failure during CSV import.
type ImportRowError struct {
	Row     int    `json:"row"`
	Column  string `json:"column,omitempty"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// ImportResult summarises the outcome of a bulk CSV import.
type ImportResult struct {
	Total     int              `json:"total"`
	Imported  int              `json:"imported"`
	Skipped   int              `json:"skipped"`
	Errors    []ImportRowError `json:"errors"`
	Duration  time.Duration    `json:"duration_ms"`
	StartedAt time.Time        `json:"started_at"`
}

// ImportService parses Paraşüt-compatible CSV files and bulk-creates employees.
type ImportService struct {
	employees  repository.EmployeeRepository
	history    repository.HistoryRepository
	publisher  event.Publisher
	maxRows    int
	batchSize  int
	log        zerolog.Logger
}

// NewImportService constructs an ImportService.
func NewImportService(
	employees repository.EmployeeRepository,
	history repository.HistoryRepository,
	publisher event.Publisher,
	maxRows, batchSize int,
	log zerolog.Logger,
) *ImportService {
	if maxRows <= 0 {
		maxRows = 10000
	}
	if batchSize <= 0 {
		batchSize = 500
	}
	return &ImportService{
		employees: employees,
		history:   history,
		publisher: publisher,
		maxRows:   maxRows,
		batchSize: batchSize,
		log:       log,
	}
}

// parasutColumns lists the Paraşüt CSV header. Additional columns are
// tolerated but ignored.
var parasutColumns = []string{
	"sicil_no", "ad", "soyad", "email", "tckn",
	"dogum_tarihi", "ise_baslama_tarihi",
	"departman", "pozisyon", "yonetici_email",
}

// ImportCSV parses a CSV stream and creates employees.
// The first row is expected to be the header; unknown columns are preserved
// but not written.
func (s *ImportService) ImportCSV(ctx context.Context, tenantID, createdBy uuid.UUID, r io.Reader) (*ImportResult, error) {
	start := time.Now()
	res := &ImportResult{StartedAt: start}

	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true
	reader.ReuseRecord = false

	// Header
	header, err := reader.Read()
	if err != nil {
		return nil, domain.ErrCSVInvalidSchema
	}
	colIdx := buildColumnIndex(header)
	if colIdx["ad"] < 0 || colIdx["soyad"] < 0 || colIdx["ise_baslama_tarihi"] < 0 {
		return nil, domain.ErrCSVInvalidSchema
	}

	rowNum := 1
	pending := make([]*domain.Employee, 0, s.batchSize)

	for {
		rowNum++
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			res.Errors = append(res.Errors, ImportRowError{Row: rowNum, Message: "csv parse error: " + err.Error()})
			continue
		}
		if res.Total >= s.maxRows {
			return nil, domain.ErrCSVTooManyRows
		}
		res.Total++

		emp, verr := s.mapRow(tenantID, colIdx, row)
		if verr != nil {
			res.Errors = append(res.Errors, ImportRowError{Row: rowNum, Message: verr.Error()})
			continue
		}
		pending = append(pending, emp)
		if len(pending) >= s.batchSize {
			s.flush(ctx, pending, &res.Imported, &res.Errors, rowNum, createdBy, tenantID)
			pending = pending[:0]
		}
	}
	if len(pending) > 0 {
		s.flush(ctx, pending, &res.Imported, &res.Errors, rowNum, createdBy, tenantID)
	}
	res.Skipped = res.Total - res.Imported
	res.Duration = time.Since(start)

	s.publish(ctx, event.TopicEmployeeImportCompleted, map[string]any{
		"tenant_id":    tenantID,
		"total":        res.Total,
		"imported":     res.Imported,
		"errors":       len(res.Errors),
		"completed_at": time.Now().UTC(),
	})
	return res, nil
}

func (s *ImportService) flush(
	ctx context.Context,
	batch []*domain.Employee,
	imported *int,
	errs *[]ImportRowError,
	endRow int,
	createdBy uuid.UUID,
	tenantID uuid.UUID,
) {
	for i, e := range batch {
		if err := s.employees.Create(ctx, nil, e); err != nil {
			*errs = append(*errs, ImportRowError{
				Row:     endRow - (len(batch) - 1 - i),
				Column:  "employee_no",
				Message: err.Error(),
				Value:   e.EmployeeNo,
			})
			continue
		}
		*imported++
		// best-effort hire history
		hist := domain.NewHistoryEntry(tenantID, e.ID, domain.ChangeHire, e.HireDate)
		if createdBy != uuid.Nil {
			by := createdBy
			hist.ApprovedBy = &by
		}
		_ = s.history.Append(ctx, nil, hist)
	}
}

func (s *ImportService) mapRow(tenantID uuid.UUID, idx map[string]int, row []string) (*domain.Employee, error) {
	get := func(key string) string {
		i := idx[key]
		if i < 0 || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}

	ad := get("ad")
	soyad := get("soyad")
	if ad == "" || soyad == "" {
		return nil, fmt.Errorf("ad/soyad required")
	}
	hireStr := get("ise_baslama_tarihi")
	hireDate, err := parseFlexibleDate(hireStr)
	if err != nil {
		return nil, fmt.Errorf("invalid ise_baslama_tarihi: %q", hireStr)
	}
	empNo := get("sicil_no")
	if empNo == "" {
		empNo = "IMP-" + uuid.NewString()[:8]
	}

	tckn := get("tckn")
	if tckn != "" && !validator.IsValidTCKN(tckn) {
		return nil, fmt.Errorf("invalid tckn: %q", tckn)
	}
	email := validator.NormalizeEmail(get("email"))

	e := &domain.Employee{
		TenantID:         tenantID,
		EmployeeNo:       strings.ToUpper(empNo),
		Ad:               ad,
		Soyad:            soyad,
		HireDate:         hireDate,
		EmploymentStatus: domain.StatusActive,
		EmploymentType:   domain.TypeFullTime,
		SalaryCurrency:   "TRY",
	}
	if tckn != "" {
		e.TCKN = &tckn
	}
	if email != "" {
		e.EmailIs = &email
	}
	if dt := get("dogum_tarihi"); dt != "" {
		if d, err := parseFlexibleDate(dt); err == nil {
			e.DogumTarihi = &d
		}
	}
	e.ApplyDefaults()
	return e, nil
}

// parseFlexibleDate accepts YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY.
func parseFlexibleDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, domain.ErrInvalidDate
	}
	layouts := []string{"2006-01-02", "02.01.2006", "02/01/2006", "2006/01/02"}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, domain.ErrInvalidDate
}

func buildColumnIndex(header []string) map[string]int {
	m := map[string]int{}
	for _, col := range parasutColumns {
		m[col] = -1
	}
	for i, h := range header {
		key := strings.ToLower(strings.TrimSpace(h))
		if _, ok := m[key]; ok {
			m[key] = i
		}
	}
	return m
}

func (s *ImportService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}

