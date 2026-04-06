package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// PosLevel enumerates seniority tiers.
type PosLevel string

const (
	PosLevelJunior   PosLevel = "junior"
	PosLevelMid      PosLevel = "mid"
	PosLevelSenior   PosLevel = "senior"
	PosLevelLead     PosLevel = "lead"
	PosLevelDirector PosLevel = "director"
)

// ValidPosLevels lists all acceptable levels.
var ValidPosLevels = []PosLevel{
	PosLevelJunior, PosLevelMid, PosLevelSenior, PosLevelLead, PosLevelDirector,
}

// IsValidLevel reports whether the given level string is recognized.
func IsValidLevel(level string) bool {
	for _, l := range ValidPosLevels {
		if string(l) == level {
			return true
		}
	}
	return false
}

// EmploymentType enumerates contract types.
type EmploymentType string

const (
	EmploymentFullTime  EmploymentType = "full_time"
	EmploymentPartTime  EmploymentType = "part_time"
	EmploymentContract  EmploymentType = "contract"
	EmploymentIntern    EmploymentType = "intern"
	EmploymentFreelance EmploymentType = "freelance"
)

// RemotePolicy enumerates remote-work modes.
type RemotePolicy string

const (
	RemoteOnsite RemotePolicy = "onsite"
	RemoteHybrid RemotePolicy = "hybrid"
	RemoteRemote RemotePolicy = "remote"
)

// Position represents a job definition (position_definitions row).
type Position struct {
	ID                uuid.UUID      `db:"id" json:"id"`
	TenantID          uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	DepartmentID      *uuid.UUID     `db:"department_id" json:"department_id,omitempty"`
	Code              string         `db:"code" json:"code"`
	TitleTR           string         `db:"title_tr" json:"title_tr"`
	TitleEN           *string        `db:"title_en" json:"title_en,omitempty"`
	JobFamily         *string        `db:"job_family" json:"job_family,omitempty"`
	JobLevel          *string        `db:"job_level" json:"job_level,omitempty"`
	SeniorityMinYears *int           `db:"seniority_min_years" json:"seniority_min_years,omitempty"`
	DescriptionTR     *string        `db:"description_tr" json:"description_tr,omitempty"`
	DescriptionEN     *string        `db:"description_en" json:"description_en,omitempty"`
	Responsibilities  JSONB          `db:"responsibilities" json:"responsibilities"`
	RequiredSkills    JSONB          `db:"required_skills" json:"required_skills"`
	PreferredSkills   JSONB          `db:"preferred_skills" json:"preferred_skills"`
	JDRDemands        JDRDemands     `db:"jdr_talepler" json:"jdr_talepler"`
	JDRResources      JDRResources   `db:"jdr_kaynaklar" json:"jdr_kaynaklar"`
	SalaryBandMin     *float64       `db:"salary_band_min" json:"salary_band_min,omitempty"`
	SalaryBandMax     *float64       `db:"salary_band_max" json:"salary_band_max,omitempty"`
	SalaryCurrency    string         `db:"salary_currency" json:"salary_currency"`
	EmploymentType    EmploymentType `db:"employment_type" json:"employment_type"`
	RemotePolicy      RemotePolicy   `db:"remote_policy" json:"remote_policy"`
	Active            bool           `db:"active" json:"active"`
	CreatedAt         time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time      `db:"updated_at" json:"updated_at"`
	DeletedAt         *time.Time     `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Validate verifies required fields and value ranges.
func (p *Position) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(p.TitleTR) == "" {
		fields["title_tr"] = "required"
	} else if len(p.TitleTR) > 200 {
		fields["title_tr"] = "max 200 chars"
	}
	if strings.TrimSpace(p.Code) == "" {
		fields["code"] = "required"
	} else if err := ValidateCode(p.Code); err != nil {
		fields["code"] = "invalid format"
	}
	if p.SalaryBandMin != nil && p.SalaryBandMax != nil && *p.SalaryBandMax < *p.SalaryBandMin {
		fields["salary_band"] = "max must be >= min"
	}
	if p.JobLevel != nil && *p.JobLevel != "" && !IsValidLevel(*p.JobLevel) {
		fields["job_level"] = "invalid level"
	}
	if p.SalaryCurrency == "" {
		p.SalaryCurrency = "TRY"
	} else if len(p.SalaryCurrency) != 3 {
		fields["salary_currency"] = "must be ISO 4217"
	}
	if p.EmploymentType != "" {
		switch p.EmploymentType {
		case EmploymentFullTime, EmploymentPartTime, EmploymentContract, EmploymentIntern, EmploymentFreelance:
		default:
			fields["employment_type"] = "invalid"
		}
	}
	if p.RemotePolicy != "" {
		switch p.RemotePolicy {
		case RemoteOnsite, RemoteHybrid, RemoteRemote:
		default:
			fields["remote_policy"] = "invalid"
		}
	}
	if err := p.JDRDemands.Validate(); err != nil {
		fields["jdr_talepler"] = err.Error()
	}
	if err := p.JDRResources.Validate(); err != nil {
		fields["jdr_kaynaklar"] = err.Error()
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// SalaryInRange reports whether the given salary fits the band (inclusive).
// If either bound is nil, it is treated as unbounded.
func (p *Position) SalaryInRange(salary float64) bool {
	if p.SalaryBandMin != nil && salary < *p.SalaryBandMin {
		return false
	}
	if p.SalaryBandMax != nil && salary > *p.SalaryBandMax {
		return false
	}
	return true
}

// JSONB is a generic JSON column that marshals to/from the database.
type JSONB []byte

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = nil
		return nil
	}
	switch v := src.(type) {
	case []byte:
		dup := make([]byte, len(v))
		copy(dup, v)
		*j = dup
	case string:
		*j = []byte(v)
	default:
		return fmt.Errorf("JSONB: unsupported scan type %T", src)
	}
	return nil
}

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return []byte(j), nil
}

// MarshalJSON serializes as a raw JSON value.
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return []byte(j), nil
}

// UnmarshalJSON captures the raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if data == nil {
		*j = nil
		return nil
	}
	dup := make([]byte, len(data))
	copy(dup, data)
	*j = dup
	return nil
}

// DecodeMap decodes the JSONB into a generic map.
func (j JSONB) DecodeMap() (map[string]any, error) {
	if len(j) == 0 {
		return map[string]any{}, nil
	}
	m := map[string]any{}
	if err := json.Unmarshal(j, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// EncodeMap marshals the given map into JSONB, returning an error on failure.
func EncodeMap(m map[string]any) (JSONB, error) {
	if m == nil {
		return JSONB("{}"), nil
	}
	raw, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return JSONB(raw), nil
}

// ErrJSONBInvalid is returned for malformed JSONB input.
var ErrJSONBInvalid = errors.New("jsonb: invalid payload")
