package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
	"github.com/upcore/notification/internal/repository"
)

// InAppService contains the business logic for in-app notifications.
type InAppService struct {
	repo repository.InAppRepository
	log  zerolog.Logger
}

// NewInAppService constructs an InAppService.
func NewInAppService(repo repository.InAppRepository, log zerolog.Logger) *InAppService {
	return &InAppService{repo: repo, log: log}
}

// Create inserts a new in-app notification.
func (s *InAppService) Create(ctx context.Context, n *domain.InAppNotification) error {
	if err := n.Validate(); err != nil {
		return err
	}
	return s.repo.Create(ctx, n)
}

// List returns in-app notifications for a user.
func (s *InAppService) List(ctx context.Context, tenantID, userID uuid.UUID, unreadOnly bool, page, limit int) ([]*domain.InAppNotification, int, error) {
	return s.repo.ListByUser(ctx, tenantID, userID, unreadOnly, page, limit)
}

// MarkRead marks a single notification as read.
func (s *InAppService) MarkRead(ctx context.Context, tenantID, userID, id uuid.UUID) error {
	return s.repo.MarkRead(ctx, tenantID, userID, id)
}

// MarkAllRead marks all unread notifications for a user as read.
func (s *InAppService) MarkAllRead(ctx context.Context, tenantID, userID uuid.UUID) error {
	return s.repo.MarkAllRead(ctx, tenantID, userID)
}

// CountUnread returns the number of unread notifications.
func (s *InAppService) CountUnread(ctx context.Context, tenantID, userID uuid.UUID) (int, error) {
	return s.repo.CountUnread(ctx, tenantID, userID)
}

// Delete removes a single in-app notification.
func (s *InAppService) Delete(ctx context.Context, tenantID, userID, id uuid.UUID) error {
	return s.repo.Delete(ctx, tenantID, userID, id)
}
