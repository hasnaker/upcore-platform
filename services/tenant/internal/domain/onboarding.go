package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// OnboardingStatus enumerates draft lifecycle states.
type OnboardingStatus string

const (
	OnboardingStatusInProgress OnboardingStatus = "in_progress"
	OnboardingStatusCommitted  OnboardingStatus = "committed"
	OnboardingStatusAbandoned  OnboardingStatus = "abandoned"
)

// Onboarding-specific sentinel errors.
var (
	ErrOnboardingDraftNotFound = errors.New("onboarding draft not found")
	ErrOnboardingAlreadyCommit = errors.New("onboarding draft already committed")
	ErrOnboardingInvalidStep   = errors.New("onboarding step out of range (1-10)")
)

// OnboardingData is the JSONB payload backing a draft. All fields are
// optional; missing data simply means the user hasn't reached that step.
type OnboardingData struct {
	// Step 1 — company basics.
	Company *CompanyData `json:"company,omitempty"`
	// Step 2 — admin user profile (Clerk already created the account, this
	// captures first/last name + 2FA acknowledgement).
	Admin *AdminData `json:"admin,omitempty"`
	// Step 3 — plan + modules.
	Plan *PlanData `json:"plan,omitempty"`
	// Step 4 — employees (CSV-imported rows pre-validated; commit flushes
	// them to employee service via import/commit).
	Employees *EmployeesData `json:"employees,omitempty"`
	// Step 5 — organization chart template + departments.
	OrgChart *OrgChartData `json:"org_chart,omitempty"`
	// Step 6 — SSO.
	SSO *SSOData `json:"sso,omitempty"`
	// Step 7 — KVKK.
	KVKK *KVKKData `json:"kvkk,omitempty"`
	// Step 8 — payroll/SGK (optional).
	Payroll *PayrollData `json:"payroll,omitempty"`
	// Step 9 — integrations.
	Integrations *IntegrationsData `json:"integrations,omitempty"`
	// Step 10 — summary is display-only.
	// CompletedSteps is the set of steps the user has committed values for.
	CompletedSteps []int `json:"completed_steps,omitempty"`
	// Template picked at step 1 (optional): belediye|holding|tech|kobi.
	Template string `json:"template,omitempty"`
}

// CompanyData captures step 1.
type CompanyData struct {
	Name             string `json:"name"`
	Slug             string `json:"slug"`
	VKN              string `json:"vkn,omitempty"`
	Sector           string `json:"sector,omitempty"`
	EmployeeCountBand string `json:"employee_count_band,omitempty"` // 1-10, 11-50, 51-200, 201-1000, 1000+
	Country          string `json:"country,omitempty"`
	Locale           string `json:"locale,omitempty"`
}

// AdminData captures step 2.
type AdminData struct {
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone,omitempty"`
	TwoFAAck  bool   `json:"two_fa_ack"`
}

// PlanData captures step 3: plan selection + module toggles.
type PlanData struct {
	PlanID  string   `json:"plan_id"`
	Modules []string `json:"modules"`
}

// EmployeeRow is one row in the employees draft.
type EmployeeRow struct {
	EmployeeNo string `json:"employee_no,omitempty"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email,omitempty"`
	TCKN       string `json:"tckn,omitempty"`
	Position   string `json:"position,omitempty"`
	Department string `json:"department,omitempty"`
	HireDate   string `json:"hire_date,omitempty"` // YYYY-MM-DD
	Salary     *int64 `json:"salary,omitempty"`
}

// EmployeesData captures step 4.
type EmployeesData struct {
	Mode    string        `json:"mode"` // "csv" | "manual"
	Rows    []EmployeeRow `json:"rows"`
	CSVName string        `json:"csv_name,omitempty"`
}

// Department is a node in the org chart.
type Department struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	ParentID *string `json:"parent_id,omitempty"`
	Manager  string  `json:"manager,omitempty"`
}

// OrgChartData captures step 5.
type OrgChartData struct {
	Template    string       `json:"template"` // flat | hierarchical | matrix
	Departments []Department `json:"departments"`
}

// SSOData captures step 6.
type SSOData struct {
	Provider     string `json:"provider"` // google | entra | okta | ""
	Enabled      bool   `json:"enabled"`
	ClientID     string `json:"client_id,omitempty"`
	ClientSecret string `json:"client_secret,omitempty"` // encrypted at commit
	TenantID     string `json:"tenant_id,omitempty"`     // Entra tenant
	Domain       string `json:"domain,omitempty"`
}

// KVKKData captures step 7.
type KVKKData struct {
	EmployeeNoticeVersion string `json:"employee_notice_version,omitempty"`
	CandidateNoticeVersion string `json:"candidate_notice_version,omitempty"`
	VisitorNoticeVersion  string `json:"visitor_notice_version,omitempty"`
	DPOName               string `json:"dpo_name,omitempty"`
	DPOEmail              string `json:"dpo_email,omitempty"`
	DPOPhone              string `json:"dpo_phone,omitempty"`
	VERBISAck             bool   `json:"verbis_ack"`
}

// PayrollData captures step 8.
type PayrollData struct {
	SGKWorkplaceCode string `json:"sgk_workplace_code,omitempty"`
	IBAN             string `json:"iban,omitempty"`
	PaymentDay       int    `json:"payment_day,omitempty"` // 1-31
	BankName         string `json:"bank_name,omitempty"`
}

// IntegrationsData captures step 9.
type IntegrationsData struct {
	SlackEnabled    bool   `json:"slack_enabled"`
	SlackWebhook    string `json:"slack_webhook,omitempty"`
	TeamsEnabled    bool   `json:"teams_enabled"`
	TeamsWebhook    string `json:"teams_webhook,omitempty"`
	KariyerNetURL   string `json:"kariyer_net_url,omitempty"`
}

// Value implements driver.Valuer for JSONB writes.
func (d OnboardingData) Value() (driver.Value, error) {
	return json.Marshal(d)
}

// Scan implements sql.Scanner for JSONB reads.
func (d *OnboardingData) Scan(src any) error {
	if src == nil {
		*d = OnboardingData{}
		return nil
	}
	var b []byte
	switch v := src.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported OnboardingData src type %T", src)
	}
	return json.Unmarshal(b, d)
}

// OnboardingDraft is the root record for wizard progress.
type OnboardingDraft struct {
	ID                uuid.UUID        `db:"id" json:"id"`
	ClerkUserID       string           `db:"clerk_user_id" json:"clerk_user_id"`
	AdminEmail        string           `db:"admin_email" json:"admin_email"`
	CurrentStep       int              `db:"current_step" json:"current_step"`
	Status            OnboardingStatus `db:"status" json:"status"`
	CommittedTenantID *uuid.UUID       `db:"committed_tenant_id" json:"committed_tenant_id,omitempty"`
	Data              OnboardingData   `db:"data" json:"data"`
	CreatedAt         time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time        `db:"updated_at" json:"updated_at"`
}

// MergeStep merges a new step payload into the draft's Data, respecting the
// step index (1-10). Unknown steps return ErrOnboardingInvalidStep.
func (d *OnboardingDraft) MergeStep(step int, payload OnboardingData) error {
	if step < 1 || step > 10 {
		return ErrOnboardingInvalidStep
	}
	switch step {
	case 1:
		if payload.Company != nil {
			d.Data.Company = payload.Company
		}
		if payload.Template != "" {
			d.Data.Template = payload.Template
		}
	case 2:
		if payload.Admin != nil {
			d.Data.Admin = payload.Admin
		}
	case 3:
		if payload.Plan != nil {
			d.Data.Plan = payload.Plan
		}
	case 4:
		if payload.Employees != nil {
			d.Data.Employees = payload.Employees
		}
	case 5:
		if payload.OrgChart != nil {
			d.Data.OrgChart = payload.OrgChart
		}
	case 6:
		if payload.SSO != nil {
			d.Data.SSO = payload.SSO
		}
	case 7:
		if payload.KVKK != nil {
			d.Data.KVKK = payload.KVKK
		}
	case 8:
		if payload.Payroll != nil {
			d.Data.Payroll = payload.Payroll
		}
	case 9:
		if payload.Integrations != nil {
			d.Data.Integrations = payload.Integrations
		}
	case 10:
		// Summary step — read-only.
	}

	// Track completion.
	seen := false
	for _, s := range d.Data.CompletedSteps {
		if s == step {
			seen = true
			break
		}
	}
	if !seen {
		d.Data.CompletedSteps = append(d.Data.CompletedSteps, step)
	}
	if step > d.CurrentStep {
		d.CurrentStep = step
	}
	return nil
}
