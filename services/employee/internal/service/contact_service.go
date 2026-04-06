package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/repository"
)

// ContactService manages emergency contacts.
type ContactService struct {
	employees repository.EmployeeRepository
	contacts  repository.ContactRepository
}

// NewContactService constructs a ContactService.
func NewContactService(employees repository.EmployeeRepository, contacts repository.ContactRepository) *ContactService {
	return &ContactService{employees: employees, contacts: contacts}
}

// ContactRequest holds fields accepted by Create/Update.
type ContactRequest struct {
	ContactType    string `json:"contact_type"`
	FullName       string `json:"full_name"`
	Relationship   string `json:"relationship,omitempty"`
	PhonePrimary   string `json:"phone_primary"`
	PhoneSecondary string `json:"phone_secondary,omitempty"`
	Email          string `json:"email,omitempty"`
	Address        string `json:"address,omitempty"`
	Notes          string `json:"notes,omitempty"`
	IsPrimary      bool   `json:"is_primary,omitempty"`
}

// Create persists a new contact after validating fields.
func (s *ContactService) Create(ctx context.Context, tenantID, employeeID uuid.UUID, req ContactRequest) (*domain.EmergencyContact, error) {
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	c := mapContactRequest(tenantID, employeeID, req)
	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.contacts.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// List returns all contacts for an employee.
func (s *ContactService) List(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.EmergencyContact, error) {
	if _, err := s.employees.GetByID(ctx, tenantID, employeeID); err != nil {
		return nil, err
	}
	return s.contacts.ListByEmployee(ctx, employeeID)
}

// Update modifies a contact, enforcing that it belongs to the employee.
func (s *ContactService) Update(ctx context.Context, tenantID, employeeID, contactID uuid.UUID, req ContactRequest) (*domain.EmergencyContact, error) {
	existing, err := s.contacts.GetByID(ctx, contactID)
	if err != nil {
		return nil, err
	}
	if existing.TenantID != tenantID || existing.EmployeeID != employeeID {
		return nil, domain.ErrContactNotFound
	}
	applyContactUpdates(existing, req)
	if err := existing.Validate(); err != nil {
		return nil, err
	}
	if err := s.contacts.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// Delete soft-deletes a contact.
func (s *ContactService) Delete(ctx context.Context, tenantID, employeeID, contactID uuid.UUID) error {
	existing, err := s.contacts.GetByID(ctx, contactID)
	if err != nil {
		return err
	}
	if existing.TenantID != tenantID || existing.EmployeeID != employeeID {
		return domain.ErrContactNotFound
	}
	return s.contacts.SoftDelete(ctx, contactID)
}

func mapContactRequest(tenantID, employeeID uuid.UUID, req ContactRequest) *domain.EmergencyContact {
	c := &domain.EmergencyContact{
		TenantID:     tenantID,
		EmployeeID:   employeeID,
		ContactType:  domain.ContactType(strings.TrimSpace(req.ContactType)),
		FullName:     strings.TrimSpace(req.FullName),
		PhonePrimary: strings.TrimSpace(req.PhonePrimary),
		IsPrimary:    req.IsPrimary,
	}
	if v := strings.TrimSpace(req.Relationship); v != "" {
		c.Relationship = &v
	}
	if v := strings.TrimSpace(req.PhoneSecondary); v != "" {
		c.PhoneSecondary = &v
	}
	if v := strings.TrimSpace(req.Email); v != "" {
		e := strings.ToLower(v)
		c.Email = &e
	}
	if v := strings.TrimSpace(req.Address); v != "" {
		c.Address = &v
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		c.Notes = &v
	}
	c.ApplyDefaults()
	return c
}

func applyContactUpdates(c *domain.EmergencyContact, req ContactRequest) {
	if v := strings.TrimSpace(req.ContactType); v != "" {
		c.ContactType = domain.ContactType(v)
	}
	if v := strings.TrimSpace(req.FullName); v != "" {
		c.FullName = v
	}
	if v := strings.TrimSpace(req.Relationship); v != "" {
		c.Relationship = &v
	}
	if v := strings.TrimSpace(req.PhonePrimary); v != "" {
		c.PhonePrimary = v
	}
	if v := strings.TrimSpace(req.PhoneSecondary); v != "" {
		c.PhoneSecondary = &v
	} else if req.PhoneSecondary == "" {
		c.PhoneSecondary = nil
	}
	if v := strings.TrimSpace(req.Email); v != "" {
		e := strings.ToLower(v)
		c.Email = &e
	} else if req.Email == "" {
		c.Email = nil
	}
	if v := strings.TrimSpace(req.Address); v != "" {
		c.Address = &v
	}
	if v := strings.TrimSpace(req.Notes); v != "" {
		c.Notes = &v
	}
	c.IsPrimary = req.IsPrimary
}
