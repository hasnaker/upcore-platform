package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/upcore/auth/internal/domain"
)

// SessionRepository is the contract SessionService needs.
type SessionRepository interface {
	Create(ctx context.Context, s *domain.Session) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Session, error)
	GetByTokenHash(ctx context.Context, hash string) (*domain.Session, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*domain.Session, error)
	Revoke(ctx context.Context, id uuid.UUID, reason string) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID, reason string) (int64, error)
	DeleteExpired(ctx context.Context) (int64, error)
}

// SessionService manages refresh-token sessions.
type SessionService struct {
	repo       SessionRepository
	refreshTTL time.Duration
}

// NewSessionService constructs a SessionService.
func NewSessionService(repo SessionRepository, refreshTTL time.Duration) *SessionService {
	return &SessionService{repo: repo, refreshTTL: refreshTTL}
}

// Create generates a refresh token and persists the session. Returns the raw
// refresh token once (caller is responsible for delivering it to the client).
func (s *SessionService) Create(ctx context.Context, userID, tenantID uuid.UUID, userAgent, ip string) (*domain.Session, string, error) {
	token, hash, err := generateRefreshToken()
	if err != nil {
		return nil, "", err
	}
	sess := domain.NewSession(userID, tenantID, hash, userAgent, ip, s.refreshTTL)
	if err := s.repo.Create(ctx, sess); err != nil {
		return nil, "", err
	}
	return sess, token, nil
}

// Rotate exchanges a refresh token for a new one (revoking the old).
func (s *SessionService) Rotate(ctx context.Context, rawToken, userAgent, ip string) (*domain.Session, string, error) {
	hash := hashToken(rawToken)
	existing, err := s.repo.GetByTokenHash(ctx, hash)
	if err != nil {
		return nil, "", err
	}
	if !existing.IsValid() {
		if existing.RevokedAt != nil {
			return nil, "", domain.ErrSessionRevoked
		}
		return nil, "", domain.ErrSessionExpired
	}

	// Revoke old, issue new
	if err := s.repo.Revoke(ctx, existing.ID, "rotated"); err != nil {
		return nil, "", err
	}
	return s.Create(ctx, existing.UserID, existing.TenantID, userAgent, ip)
}

// List returns the user's active sessions.
func (s *SessionService) List(ctx context.Context, userID uuid.UUID) ([]*domain.Session, error) {
	return s.repo.ListByUser(ctx, userID)
}

// Revoke revokes a single session (must belong to user or be admin-invoked).
func (s *SessionService) Revoke(ctx context.Context, id uuid.UUID, reason string) error {
	return s.repo.Revoke(ctx, id, reason)
}

// RevokeAll revokes every session for a user.
func (s *SessionService) RevokeAll(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.RevokeAllForUser(ctx, userID, "user_logout_all")
}

// Current retrieves a specific session (used by /sessions/current).
func (s *SessionService) Current(ctx context.Context, sessionID uuid.UUID) (*domain.Session, error) {
	return s.repo.GetByID(ctx, sessionID)
}

func generateRefreshToken() (string, string, error) {
	raw := make([]byte, 48)
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	return token, hashToken(token), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
