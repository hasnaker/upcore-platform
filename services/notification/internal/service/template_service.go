package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// RenderedTemplate holds the output of rendering a template.
type RenderedTemplate struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// TemplateService contains the business logic for notification templates.
type TemplateService struct {
	repo     repository.TemplateRepository
	renderer *Renderer
	log      zerolog.Logger
}

// NewTemplateService constructs a TemplateService.
func NewTemplateService(repo repository.TemplateRepository, renderer *Renderer, log zerolog.Logger) *TemplateService {
	return &TemplateService{repo: repo, renderer: renderer, log: log}
}

// Create creates a new template.
func (s *TemplateService) Create(ctx context.Context, t *domain.Template) error {
	if err := t.Validate(); err != nil {
		return err
	}
	return s.repo.Create(ctx, t)
}

// GetByID retrieves a template by ID.
func (s *TemplateService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Template, error) {
	return s.repo.GetByID(ctx, id)
}

// GetByCode retrieves a template by code and locale with system fallback.
func (s *TemplateService) GetByCode(ctx context.Context, tenantID *uuid.UUID, code, locale string) (*domain.Template, error) {
	return s.repo.GetByCode(ctx, tenantID, code, locale)
}

// Update modifies an existing template.
func (s *TemplateService) Update(ctx context.Context, t *domain.Template) error {
	if err := t.Validate(); err != nil {
		return err
	}
	return s.repo.Update(ctx, t)
}

// List returns a paginated, filtered list of templates.
func (s *TemplateService) List(ctx context.Context, tenantID *uuid.UUID, channel, locale string, activeOnly bool, page, limit int) ([]*domain.Template, int, error) {
	return s.repo.List(ctx, tenantID, channel, locale, activeOnly, page, limit)
}

// Activate enables a template.
func (s *TemplateService) Activate(ctx context.Context, id uuid.UUID) error {
	return s.repo.Activate(ctx, id)
}

// Deactivate disables a template.
func (s *TemplateService) Deactivate(ctx context.Context, id uuid.UUID) error {
	return s.repo.Deactivate(ctx, id)
}

// Render looks up a template by code/locale, validates variables, and renders
// both subject and body.
func (s *TemplateService) Render(ctx context.Context, tenantID *uuid.UUID, code, locale string, vars map[string]any) (*RenderedTemplate, error) {
	tmpl, err := s.repo.GetByCode(ctx, tenantID, code, locale)
	if err != nil {
		return nil, err
	}

	// Validate expected variables.
	if err := s.renderer.ValidateVariables(tmpl.Variables, vars); err != nil {
		return nil, err
	}

	var subject string
	if tmpl.Subject != nil && *tmpl.Subject != "" {
		subject, err = s.renderer.Render(*tmpl.Subject, vars)
		if err != nil {
			return nil, err
		}
	}

	body, err := s.renderer.RenderHTML(tmpl.Body, vars)
	if err != nil {
		return nil, err
	}

	return &RenderedTemplate{Subject: subject, Body: body}, nil
}
