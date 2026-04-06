package validator

import (
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/upcore/employee/internal/domain"
)

var (
	employeeNoRe = regexp.MustCompile(`^[A-Z0-9][A-Z0-9_-]{0,39}$`)
	phoneRe      = regexp.MustCompile(`^[+]?[0-9 ()-]{7,20}$`)
	ibanRe       = regexp.MustCompile(`^TR[0-9]{24}$`)
	currencyRe   = regexp.MustCompile(`^[A-Z]{3}$`)
)

// EmployeeInput captures the fields needed to create / update an employee,
// using plain types so the HTTP layer can bind JSON bodies without touching
// the domain entity.
type EmployeeInput struct {
	EmployeeNo       string
	TCKN             string
	Ad               string
	Soyad            string
	EmailIs          string
	TelefonIs        string
	BankIBAN         string
	HireDate         string // YYYY-MM-DD
	TerminationDate  string // YYYY-MM-DD (optional)
	Gender           string
	MaritalStatus    string
	EmploymentStatus string
	EmploymentType   string
	SalaryCurrency   string
}

// Validate runs field-level checks and returns a ValidationError aggregating
// all failures, or nil.
func ValidateEmployeeInput(in EmployeeInput) error {
	fields := map[string]string{}

	// Required
	if strings.TrimSpace(in.Ad) == "" {
		fields["ad"] = "required"
	} else if len(in.Ad) > 100 {
		fields["ad"] = "max_length_100"
	}
	if strings.TrimSpace(in.Soyad) == "" {
		fields["soyad"] = "required"
	} else if len(in.Soyad) > 100 {
		fields["soyad"] = "max_length_100"
	}
	if v := strings.TrimSpace(in.EmployeeNo); v != "" {
		if !employeeNoRe.MatchString(strings.ToUpper(v)) {
			fields["employee_no"] = "invalid_format"
		}
	}

	// Hire date
	hd, err := parseDate(in.HireDate)
	if err != nil {
		fields["hire_date"] = "invalid_date"
	}

	// Termination date
	if in.TerminationDate != "" {
		td, tErr := parseDate(in.TerminationDate)
		if tErr != nil {
			fields["termination_date"] = "invalid_date"
		} else if err == nil && td.Before(hd) {
			fields["termination_date"] = "before_hire_date"
		}
	}

	// Optional identifiers
	if in.TCKN != "" && !IsValidTCKN(in.TCKN) {
		fields["tckn"] = "invalid"
	}
	if in.EmailIs != "" {
		if _, err := mail.ParseAddress(in.EmailIs); err != nil {
			fields["email_is"] = "invalid"
		}
	}
	if in.TelefonIs != "" && !phoneRe.MatchString(in.TelefonIs) {
		fields["telefon_is"] = "invalid"
	}
	if in.BankIBAN != "" {
		iban := strings.ToUpper(strings.ReplaceAll(in.BankIBAN, " ", ""))
		if !ibanRe.MatchString(iban) {
			fields["bank_iban"] = "invalid"
		}
	}

	// Enums
	if in.Gender != "" && !domain.Gender(in.Gender).IsValid() {
		fields["cinsiyet"] = "invalid"
	}
	if in.MaritalStatus != "" && !domain.MaritalStatus(in.MaritalStatus).IsValid() {
		fields["medeni_hali"] = "invalid"
	}
	if in.EmploymentStatus != "" && !domain.EmploymentStatus(in.EmploymentStatus).IsValid() {
		fields["employment_status"] = "invalid"
	}
	if in.EmploymentType != "" && !domain.EmploymentType(in.EmploymentType).IsValid() {
		fields["employment_type"] = "invalid"
	}
	if in.SalaryCurrency != "" && !currencyRe.MatchString(in.SalaryCurrency) {
		fields["salary_currency"] = "invalid"
	}

	if len(fields) > 0 {
		return domain.NewValidationError(fields)
	}
	return nil
}

// parseDate accepts YYYY-MM-DD (optionally trimmed).
func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, domain.ErrInvalidDate
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, domain.ErrInvalidDate
	}
	return t, nil
}

// NormalizeIBAN strips spaces and uppercases.
func NormalizeIBAN(s string) string {
	return strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(s), " ", ""))
}

// NormalizeTCKN strips whitespace.
func NormalizeTCKN(s string) string {
	return strings.TrimSpace(s)
}

// NormalizeEmail lowercases and trims.
func NormalizeEmail(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
