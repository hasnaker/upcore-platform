package domain

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// OnboardingStatus enumerates the checklist lifecycle states.
type OnboardingStatus string

const (
	OnboardingActive    OnboardingStatus = "active"
	OnboardingCompleted OnboardingStatus = "completed"
	OnboardingCancelled OnboardingStatus = "cancelled"
)

// IsValid reports whether the status is known.
func (s OnboardingStatus) IsValid() bool {
	switch s {
	case OnboardingActive, OnboardingCompleted, OnboardingCancelled:
		return true
	}
	return false
}

// OnboardingTaskStatus enumerates task-level states.
type OnboardingTaskStatus string

const (
	TaskPending    OnboardingTaskStatus = "pending"
	TaskInProgress OnboardingTaskStatus = "in_progress"
	TaskCompleted  OnboardingTaskStatus = "completed"
	TaskBlocked    OnboardingTaskStatus = "blocked"
	TaskCancelled  OnboardingTaskStatus = "cancelled"
)

// IsValid reports whether the task status is known.
func (s OnboardingTaskStatus) IsValid() bool {
	switch s {
	case TaskPending, TaskInProgress, TaskCompleted, TaskBlocked, TaskCancelled:
		return true
	}
	return false
}

// OwnerRole identifies who is responsible for a task.
type OwnerRole string

const (
	OwnerEmployee OwnerRole = "employee"
	OwnerManager  OwnerRole = "manager"
	OwnerHR       OwnerRole = "hr"
	OwnerIT       OwnerRole = "it"
	OwnerFinance  OwnerRole = "finance"
	OwnerOther    OwnerRole = "other"
)

// IsValid reports whether the owner role is legal.
func (r OwnerRole) IsValid() bool {
	switch r {
	case OwnerEmployee, OwnerManager, OwnerHR, OwnerIT, OwnerFinance, OwnerOther:
		return true
	}
	return false
}

// Onboarding-related domain errors.
var (
	ErrOnboardingNotFound     = errors.New("onboarding checklist not found")
	ErrOnboardingExists       = errors.New("onboarding checklist already exists for employee")
	ErrOnboardingTaskNotFound = errors.New("onboarding task not found")
	ErrOnboardingClosed       = errors.New("onboarding checklist is already closed")
	ErrUnknownTemplate        = errors.New("unknown onboarding template")
)

// OnboardingChecklist mirrors app.onboarding_checklists.
type OnboardingChecklist struct {
	ID            uuid.UUID        `db:"id" json:"id"`
	TenantID      uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID        `db:"employee_id" json:"employee_id"`
	TemplateName  string           `db:"template_name" json:"template_name"`
	StartDate     time.Time        `db:"start_date" json:"start_date"`
	Status        OnboardingStatus `db:"status" json:"status"`
	CompletionPct int              `db:"completion_pct" json:"completion_pct"`
	CreatedAt     time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time        `db:"updated_at" json:"updated_at"`

	Tasks []OnboardingTask `db:"-" json:"tasks,omitempty"`
}

// OnboardingTask mirrors app.onboarding_tasks.
type OnboardingTask struct {
	ID              uuid.UUID            `db:"id" json:"id"`
	ChecklistID     uuid.UUID            `db:"checklist_id" json:"checklist_id"`
	TaskCode        string               `db:"task_code" json:"task_code"`
	TaskTitleTR     string               `db:"task_title_tr" json:"task_title_tr"`
	TaskDescription *string              `db:"task_description" json:"task_description,omitempty"`
	OwnerRole       OwnerRole            `db:"owner_role" json:"owner_role"`
	OwnerUserID     *uuid.UUID           `db:"owner_user_id" json:"owner_user_id,omitempty"`
	DueAt           time.Time            `db:"due_at" json:"due_at"`
	DueDaysOffset   int                  `db:"due_days_offset" json:"due_days_offset"`
	Status          OnboardingTaskStatus `db:"status" json:"status"`
	CompletedAt     *time.Time           `db:"completed_at" json:"completed_at,omitempty"`
	Notes           *string              `db:"notes" json:"notes,omitempty"`
	OrderIndex      int                  `db:"order_index" json:"order_index"`
	CreatedAt       time.Time            `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time            `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (c *OnboardingChecklist) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Status == "" {
		c.Status = OnboardingActive
	}
	if c.TemplateName == "" {
		c.TemplateName = "standard"
	}
	if c.CompletionPct < 0 {
		c.CompletionPct = 0
	}
	if c.CompletionPct > 100 {
		c.CompletionPct = 100
	}
}

// Validate enforces basic rules.
func (c *OnboardingChecklist) Validate() error {
	fields := map[string]string{}
	if c.EmployeeID == uuid.Nil {
		fields["employee_id"] = "required"
	}
	if c.StartDate.IsZero() {
		fields["start_date"] = "required"
	}
	if !c.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// TaskSpec is a single task definition inside a template.
type TaskSpec struct {
	Code          string
	TitleTR       string
	DescriptionTR string
	OwnerRole     OwnerRole
	DueDaysOffset int
}

// ExpandForChecklist materialises a task spec into a concrete task row.
func (s TaskSpec) ExpandForChecklist(checklist *OnboardingChecklist, order int) OnboardingTask {
	t := OnboardingTask{
		ID:            uuid.New(),
		ChecklistID:   checklist.ID,
		TaskCode:      s.Code,
		TaskTitleTR:   s.TitleTR,
		OwnerRole:     s.OwnerRole,
		DueDaysOffset: s.DueDaysOffset,
		DueAt:         checklist.StartDate.AddDate(0, 0, s.DueDaysOffset),
		Status:        TaskPending,
		OrderIndex:    order,
	}
	if d := strings.TrimSpace(s.DescriptionTR); d != "" {
		t.TaskDescription = &d
	}
	return t
}

// OnboardingTemplate bundles a named list of task specs.
type OnboardingTemplate struct {
	Name        string
	DisplayName string
	Tasks       []TaskSpec
}

// BuiltInTemplates returns the three shipped onboarding templates.
// Keys: "standard", "manager", "remote".
func BuiltInTemplates() map[string]OnboardingTemplate {
	standard := OnboardingTemplate{
		Name:        "standard",
		DisplayName: "Standart İşe Alım",
		Tasks: []TaskSpec{
			{Code: "offer_signed", TitleTR: "İş sözleşmesi imzalandı", OwnerRole: OwnerHR, DueDaysOffset: -1},
			{Code: "welcome_email", TitleTR: "Hoş geldin e-postası gönder", OwnerRole: OwnerHR, DueDaysOffset: -1},
			{Code: "it_accounts", TitleTR: "E-posta + SSO hesapları aç", OwnerRole: OwnerIT, DueDaysOffset: -1},
			{Code: "it_laptop", TitleTR: "Bilgisayar ve donanım teslimatı", OwnerRole: OwnerIT, DueDaysOffset: 0},
			{Code: "office_tour", TitleTR: "Ofis turu ve yerleşim", OwnerRole: OwnerHR, DueDaysOffset: 0},
			{Code: "intro_meeting", TitleTR: "Yönetici ile ilk toplantı", OwnerRole: OwnerManager, DueDaysOffset: 0},
			{Code: "handbook_read", TitleTR: "Çalışan el kitabını oku", OwnerRole: OwnerEmployee, DueDaysOffset: 3},
			{Code: "security_training", TitleTR: "KVKK + bilgi güvenliği eğitimi", OwnerRole: OwnerEmployee, DueDaysOffset: 5},
			{Code: "bank_info", TitleTR: "IBAN ve SGK bilgileri", OwnerRole: OwnerEmployee, DueDaysOffset: 3},
			{Code: "sgk_registration", TitleTR: "SGK işe giriş bildirgesi", OwnerRole: OwnerHR, DueDaysOffset: 0},
			{Code: "buddy_assigned", TitleTR: "Buddy programı eşleşmesi", OwnerRole: OwnerHR, DueDaysOffset: 1},
			{Code: "team_intro", TitleTR: "Takım tanışma toplantısı", OwnerRole: OwnerManager, DueDaysOffset: 3},
			{Code: "thirty_day_checkin", TitleTR: "30. gün değerlendirme görüşmesi", OwnerRole: OwnerManager, DueDaysOffset: 30},
			{Code: "ninety_day_review", TitleTR: "90. gün performans görüşmesi", OwnerRole: OwnerManager, DueDaysOffset: 90},
		},
	}
	manager := OnboardingTemplate{
		Name:        "manager",
		DisplayName: "Yönetici İşe Alım",
		Tasks: append(append([]TaskSpec{}, standard.Tasks...),
			TaskSpec{Code: "org_briefing", TitleTR: "Organizasyon yapısı brifingi", OwnerRole: OwnerHR, DueDaysOffset: 1},
			TaskSpec{Code: "team_1on1s", TitleTR: "Tüm ekiple birebir görüşmeler", OwnerRole: OwnerManager, DueDaysOffset: 14},
			TaskSpec{Code: "budget_access", TitleTR: "Bütçe + harcama yetkileri", OwnerRole: OwnerFinance, DueDaysOffset: 3},
			TaskSpec{Code: "kpi_review", TitleTR: "Takım KPI ve hedeflerini incele", OwnerRole: OwnerManager, DueDaysOffset: 7},
			TaskSpec{Code: "strategy_alignment", TitleTR: "Şirket stratejisi alignment", OwnerRole: OwnerManager, DueDaysOffset: 10},
		),
	}
	remote := OnboardingTemplate{
		Name:        "remote",
		DisplayName: "Uzaktan İşe Alım",
		Tasks: []TaskSpec{
			{Code: "offer_signed", TitleTR: "İş sözleşmesi imzalandı", OwnerRole: OwnerHR, DueDaysOffset: -1},
			{Code: "equipment_ship", TitleTR: "Ekipman (laptop, kulaklık) kargo", OwnerRole: OwnerIT, DueDaysOffset: -5},
			{Code: "equipment_received", TitleTR: "Ekipman teslim alındı", OwnerRole: OwnerEmployee, DueDaysOffset: -1},
			{Code: "it_accounts", TitleTR: "E-posta + SSO + VPN hesapları", OwnerRole: OwnerIT, DueDaysOffset: -1},
			{Code: "virtual_welcome", TitleTR: "Sanal hoş geldin toplantısı", OwnerRole: OwnerManager, DueDaysOffset: 0},
			{Code: "remote_tools", TitleTR: "Remote araç kurulumu (Slack, Zoom, Notion)", OwnerRole: OwnerEmployee, DueDaysOffset: 0},
			{Code: "security_training", TitleTR: "KVKK + bilgi güvenliği eğitimi", OwnerRole: OwnerEmployee, DueDaysOffset: 3},
			{Code: "bank_info", TitleTR: "IBAN ve SGK bilgileri", OwnerRole: OwnerEmployee, DueDaysOffset: 2},
			{Code: "sgk_registration", TitleTR: "SGK işe giriş bildirgesi", OwnerRole: OwnerHR, DueDaysOffset: 0},
			{Code: "buddy_video_call", TitleTR: "Buddy ile video ile tanışma", OwnerRole: OwnerEmployee, DueDaysOffset: 1},
			{Code: "async_intro", TitleTR: "Takım kanalına tanıtım yazısı", OwnerRole: OwnerEmployee, DueDaysOffset: 2},
			{Code: "thirty_day_checkin", TitleTR: "30. gün değerlendirme görüşmesi", OwnerRole: OwnerManager, DueDaysOffset: 30},
			{Code: "ninety_day_review", TitleTR: "90. gün performans görüşmesi", OwnerRole: OwnerManager, DueDaysOffset: 90},
		},
	}
	return map[string]OnboardingTemplate{
		standard.Name: standard,
		manager.Name:  manager,
		remote.Name:   remote,
	}
}

// ResolveTemplate returns a template by name, or ErrUnknownTemplate.
func ResolveTemplate(name string) (OnboardingTemplate, error) {
	if name == "" {
		name = "standard"
	}
	tpl, ok := BuiltInTemplates()[strings.ToLower(strings.TrimSpace(name))]
	if !ok {
		return OnboardingTemplate{}, ErrUnknownTemplate
	}
	return tpl, nil
}

// ComputeCompletionPct returns the integer percent of non-cancelled tasks
// that are completed. Cancelled tasks are excluded from the denominator so
// skipping an irrelevant task doesn't depress the score.
func ComputeCompletionPct(tasks []OnboardingTask) int {
	total := 0
	done := 0
	for _, t := range tasks {
		if t.Status == TaskCancelled {
			continue
		}
		total++
		if t.Status == TaskCompleted {
			done++
		}
	}
	if total == 0 {
		return 0
	}
	return (done * 100) / total
}
