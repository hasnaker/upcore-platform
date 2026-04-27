package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
)

// Lifecycle-related event topics.
const (
	TopicCareerEventRecorded  = "career.event.recorded.v1"
	TopicCompensationChanged  = "compensation.changed.v1"
	TopicOffboardingStarted   = "offboarding.started.v1"
	TopicOffboardingUpdated   = "offboarding.updated.v1"
	TopicExitInterviewSubmit  = "offboarding.exit_interview.submitted.v1"
)

// RoleGuard enforces role-based access control at the service layer.
// rolesAllowed is the set of role strings (from X-User-Role header) permitted.
type RoleGuard struct {
	rolesAllowed map[string]bool
}

// NewRoleGuard builds a guard. Example: NewRoleGuard("hr_director","cxo","admin").
func NewRoleGuard(roles ...string) RoleGuard {
	m := make(map[string]bool, len(roles))
	for _, r := range roles {
		m[strings.ToLower(strings.TrimSpace(r))] = true
	}
	return RoleGuard{rolesAllowed: m}
}

// Allow reports whether the provided role string is permitted.
func (g RoleGuard) Allow(role string) bool {
	if len(g.rolesAllowed) == 0 {
		return true
	}
	return g.rolesAllowed[strings.ToLower(strings.TrimSpace(role))]
}

// ============================================================================
// Career Service
// ============================================================================

// CareerService manages career-event timelines.
type CareerService struct {
	repo      repository.CareerRepository
	employees repository.EmployeeRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewCareerService constructs the service.
func NewCareerService(repo repository.CareerRepository, employees repository.EmployeeRepository, pub event.Publisher, log zerolog.Logger) *CareerService {
	return &CareerService{repo: repo, employees: employees, publisher: pub, log: log}
}

// CareerEventRequest is the body accepted by Append.
type CareerEventRequest struct {
	EventType     string                 `json:"event_type"`
	EffectiveDate string                 `json:"effective_date"`
	FromValue     map[string]any         `json:"from_value,omitempty"`
	ToValue       map[string]any         `json:"to_value,omitempty"`
	ReasonTR      string                 `json:"reason_tr,omitempty"`
	ApprovedBy    *uuid.UUID             `json:"approved_by,omitempty"`
	Metadata      map[string]any         `json:"metadata,omitempty"`
}

// Append records a new career event for an employee.
func (s *CareerService) Append(ctx context.Context, tenantID, employeeID uuid.UUID, req CareerEventRequest) (*domain.CareerEvent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	eff, err := parseAnyDate(req.EffectiveDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"effective_date": "invalid"})
	}
	e := &domain.CareerEvent{
		TenantID:      tenantID,
		EmployeeID:    employeeID,
		EventType:     domain.CareerEventType(strings.TrimSpace(req.EventType)),
		EffectiveDate: eff,
		FromValue:     marshalJSONB(req.FromValue),
		ToValue:       marshalJSONB(req.ToValue),
		Metadata:      marshalJSONB(req.Metadata),
	}
	if v := strings.TrimSpace(req.ReasonTR); v != "" {
		e.ReasonTR = &v
	}
	if req.ApprovedBy != nil {
		e.ApprovedBy = req.ApprovedBy
		now := time.Now().UTC()
		e.ApprovedAt = &now
	}
	e.ApplyDefaults()
	if err := e.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, e); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicCareerEventRecorded, e)
	return e, nil
}

// Timeline lists career events for an employee.
func (s *CareerService) Timeline(ctx context.Context, tenantID, employeeID uuid.UUID, page, limit int) ([]*domain.CareerEvent, int, error) {
	if tenantID == uuid.Nil {
		return nil, 0, domain.ErrUnauthorized
	}
	if limit <= 0 {
		limit = 100
	}
	if page < 0 {
		page = 0
	}
	return s.repo.List(ctx, tenantID, employeeID, limit, page*limit)
}

// RecordInternal is used by other services (offer acceptance, compensation
// change, termination) to append system-generated career events.
func (s *CareerService) RecordInternal(ctx context.Context, e *domain.CareerEvent) error {
	e.ApplyDefaults()
	if err := e.Validate(); err != nil {
		return err
	}
	if err := s.repo.Create(ctx, e); err != nil {
		return err
	}
	s.publish(ctx, TopicCareerEventRecorded, e)
	return nil
}

func (s *CareerService) publish(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish career event failed")
	}
}

// ============================================================================
// Compensation Service (role-gated)
// ============================================================================

// CompensationService manages salary/bonus history.
type CompensationService struct {
	repo      repository.CompensationRepository
	career    *CareerService
	employees repository.EmployeeRepository
	guard     RoleGuard
	publisher event.Publisher
	log       zerolog.Logger
}

// NewCompensationService constructs the service, gated to the given roles.
func NewCompensationService(
	repo repository.CompensationRepository,
	career *CareerService,
	employees repository.EmployeeRepository,
	guard RoleGuard,
	pub event.Publisher,
	log zerolog.Logger,
) *CompensationService {
	return &CompensationService{repo: repo, career: career, employees: employees, guard: guard, publisher: pub, log: log}
}

// CompensationRequest is the body accepted by Create.
type CompensationRequest struct {
	EffectiveDate    string     `json:"effective_date"`
	CompensationType string     `json:"compensation_type"`
	Amount           float64    `json:"amount"`
	Currency         string     `json:"currency,omitempty"`
	Frequency        string     `json:"frequency,omitempty"`
	ReasonTR         string     `json:"reason_tr,omitempty"`
	ApprovedBy       *uuid.UUID `json:"approved_by,omitempty"`
	IsActive         *bool      `json:"is_active,omitempty"`
}

// Create adds a compensation record. Caller role must be permitted.
func (s *CompensationService) Create(ctx context.Context, tenantID, employeeID uuid.UUID, role string, req CompensationRequest) (*domain.CompensationRecord, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if !s.guard.Allow(role) {
		return nil, domain.ErrForbidden
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	eff, err := parseAnyDate(req.EffectiveDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"effective_date": "invalid"})
	}
	c := &domain.CompensationRecord{
		TenantID:         tenantID,
		EmployeeID:       employeeID,
		EffectiveDate:    eff,
		CompensationType: domain.CompensationType(strings.TrimSpace(req.CompensationType)),
		Amount:           req.Amount,
		Currency:         strings.ToUpper(strings.TrimSpace(req.Currency)),
		Frequency:        domain.CompensationFrequency(strings.TrimSpace(req.Frequency)),
		IsActive:         true,
	}
	if req.IsActive != nil {
		c.IsActive = *req.IsActive
	}
	if v := strings.TrimSpace(req.ReasonTR); v != "" {
		c.ReasonTR = &v
	}
	if req.ApprovedBy != nil {
		c.ApprovedBy = req.ApprovedBy
		now := time.Now().UTC()
		c.ApprovedAt = &now
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicCompensationChanged, c)

	// Auto-append a career event for base_salary changes.
	if s.career != nil && c.CompensationType == domain.CompBaseSalary {
		payload := map[string]any{
			"amount":    c.Amount,
			"currency":  c.Currency,
			"frequency": string(c.Frequency),
		}
		_ = s.career.RecordInternal(ctx, &domain.CareerEvent{
			TenantID:      tenantID,
			EmployeeID:    employeeID,
			EventType:     domain.CareerCompensationChange,
			EffectiveDate: c.EffectiveDate,
			ToValue:       marshalJSONB(payload),
			ReasonTR:      c.ReasonTR,
			Metadata:      marshalJSONB(map[string]any{"source": "compensation_record", "record_id": c.ID}),
		})
	}
	return c, nil
}

// History lists compensation records for an employee (role-gated).
func (s *CompensationService) History(ctx context.Context, tenantID, employeeID uuid.UUID, role string, page, limit int) ([]*domain.CompensationRecord, int, error) {
	if tenantID == uuid.Nil {
		return nil, 0, domain.ErrUnauthorized
	}
	if !s.guard.Allow(role) {
		return nil, 0, domain.ErrForbidden
	}
	if limit <= 0 {
		limit = 100
	}
	if page < 0 {
		page = 0
	}
	return s.repo.List(ctx, tenantID, employeeID, limit, page*limit)
}

func (s *CompensationService) publish(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish compensation event failed")
	}
}

// ============================================================================
// Related Contact Service
// ============================================================================

// RelatedContactService manages app.related_contacts CRUD.
type RelatedContactService struct {
	repo      repository.RelatedContactRepository
	employees repository.EmployeeRepository
}

// NewRelatedContactService constructs the service.
func NewRelatedContactService(repo repository.RelatedContactRepository, employees repository.EmployeeRepository) *RelatedContactService {
	return &RelatedContactService{repo: repo, employees: employees}
}

// RelatedContactRequest is the body accepted by Create/Update.
type RelatedContactRequest struct {
	Kind      string `json:"kind"`
	FullName  string `json:"full_name"`
	Relation  string `json:"relation"`
	Phone     string `json:"phone,omitempty"`
	Email     string `json:"email,omitempty"`
	IsPrimary bool   `json:"is_primary,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

// Create persists a new related contact.
func (s *RelatedContactService) Create(ctx context.Context, tenantID, employeeID uuid.UUID, req RelatedContactRequest) (*domain.RelatedContact, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	c := &domain.RelatedContact{
		TenantID:   tenantID,
		EmployeeID: employeeID,
		Kind:       domain.ContactKind(strings.TrimSpace(req.Kind)),
		FullName:   strings.TrimSpace(req.FullName),
		Relation:   strings.TrimSpace(req.Relation),
		IsPrimary:  req.IsPrimary,
	}
	if v := strings.TrimSpace(req.Phone); v != "" {
		c.Phone = &v
	}
	if v := strings.TrimSpace(req.Email); v != "" {
		e := strings.ToLower(v)
		c.Email = &e
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		c.Notes = &v
	}
	c.ApplyDefaults()
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// Update applies changes to an existing contact.
func (s *RelatedContactService) Update(ctx context.Context, tenantID, id uuid.UUID, req RelatedContactRequest) (*domain.RelatedContact, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	c, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v := strings.TrimSpace(req.Kind); v != "" {
		c.Kind = domain.ContactKind(v)
	}
	if v := strings.TrimSpace(req.FullName); v != "" {
		c.FullName = v
	}
	if v := strings.TrimSpace(req.Relation); v != "" {
		c.Relation = v
	}
	if v := strings.TrimSpace(req.Phone); v != "" {
		c.Phone = &v
	} else if req.Phone == "" {
		c.Phone = nil
	}
	if v := strings.TrimSpace(req.Email); v != "" {
		e := strings.ToLower(v)
		c.Email = &e
	} else if req.Email == "" {
		c.Email = nil
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		c.Notes = &v
	}
	c.IsPrimary = req.IsPrimary
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// Delete removes a contact.
func (s *RelatedContactService) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	if tenantID == uuid.Nil {
		return domain.ErrUnauthorized
	}
	return s.repo.Delete(ctx, tenantID, id)
}

// List returns contacts filtered by optional kind.
func (s *RelatedContactService) List(ctx context.Context, tenantID, employeeID uuid.UUID, kind string) ([]*domain.RelatedContact, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.List(ctx, tenantID, employeeID, strings.TrimSpace(kind))
}

// ============================================================================
// Employee Position Service
// ============================================================================

// PositionService manages multi-FTE assignments.
type PositionService struct {
	repo      repository.PositionRepository
	employees repository.EmployeeRepository
}

// NewPositionService constructs the service.
func NewPositionService(repo repository.PositionRepository, employees repository.EmployeeRepository) *PositionService {
	return &PositionService{repo: repo, employees: employees}
}

// PositionRequest is the Create/Update body.
type PositionRequest struct {
	PositionID    uuid.UUID  `json:"position_id"`
	DepartmentID  *uuid.UUID `json:"department_id,omitempty"`
	FTEPercentage float64    `json:"fte_percentage"`
	IsPrimary     bool       `json:"is_primary"`
	StartDate     string     `json:"start_date"`
	EndDate       string     `json:"end_date,omitempty"`
}

// Create assigns a new position to an employee.
func (s *PositionService) Create(ctx context.Context, tenantID, employeeID uuid.UUID, req PositionRequest) (*domain.EmployeePosition, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	start, err := parseAnyDate(req.StartDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"start_date": "invalid"})
	}
	p := &domain.EmployeePosition{
		TenantID:      tenantID,
		EmployeeID:    employeeID,
		PositionID:    req.PositionID,
		DepartmentID:  req.DepartmentID,
		FTEPercentage: req.FTEPercentage,
		IsPrimary:     req.IsPrimary,
		StartDate:     start,
	}
	if req.EndDate != "" {
		end, err := parseAnyDate(req.EndDate)
		if err != nil {
			return nil, domain.NewValidationError(map[string]string{"end_date": "invalid"})
		}
		p.EndDate = &end
	}
	p.ApplyDefaults()
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// Update modifies an existing position.
func (s *PositionService) Update(ctx context.Context, tenantID, id uuid.UUID, req PositionRequest) (*domain.EmployeePosition, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	p, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if req.PositionID != uuid.Nil {
		p.PositionID = req.PositionID
	}
	if req.DepartmentID != nil {
		p.DepartmentID = req.DepartmentID
	}
	if req.FTEPercentage > 0 {
		p.FTEPercentage = req.FTEPercentage
	}
	p.IsPrimary = req.IsPrimary
	if req.StartDate != "" {
		if start, err := parseAnyDate(req.StartDate); err == nil {
			p.StartDate = start
		}
	}
	if req.EndDate != "" {
		if end, err := parseAnyDate(req.EndDate); err == nil {
			p.EndDate = &end
		}
	}
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// End sets an end_date for the position.
func (s *PositionService) End(ctx context.Context, tenantID, id uuid.UUID, endDate time.Time) error {
	if tenantID == uuid.Nil {
		return domain.ErrUnauthorized
	}
	return s.repo.End(ctx, tenantID, id, endDate)
}

// List returns assignments for an employee.
func (s *PositionService) List(ctx context.Context, tenantID, employeeID uuid.UUID, activeOnly bool) ([]*domain.EmployeePosition, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.List(ctx, tenantID, employeeID, activeOnly)
}

// ============================================================================
// Offboarding Service
// ============================================================================

// OffboardingService orchestrates the termination + exit interview flow.
type OffboardingService struct {
	repo      repository.OffboardingRepository
	employees repository.EmployeeRepository
	career    *CareerService
	publisher event.Publisher
	log       zerolog.Logger
}

// NewOffboardingService constructs the service.
func NewOffboardingService(
	repo repository.OffboardingRepository,
	employees repository.EmployeeRepository,
	career *CareerService,
	pub event.Publisher,
	log zerolog.Logger,
) *OffboardingService {
	return &OffboardingService{repo: repo, employees: employees, career: career, publisher: pub, log: log}
}

// OffboardingRequest is the Create/Update body.
type OffboardingRequest struct {
	DepartureType    string     `json:"departure_type"`
	NoticeDate       string     `json:"notice_date"`
	LastWorkingDay   string     `json:"last_working_day"`
	ITAccessRevoked  *bool      `json:"it_access_revoked,omitempty"`
	FinalPayDate     string     `json:"final_pay_date,omitempty"`
	HandoverComplete *bool      `json:"handover_complete,omitempty"`
	HandoverToID     *uuid.UUID `json:"handover_to_id,omitempty"`
	Notes            string     `json:"notes,omitempty"`
}

// Start creates a new offboarding event for an employee.
func (s *OffboardingService) Start(ctx context.Context, tenantID, employeeID uuid.UUID, req OffboardingRequest) (*domain.OffboardingEvent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	notice, err := parseAnyDate(req.NoticeDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"notice_date": "invalid"})
	}
	last, err := parseAnyDate(req.LastWorkingDay)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"last_working_day": "invalid"})
	}
	o := &domain.OffboardingEvent{
		TenantID:       tenantID,
		EmployeeID:     employeeID,
		DepartureType:  domain.DepartureType(strings.TrimSpace(req.DepartureType)),
		NoticeDate:     notice,
		LastWorkingDay: last,
	}
	if req.ITAccessRevoked != nil {
		o.ITAccessRevoked = *req.ITAccessRevoked
		if o.ITAccessRevoked {
			now := time.Now().UTC()
			o.ITRevokedAt = &now
		}
	}
	if req.FinalPayDate != "" {
		d, err := parseAnyDate(req.FinalPayDate)
		if err == nil {
			o.FinalPayDate = &d
		}
	}
	if req.HandoverComplete != nil {
		o.HandoverComplete = *req.HandoverComplete
	}
	o.HandoverToID = req.HandoverToID
	if v := strings.TrimSpace(req.Notes); v != "" {
		o.Notes = &v
	}
	o.ApplyDefaults()
	if err := o.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.CreateOffboarding(ctx, o); err != nil {
		return nil, err
	}

	if s.career != nil {
		evType := domain.CareerTermination
		if o.DepartureType == domain.DepRetirement {
			evType = domain.CareerRetire
		}
		_ = s.career.RecordInternal(ctx, &domain.CareerEvent{
			TenantID:      tenantID,
			EmployeeID:    employeeID,
			EventType:     evType,
			EffectiveDate: last,
			Metadata:      marshalJSONB(map[string]any{"departure_type": string(o.DepartureType)}),
			ReasonTR:      o.Notes,
		})
	}

	s.publish(ctx, TopicOffboardingStarted, o)
	return o, nil
}

// Update modifies checkboxes (it revoked, handover done, etc.).
func (s *OffboardingService) Update(ctx context.Context, tenantID, id uuid.UUID, req OffboardingRequest) (*domain.OffboardingEvent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	o, err := s.repo.GetOffboardingByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if v := strings.TrimSpace(req.DepartureType); v != "" {
		o.DepartureType = domain.DepartureType(v)
	}
	if req.NoticeDate != "" {
		if d, err := parseAnyDate(req.NoticeDate); err == nil {
			o.NoticeDate = d
		}
	}
	if req.LastWorkingDay != "" {
		if d, err := parseAnyDate(req.LastWorkingDay); err == nil {
			o.LastWorkingDay = d
		}
	}
	if req.ITAccessRevoked != nil {
		if *req.ITAccessRevoked && !o.ITAccessRevoked {
			now := time.Now().UTC()
			o.ITRevokedAt = &now
		}
		o.ITAccessRevoked = *req.ITAccessRevoked
	}
	if req.FinalPayDate != "" {
		if d, err := parseAnyDate(req.FinalPayDate); err == nil {
			o.FinalPayDate = &d
		}
	}
	if req.HandoverComplete != nil {
		o.HandoverComplete = *req.HandoverComplete
	}
	if req.HandoverToID != nil {
		o.HandoverToID = req.HandoverToID
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		o.Notes = &v
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.UpdateOffboarding(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOffboardingUpdated, o)
	return o, nil
}

// GetForEmployee returns the offboarding record for an employee (if any).
func (s *OffboardingService) GetForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OffboardingEvent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.GetOffboardingByEmployee(ctx, tenantID, employeeID)
}

// Get returns an offboarding event by ID.
func (s *OffboardingService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.OffboardingEvent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.GetOffboardingByID(ctx, tenantID, id)
}

// ExitInterviewRequest is the submit body.
type ExitInterviewRequest struct {
	SatisfactionScore *int       `json:"satisfaction_score,omitempty"`
	WouldReturn       *bool      `json:"would_return,omitempty"`
	WouldRecommend    *bool      `json:"would_recommend,omitempty"`
	PrimaryReasonCode string     `json:"primary_reason_code,omitempty"`
	DepartureNote     string     `json:"departure_note,omitempty"`
	HRSummary         string     `json:"hr_summary,omitempty"`
	InterviewDate     string     `json:"interview_date,omitempty"`
	InterviewerID     *uuid.UUID `json:"interviewer_id,omitempty"`
	IsAnonymous       bool       `json:"is_anonymous,omitempty"`
}

// SubmitExitInterview records the interview and marks the offboarding done.
func (s *OffboardingService) SubmitExitInterview(ctx context.Context, tenantID, offboardingID uuid.UUID, req ExitInterviewRequest) (*domain.ExitInterview, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	if _, err := s.repo.GetOffboardingByID(ctx, tenantID, offboardingID); err != nil {
		return nil, err
	}
	i := &domain.ExitInterview{
		TenantID:          tenantID,
		OffboardingID:     offboardingID,
		SatisfactionScore: req.SatisfactionScore,
		WouldReturn:       req.WouldReturn,
		WouldRecommend:    req.WouldRecommend,
		InterviewerID:     req.InterviewerID,
		IsAnonymous:       req.IsAnonymous,
	}
	if v := strings.TrimSpace(req.PrimaryReasonCode); v != "" {
		i.PrimaryReasonCode = &v
	}
	if v := strings.TrimSpace(req.DepartureNote); v != "" {
		i.DepartureNote = &v
	}
	if v := strings.TrimSpace(req.HRSummary); v != "" {
		i.HRSummary = &v
	}
	if req.InterviewDate != "" {
		if d, err := parseAnyDate(req.InterviewDate); err == nil {
			i.InterviewDate = &d
		}
	}
	i.ApplyDefaults()
	if err := i.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.CreateExitInterview(ctx, i); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicExitInterviewSubmit, i)
	return i, nil
}

// GetExitInterview returns the recorded interview for an offboarding event.
func (s *OffboardingService) GetExitInterview(ctx context.Context, tenantID, offboardingID uuid.UUID) (*domain.ExitInterview, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.repo.GetExitInterview(ctx, tenantID, offboardingID)
}

func (s *OffboardingService) publish(ctx context.Context, topic string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish offboarding event failed")
	}
}

// ============================================================================
// helpers
// ============================================================================

func parseAnyDate(s string) (time.Time, error) {
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

func marshalJSONB(v map[string]any) domain.JSONB {
	if v == nil {
		return domain.JSONB("{}")
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return domain.JSONB("{}")
	}
	return domain.JSONB(raw)
}
