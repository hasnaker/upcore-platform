package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// JSONB is a thin wrapper around a JSON byte slice that satisfies both
// database/sql.Scanner and driver.Valuer so it round-trips through pg jsonb columns.
type JSONB []byte

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	// Ensure valid JSON.
	if !json.Valid(j) {
		return nil, fmt.Errorf("jsonb: invalid JSON")
	}
	return []byte(j), nil
}

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB("{}")
		return nil
	}
	switch v := src.(type) {
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSONB(cp)
	case string:
		*j = JSONB([]byte(v))
	default:
		return fmt.Errorf("jsonb: unsupported scan type %T", src)
	}
	return nil
}

// MarshalJSON emits the underlying bytes (or an empty object).
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

// UnmarshalJSON captures the raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		*j = JSONB("{}")
		return nil
	}
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSONB(cp)
	return nil
}

// Employee is the root HR record.
//
// Field names mirror the Turkish column names used in the database schema
// (migrations/007_employees.up.sql) to avoid ambiguity for Turkish HR users.
type Employee struct {
	ID         uuid.UUID  `db:"id" json:"id"`
	TenantID   uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	UserID     *uuid.UUID `db:"user_id" json:"user_id,omitempty"`
	ExternalID *string    `db:"external_id" json:"external_id,omitempty"`
	EmployeeNo string     `db:"employee_no" json:"employee_no"`
	TCKN       *string    `db:"tckn" json:"tckn,omitempty"`

	// Personal (Turkish names)
	Ad          string     `db:"ad" json:"ad"`
	Soyad       string     `db:"soyad" json:"soyad"`
	DogumTarihi *time.Time `db:"dogum_tarihi" json:"dogum_tarihi,omitempty"`
	DogumYeri   *string    `db:"dogum_yeri" json:"dogum_yeri,omitempty"`
	Cinsiyet    *string    `db:"cinsiyet" json:"cinsiyet,omitempty"`
	MedeniHali  *string    `db:"medeni_hali" json:"medeni_hali,omitempty"`
	Uyruk       *string    `db:"uyruk" json:"uyruk,omitempty"`

	// Contact
	EmailIs        *string `db:"email_is" json:"email_is,omitempty"`
	EmailKisisel   *string `db:"email_kisisel" json:"email_kisisel,omitempty"`
	TelefonIs      *string `db:"telefon_is" json:"telefon_is,omitempty"`
	TelefonKisisel *string `db:"telefon_kisisel" json:"telefon_kisisel,omitempty"`

	// Address
	Adres     *string `db:"adres" json:"adres,omitempty"`
	Sehir     *string `db:"sehir" json:"sehir,omitempty"`
	Ulke      *string `db:"ulke" json:"ulke,omitempty"`
	PostaKodu *string `db:"posta_kodu" json:"posta_kodu,omitempty"`

	// Org
	DepartmentID *uuid.UUID `db:"department_id" json:"department_id,omitempty"`
	PositionID   *uuid.UUID `db:"position_id" json:"position_id,omitempty"`
	ManagerID    *uuid.UUID `db:"manager_id" json:"manager_id,omitempty"`

	// Employment
	HireDate          time.Time          `db:"hire_date" json:"hire_date"`
	TenureMonths      *int               `db:"tenure_months" json:"tenure_months,omitempty"`
	ProbationEndDate  *time.Time         `db:"probation_end_date" json:"probation_end_date,omitempty"`
	TerminationDate   *time.Time       `db:"termination_date" json:"termination_date,omitempty"`
	TerminationReason *string          `db:"termination_reason" json:"termination_reason,omitempty"`
	EmploymentStatus  EmploymentStatus `db:"employment_status" json:"employment_status"`
	EmploymentType    EmploymentType   `db:"employment_type" json:"employment_type"`
	WorkLocation      *string            `db:"work_location" json:"work_location,omitempty"`
	ContractType      *string            `db:"contract_type" json:"contract_type,omitempty"`

	// Compensation
	SalaryGross    *float64 `db:"salary_gross" json:"salary_gross,omitempty"`
	SalaryNet      *float64 `db:"salary_net" json:"salary_net,omitempty"`
	SalaryCurrency string   `db:"salary_currency" json:"salary_currency"`

	// Banking / identifiers
	BankIBAN *string `db:"bank_iban" json:"bank_iban,omitempty"`
	SGKNo    *string `db:"sgk_no" json:"sgk_no,omitempty"`

	Notes    *string `db:"notes" json:"notes,omitempty"`
	Metadata JSONB   `db:"metadata" json:"metadata,omitempty"`

	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// FullName returns ad + soyad joined with a single space.
func (e *Employee) FullName() string {
	return strings.TrimSpace(e.Ad + " " + e.Soyad)
}

// Age returns the employee's age in years based on dogum_tarihi.
// Returns 0 when birth date is unset.
func (e *Employee) Age() int {
	if e.DogumTarihi == nil {
		return 0
	}
	now := time.Now()
	years := now.Year() - e.DogumTarihi.Year()
	anniv := time.Date(now.Year(), e.DogumTarihi.Month(), e.DogumTarihi.Day(), 0, 0, 0, 0, now.Location())
	if now.Before(anniv) {
		years--
	}
	if years < 0 {
		years = 0
	}
	return years
}

// TenureDays returns tenure in whole days. Uses termination_date when set.
func (e *Employee) TenureDays() int {
	end := time.Now().UTC()
	if e.TerminationDate != nil {
		end = e.TerminationDate.UTC()
	}
	d := end.Sub(e.HireDate.UTC()).Hours() / 24
	if d < 0 {
		return 0
	}
	return int(d)
}

// IsActive returns true when the employee holds a working status.
func (e *Employee) IsActive() bool {
	return e.EmploymentStatus == StatusActive || e.EmploymentStatus == StatusOnLeave
}

// IsTerminated returns true when the employee has been terminated/retired.
func (e *Employee) IsTerminated() bool {
	return e.EmploymentStatus == StatusTerminated || e.EmploymentStatus == StatusRetired
}

// ApplyDefaults fills in defaults required by the DB constraints.
func (e *Employee) ApplyDefaults() {
	if e.EmploymentStatus == "" {
		e.EmploymentStatus = StatusActive
	}
	if e.EmploymentType == "" {
		e.EmploymentType = TypeFullTime
	}
	if e.SalaryCurrency == "" {
		e.SalaryCurrency = "TRY"
	}
	if e.Ulke == nil || *e.Ulke == "" {
		v := "TR"
		e.Ulke = &v
	}
	if e.Uyruk == nil || *e.Uyruk == "" {
		v := "T.C."
		e.Uyruk = &v
	}
	if len(e.Metadata) == 0 {
		e.Metadata = JSONB("{}")
	}
}

// GenerateEmployeeNo builds a formatted sicil number like "EMP000042".
func GenerateEmployeeNo(seq int) string {
	return fmt.Sprintf("EMP%06d", seq)
}

// Mask returns a redacted copy safe to log (TCKN/IBAN removed).
func (e *Employee) Mask() *Employee {
	cp := *e
	cp.TCKN = nil
	cp.BankIBAN = nil
	return &cp
}
