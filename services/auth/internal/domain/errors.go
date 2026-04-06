package domain

import "errors"

// Domain errors are returned from repositories & services and translated
// to HTTP status codes in the handler layer.
var (
	ErrUserNotFound            = errors.New("user not found")
	ErrUserAlreadyExists       = errors.New("user already exists")
	ErrSessionNotFound         = errors.New("session not found")
	ErrSessionExpired          = errors.New("session expired")
	ErrSessionRevoked          = errors.New("session revoked")
	ErrUnauthorized            = errors.New("unauthorized")
	ErrForbidden               = errors.New("forbidden")
	ErrWebhookInvalidSignature = errors.New("invalid webhook signature")
	ErrWebhookStaleTimestamp   = errors.New("webhook timestamp too old")
	ErrRoleNotFound            = errors.New("role not found")
	ErrInvalidToken            = errors.New("invalid token")
	ErrTokenExpired            = errors.New("token expired")
	ErrMissingTenantID         = errors.New("missing tenant id")
	ErrInvalidInput            = errors.New("invalid input")
)
