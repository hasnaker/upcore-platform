// Package service implements the business-logic layer of the employee service.
package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
	"github.com/upcore/employee/internal/validator"
)

// CreateEmployeeRequest is the payload accepted by EmployeeService.Create.
type CreateEmployeeRequest struct {
	EmployeeNo       string     `json:"employee_no"`
	ExternalID       string     `json:"external_id,omitempty"`
	TCKN             string     `json:"tckn,omitempty"`
	Ad               string     `json:"ad"`
	Soyad            string     `json:"soyad"`
	DogumTarihi      string     `json:"dogum_tarihi,omitempty"`
	Cinsiyet         string     `json:"cinsiyet,omitempty"`
	MedeniHali       string     `json:"medeni_hali,omitempty"`
	EmailIs          string     `json:"email_is,omitempty"`
	EmailKisisel     string     `json:"email_kisisel,omitempty"`
	TelefonIs        string     `json:"telefon_is,omitempty"`
	TelefonKisisel   string     `json:"telefon_kisisel,omitempty"`
	Adres            string     `json:"adres,omitempty"`
	Sehir            string     `json:"sehir,omitempty"`
	PostaKodu        string     `json:"posta_kodu,omitempty"`
	DepartmentID     *uuid.UUID `json:"department_id,omitempty"`
	PositionID       *uuid.UUID `json:"position_id,omitempty"`
	ManagerID        *uuid.UUID `json:"manager_id,omitempty"`
	HireDate         string     `json:"hire_date"`
	ProbationEndDate string     `json:"probation_end_date,omitempty"`
	EmploymentStatus string     `json:"employment_status,omitempty"`
	EmploymentType   string     `json:"employment_type,omitempty"`
	WorkLocation     string     `json:"work_location,omitempty"`
	ContractType     string     `json:"contract_type,omitempty"`
	SalaryGross      *float64   `json:"salary_gross,omitempty"`
	SalaryNet        *float64   `json:"salary_net,omitempty"`
	SalaryCurrency   string     `json:"salary_currency,omitempty"`
	BankIBAN         string     `json:"bank_iban,omitempty"`
	SGKNo            string     `json:"sgk_no,omitempty"`
	Notes            string     `json:"notes,omitempty"`
}

// UpdateEmployeeRequest carries partial updates.
type UpdateEmployeeRequest struct {
	Ad               *string    `json:"ad,omitempty"`
	Soyad            *string    `json:"soyad,omitempty"`
	TCKN             *string    `json:"tckn,omitempty"`
	EmailIs          *string    `json:"email_is,omitempty"`
	EmailKisisel     *string    `json:"email_kisisel,omitempty"`
	TelefonIs        *string    `json:"telefon_is,omitempty"`
	TelefonKisisel   *string    `json:"telefon_kisisel,omitempty"`
	DogumTarihi      *string    `json:"dogum_tarihi,omitempty"`
	Cinsiyet         *string    `json:"cinsiyet,omitempty"`
	MedeniHali       *string    `json:"medeni_hali,omitempty"`
	Adres            *string    `json:"adres,omitempty"`
	Sehir            *string    `json:"sehir,omitempty"`
	PostaKodu        *string    `json:"posta_kodu,omitempty"`
	DepartmentID     *uuid.UUID `json:"department_id,omitempty"`
	PositionID       *uuid.UUID `json:"position_id,omitempty"`
	ManagerID        *uuid.UUID `json:"manager_id,omitempty"`
	EmploymentStatus *string    `json:"employment_status,omitempty"`
	EmploymentType   *string    `json:"employment_type,omitempty"`
	WorkLocation     *string    `json:"work_location,omitempty"`
	ContractType     *string    `json:"contract_type,omitempty"`
	SalaryGross      *float64   `json:"salary_gross,omitempty"`
	SalaryNet        *float64   `json:"salary_net,omitempty"`
	SalaryCurrency   *string    `json:"salary_currency,omitempty"`
	BankIBAN         *string    `json:"bank_iban,omitempty"`
	SGKNo            *string    `json:"sgk_no,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

// TerminateRequest describes the termination of an employee.
type TerminateRequest struct {
	TerminationDate string `json:"termination_date"`
	Reason          string `json:"reason"`
}

// EmployeeService orchestrates CRUD operations with event emission.
type EmployeeService struct {
	employees repository.EmployeeRepository
	history   repository.HistoryRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewEmployeeService constructs the service.
func NewEmployeeService(
	employees repository.EmployeeRepository,
	history repository.HistoryRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *EmployeeService {
	return &EmployeeService{
		employees: employees,
		history:   history,
		publisher: publisher,
		log:       log,
	}
}

// Create validates and persists a new employee. Emits employee.created.v1.
func (s *EmployeeService) Create(ctx context.Context, tenantID, createdBy uuid.UUID, req CreateEmployeeRequest) (*domain.Employee, error) {
	in := validator.EmployeeInput{
		EmployeeNo:       req.EmployeeNo,
		TCKN:             req.TCKN,
		Ad:               req.Ad,
		Soyad:            req.Soyad,
		EmailIs:          req.EmailIs,
		TelefonIs:        req.TelefonIs,
		BankIBAN:         req.BankIBAN,
		HireDate:         req.HireDate,
		Gender:           req.Cinsiyet,
		MaritalStatus:    req.MedeniHali,
		EmploymentStatus: req.EmploymentStatus,
		EmploymentType:   req.EmploymentType,
		SalaryCurrency:   req.SalaryCurrency,
	}
	if err := validator.ValidateEmployeeInput(in); err != nil {
		return nil, err
	}
	hireDate, _ := time.Parse("2006-01-02", strings.TrimSpace(req.HireDate))

	// Auto-generate employee_no when missing.
	empNo := strings.TrimSpace(req.EmployeeNo)
	if empNo == "" {
		seq, err := s.employees.NextEmployeeNoSeq(ctx, tenantID)
		if err != nil {
			return nil, err
		}
		empNo = domain.GenerateEmployeeNo(seq)
	}

	e := &domain.Employee{
		TenantID:         tenantID,
		EmployeeNo:       empNo,
		Ad:               strings.TrimSpace(req.Ad),
		Soyad:            strings.TrimSpace(req.Soyad),
		HireDate:         hireDate,
		EmploymentStatus: domain.StatusActive,
		EmploymentType:   domain.TypeFullTime,
		SalaryCurrency:   "TRY",
	}
	applyOptionalFields(e, req)

	if err := s.employees.Create(ctx, nil, e); err != nil {
		return nil, err
	}

	// Append hire history (best-effort).
	hist := domain.NewHistoryEntry(tenantID, e.ID, domain.ChangeHire, hireDate)
	hist.NewDepartmentID = e.DepartmentID
	hist.NewPositionID = e.PositionID
	hist.NewManagerID = e.ManagerID
	hist.NewSalary = e.SalaryGross
	by := createdBy
	if by != uuid.Nil {
		hist.ApprovedBy = &by
	}
	if err := s.history.Append(ctx, nil, hist); err != nil {
		s.log.Warn().Err(err).Str("employee_id", e.ID.String()).Msg("append hire history failed")
	}

	s.publish(ctx, event.TopicEmployeeCreated, map[string]any{
		"employee_id":    e.ID,
		"tenant_id":      e.TenantID,
		"employee_no":    e.EmployeeNo,
		"email":          ptrOrEmpty(e.EmailIs),
		"first_name":     e.Ad,
		"last_name":      e.Soyad,
		"position_id":    e.PositionID,
		"department_id":  e.DepartmentID,
		"manager_id":     e.ManagerID,
		"hire_date":      e.HireDate,
		"created_at":     e.CreatedAt,
	})
	return e, nil
}

// Get fetches an employee by id.
func (s *EmployeeService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Employee, error) {
	return s.employees.GetByID(ctx, tenantID, id)
}

// GetByUserID fetches the employee attached to an auth user (self-service).
func (s *EmployeeService) GetByUserID(ctx context.Context, tenantID, userID uuid.UUID) (*domain.Employee, error) {
	return s.employees.GetByUserID(ctx, tenantID, userID)
}

// Update applies a partial update and emits employee.updated.v1.
func (s *EmployeeService) Update(ctx context.Context, tenantID, id uuid.UUID, req UpdateEmployeeRequest) (*domain.Employee, error) {
	e, err := s.employees.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	changes := map[string]any{}
	if req.Ad != nil {
		e.Ad = strings.TrimSpace(*req.Ad)
		changes["ad"] = e.Ad
	}
	if req.Soyad != nil {
		e.Soyad = strings.TrimSpace(*req.Soyad)
		changes["soyad"] = e.Soyad
	}
	if req.TCKN != nil {
		v := strings.TrimSpace(*req.TCKN)
		if v != "" && !validator.IsValidTCKN(v) {
			return nil, domain.ErrInvalidTCKN
		}
		if v == "" {
			e.TCKN = nil
		} else {
			e.TCKN = &v
		}
		changes["tckn"] = v
	}
	updatePtrString(req.EmailIs, &e.EmailIs, &changes, "email_is")
	updatePtrString(req.EmailKisisel, &e.EmailKisisel, &changes, "email_kisisel")
	updatePtrString(req.TelefonIs, &e.TelefonIs, &changes, "telefon_is")
	updatePtrString(req.TelefonKisisel, &e.TelefonKisisel, &changes, "telefon_kisisel")
	updatePtrString(req.Adres, &e.Adres, &changes, "adres")
	updatePtrString(req.Sehir, &e.Sehir, &changes, "sehir")
	updatePtrString(req.PostaKodu, &e.PostaKodu, &changes, "posta_kodu")
	updatePtrString(req.WorkLocation, &e.WorkLocation, &changes, "work_location")
	updatePtrString(req.ContractType, &e.ContractType, &changes, "contract_type")
	updatePtrString(req.BankIBAN, &e.BankIBAN, &changes, "bank_iban")
	updatePtrString(req.SGKNo, &e.SGKNo, &changes, "sgk_no")
	updatePtrString(req.Notes, &e.Notes, &changes, "notes")
	updatePtrString(req.Cinsiyet, &e.Cinsiyet, &changes, "cinsiyet")
	updatePtrString(req.MedeniHali, &e.MedeniHali, &changes, "medeni_hali")

	if req.DogumTarihi != nil {
		if strings.TrimSpace(*req.DogumTarihi) == "" {
			e.DogumTarihi = nil
		} else {
			d, err := time.Parse("2006-01-02", strings.TrimSpace(*req.DogumTarihi))
			if err != nil {
				return nil, domain.ErrInvalidDate
			}
			e.DogumTarihi = &d
		}
		changes["dogum_tarihi"] = req.DogumTarihi
	}
	if req.DepartmentID != nil {
		e.DepartmentID = req.DepartmentID
		changes["department_id"] = req.DepartmentID
	}
	if req.PositionID != nil {
		e.PositionID = req.PositionID
		changes["position_id"] = req.PositionID
	}
	if req.ManagerID != nil {
		if err := s.validateManagerAssignment(ctx, tenantID, e.ID, *req.ManagerID); err != nil {
			return nil, err
		}
		e.ManagerID = req.ManagerID
		changes["manager_id"] = req.ManagerID
	}
	if req.EmploymentStatus != nil {
		st := domain.EmploymentStatus(*req.EmploymentStatus)
		if !st.IsValid() {
			return nil, domain.ErrInvalidStatus
		}
		if st != e.EmploymentStatus && !domain.CanTransition(e.EmploymentStatus, st) {
			return nil, domain.ErrInvalidTransition
		}
		e.EmploymentStatus = st
		changes["employment_status"] = st
	}
	if req.EmploymentType != nil {
		t := domain.EmploymentType(*req.EmploymentType)
		if !t.IsValid() {
			return nil, domain.ErrInvalidType
		}
		e.EmploymentType = t
		changes["employment_type"] = t
	}
	if req.SalaryGross != nil {
		e.SalaryGross = req.SalaryGross
		changes["salary_gross"] = *req.SalaryGross
	}
	if req.SalaryNet != nil {
		e.SalaryNet = req.SalaryNet
		changes["salary_net"] = *req.SalaryNet
	}
	if req.SalaryCurrency != nil {
		e.SalaryCurrency = strings.ToUpper(*req.SalaryCurrency)
		changes["salary_currency"] = e.SalaryCurrency
	}

	if err := s.employees.Update(ctx, e); err != nil {
		return nil, err
	}
	s.publish(ctx, event.TopicEmployeeUpdated, map[string]any{
		"employee_id": e.ID,
		"tenant_id":   e.TenantID,
		"changes":     changes,
		"updated_at":  e.UpdatedAt,
	})
	return e, nil
}

// Terminate marks an employee as terminated, appends history and emits event.
func (s *EmployeeService) Terminate(ctx context.Context, tenantID, id uuid.UUID, by uuid.UUID, req TerminateRequest) (*domain.Employee, error) {
	e, err := s.employees.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if e.IsTerminated() {
		return nil, domain.ErrAlreadyTerminated
	}
	td, err := time.Parse("2006-01-02", strings.TrimSpace(req.TerminationDate))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}
	if td.Before(e.HireDate) {
		return nil, domain.ErrTerminationDate
	}
	reason := strings.TrimSpace(req.Reason)
	if reason != "" && !domain.TerminationReason(reason).IsValid() {
		return nil, domain.NewValidationError(map[string]string{"reason": "invalid"})
	}
	e.TerminationDate = &td
	if reason != "" {
		e.TerminationReason = &reason
	}
	e.EmploymentStatus = domain.StatusTerminated
	if err := s.employees.Update(ctx, e); err != nil {
		return nil, err
	}
	hist := domain.NewHistoryEntry(tenantID, e.ID, domain.ChangeTermination, td)
	if reason != "" {
		hist.Reason = &reason
	}
	if by != uuid.Nil {
		bid := by
		hist.ApprovedBy = &bid
	}
	if err := s.history.Append(ctx, nil, hist); err != nil {
		s.log.Warn().Err(err).Msg("append termination history failed")
	}
	s.publish(ctx, event.TopicEmployeeTerminated, map[string]any{
		"employee_id":      e.ID,
		"tenant_id":        e.TenantID,
		"termination_date": td,
		"reason":           reason,
		"terminated_at":    time.Now().UTC(),
	})
	return e, nil
}

// Reinstate returns a terminated employee to active status.
func (s *EmployeeService) Reinstate(ctx context.Context, tenantID, id uuid.UUID) (*domain.Employee, error) {
	e, err := s.employees.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !domain.CanTransition(e.EmploymentStatus, domain.StatusActive) {
		return nil, domain.ErrInvalidTransition
	}
	e.EmploymentStatus = domain.StatusActive
	e.TerminationDate = nil
	e.TerminationReason = nil
	if err := s.employees.Update(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

// Delete soft-deletes the employee and emits employee.deleted.v1.
func (s *EmployeeService) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	if err := s.employees.SoftDelete(ctx, tenantID, id); err != nil {
		return err
	}
	s.publish(ctx, event.TopicEmployeeDeleted, map[string]any{
		"employee_id": id,
		"tenant_id":   tenantID,
		"deleted_at":  time.Now().UTC(),
	})
	return nil
}

// List returns a page of employees using the given filter.
func (s *EmployeeService) List(ctx context.Context, filter repository.ListFilter) ([]*domain.Employee, int, error) {
	return s.employees.List(ctx, filter)
}

// ----- helpers ---------------------------------------------------------------

func (s *EmployeeService) validateManagerAssignment(ctx context.Context, tenantID, employeeID, managerID uuid.UUID) error {
	if managerID == employeeID {
		return domain.ErrManagerCycle
	}
	// Ensure the manager exists in the same tenant.
	if _, err := s.employees.GetByID(ctx, tenantID, managerID); err != nil {
		return domain.ErrManagerNotFound
	}
	// Walk the chain to detect cycles (bounded depth).
	cur := managerID
	for i := 0; i < 64; i++ {
		m, err := s.employees.GetByID(ctx, tenantID, cur)
		if err != nil {
			return nil
		}
		if m.ManagerID == nil {
			return nil
		}
		if *m.ManagerID == employeeID {
			return domain.ErrManagerCycle
		}
		cur = *m.ManagerID
	}
	return fmt.Errorf("manager chain too deep")
}

func (s *EmployeeService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}

func applyOptionalFields(e *domain.Employee, req CreateEmployeeRequest) {
	if v := strings.TrimSpace(req.ExternalID); v != "" {
		e.ExternalID = &v
	}
	if v := strings.TrimSpace(req.TCKN); v != "" {
		e.TCKN = &v
	}
	if v := strings.TrimSpace(req.DogumTarihi); v != "" {
		if d, err := time.Parse("2006-01-02", v); err == nil {
			e.DogumTarihi = &d
		}
	}
	if v := strings.TrimSpace(req.Cinsiyet); v != "" {
		e.Cinsiyet = &v
	}
	if v := strings.TrimSpace(req.MedeniHali); v != "" {
		e.MedeniHali = &v
	}
	if v := validator.NormalizeEmail(req.EmailIs); v != "" {
		e.EmailIs = &v
	}
	if v := validator.NormalizeEmail(req.EmailKisisel); v != "" {
		e.EmailKisisel = &v
	}
	if v := strings.TrimSpace(req.TelefonIs); v != "" {
		e.TelefonIs = &v
	}
	if v := strings.TrimSpace(req.TelefonKisisel); v != "" {
		e.TelefonKisisel = &v
	}
	if v := strings.TrimSpace(req.Adres); v != "" {
		e.Adres = &v
	}
	if v := strings.TrimSpace(req.Sehir); v != "" {
		e.Sehir = &v
	}
	if v := strings.TrimSpace(req.PostaKodu); v != "" {
		e.PostaKodu = &v
	}
	if req.DepartmentID != nil {
		e.DepartmentID = req.DepartmentID
	}
	if req.PositionID != nil {
		e.PositionID = req.PositionID
	}
	if req.ManagerID != nil {
		e.ManagerID = req.ManagerID
	}
	if v := strings.TrimSpace(req.ProbationEndDate); v != "" {
		if d, err := time.Parse("2006-01-02", v); err == nil {
			e.ProbationEndDate = &d
		}
	}
	if v := strings.TrimSpace(req.EmploymentStatus); v != "" {
		e.EmploymentStatus = domain.EmploymentStatus(v)
	}
	if v := strings.TrimSpace(req.EmploymentType); v != "" {
		e.EmploymentType = domain.EmploymentType(v)
	}
	if v := strings.TrimSpace(req.WorkLocation); v != "" {
		e.WorkLocation = &v
	}
	if v := strings.TrimSpace(req.ContractType); v != "" {
		e.ContractType = &v
	}
	if req.SalaryGross != nil {
		e.SalaryGross = req.SalaryGross
	}
	if req.SalaryNet != nil {
		e.SalaryNet = req.SalaryNet
	}
	if v := strings.ToUpper(strings.TrimSpace(req.SalaryCurrency)); v != "" {
		e.SalaryCurrency = v
	}
	if v := validator.NormalizeIBAN(req.BankIBAN); v != "" {
		e.BankIBAN = &v
	}
	if v := strings.TrimSpace(req.SGKNo); v != "" {
		e.SGKNo = &v
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		e.Notes = &v
	}
}

func updatePtrString(src *string, dst **string, changes *map[string]any, key string) {
	if src == nil {
		return
	}
	v := strings.TrimSpace(*src)
	if v == "" {
		*dst = nil
	} else {
		*dst = &v
	}
	(*changes)[key] = v
}

func ptrOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
