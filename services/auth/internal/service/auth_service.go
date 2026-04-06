package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/upcore/auth/internal/domain"
)

// UserRepository abstracts user persistence for the service layer.
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByClerkID(ctx context.Context, clerkID string) (*domain.User, error)
	GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.User, error)
	Create(ctx context.Context, u *domain.User) error
	Update(ctx context.Context, u *domain.User) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// RoleRepository abstracts role persistence.
type RoleRepository interface {
	GetByName(ctx context.Context, tenantID uuid.UUID, name string) (*domain.Role, error)
	AssignToUser(ctx context.Context, userID, roleID, tenantID, grantedBy uuid.UUID) error
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*domain.Role, error)
}

// SessionRevoker abstracts the session repo for revocation propagation.
type SessionRevoker interface {
	RevokeAllForUser(ctx context.Context, userID uuid.UUID, reason string) (int64, error)
}

// EventPublisher emits domain events to Service Bus.
type EventPublisher interface {
	Publish(ctx context.Context, topic string, payload any) error
}

// AuthService is the core orchestrator for user lifecycle & session work.
type AuthService struct {
	users    UserRepository
	roles    RoleRepository
	sessions SessionRevoker
	pub      EventPublisher
}

// NewAuthService constructs an AuthService.
func NewAuthService(users UserRepository, roles RoleRepository, sessions SessionRevoker, pub EventPublisher) *AuthService {
	return &AuthService{users: users, roles: roles, sessions: sessions, pub: pub}
}

// UpsertFromClerk creates or updates a user from a Clerk webhook.
func (s *AuthService) UpsertFromClerk(
	ctx context.Context,
	clerkID string,
	tenantID uuid.UUID,
	email, firstName, lastName, locale string,
	metadata json.RawMessage,
) (*domain.User, error) {
	existing, err := s.users.GetByClerkID(ctx, clerkID)
	switch {
	case errors.Is(err, domain.ErrUserNotFound):
		// create
		u := &domain.User{
			ID:        uuid.New(),
			ClerkID:   clerkID,
			TenantID:  tenantID,
			Email:     email,
			FirstName: firstName,
			LastName:  lastName,
			Locale:    locale,
			Status:    domain.UserStatusActive,
			Metadata:  metadata,
		}
		if err := s.users.Create(ctx, u); err != nil {
			return nil, err
		}
		if err := s.assignDefaultRole(ctx, u); err != nil {
			log.Warn().Err(err).Str("user_id", u.ID.String()).Msg("default role assignment failed")
		}
		s.publishSafe(ctx, "auth.user.created.v1", map[string]any{
			"user_id":    u.ID,
			"clerk_id":   u.ClerkID,
			"tenant_id":  u.TenantID,
			"email":      u.Email,
			"first_name": u.FirstName,
			"last_name":  u.LastName,
			"created_at": u.CreatedAt,
		})
		return u, nil
	case err != nil:
		return nil, err
	}

	// update
	existing.Email = email
	existing.FirstName = firstName
	existing.LastName = lastName
	if locale != "" {
		existing.Locale = locale
	}
	existing.Metadata = metadata
	if err := s.users.Update(ctx, existing); err != nil {
		return nil, err
	}
	s.publishSafe(ctx, "auth.user.updated.v1", map[string]any{
		"user_id":    existing.ID,
		"tenant_id":  existing.TenantID,
		"updated_at": existing.UpdatedAt,
	})
	return existing, nil
}

// DeleteByClerkID soft-deletes a user.
func (s *AuthService) DeleteByClerkID(ctx context.Context, clerkID string) error {
	u, err := s.users.GetByClerkID(ctx, clerkID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil // idempotent
		}
		return err
	}
	if err := s.users.SoftDelete(ctx, u.ID); err != nil {
		return err
	}
	if s.sessions != nil {
		if _, err := s.sessions.RevokeAllForUser(ctx, u.ID, "user_deleted"); err != nil {
			log.Warn().Err(err).Msg("session revocation on delete failed")
		}
	}
	s.publishSafe(ctx, "auth.user.deleted.v1", map[string]any{
		"user_id":   u.ID,
		"tenant_id": u.TenantID,
	})
	return nil
}

// HandleSessionRevoked is called when Clerk revokes a session.
func (s *AuthService) HandleSessionRevoked(ctx context.Context, clerkSessionID, clerkUserID string) error {
	if clerkUserID == "" {
		return nil
	}
	u, err := s.users.GetByClerkID(ctx, clerkUserID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil
		}
		return err
	}
	if s.sessions != nil {
		if _, err := s.sessions.RevokeAllForUser(ctx, u.ID, "clerk_session_revoked"); err != nil {
			return err
		}
	}
	s.publishSafe(ctx, "auth.session.revoked.v1", map[string]any{
		"clerk_session_id": clerkSessionID,
		"user_id":          u.ID,
		"tenant_id":        u.TenantID,
	})
	return nil
}

// GetProfile returns a user plus assigned roles.
func (s *AuthService) GetProfile(ctx context.Context, userID uuid.UUID) (*UserProfile, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	roles, err := s.roles.GetUserRoles(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(roles))
	for _, r := range roles {
		names = append(names, r.Name)
	}
	return &UserProfile{User: u, Roles: names}, nil
}

// GetByClerkID passthrough.
func (s *AuthService) GetByClerkID(ctx context.Context, clerkID string) (*domain.User, error) {
	return s.users.GetByClerkID(ctx, clerkID)
}

// UserProfile is a composed read model.
type UserProfile struct {
	User  *domain.User `json:"user"`
	Roles []string     `json:"roles"`
}

func (s *AuthService) assignDefaultRole(ctx context.Context, u *domain.User) error {
	role, err := s.roles.GetByName(ctx, u.TenantID, domain.RoleEmployee)
	if err != nil {
		return fmt.Errorf("lookup default role: %w", err)
	}
	return s.roles.AssignToUser(ctx, u.ID, role.ID, u.TenantID, uuid.Nil)
}

func (s *AuthService) publishSafe(ctx context.Context, topic string, payload any) {
	if s.pub == nil {
		return
	}
	if err := s.pub.Publish(ctx, topic, payload); err != nil {
		log.Warn().Err(err).Str("topic", topic).Msg("event publish failed")
	}
}
