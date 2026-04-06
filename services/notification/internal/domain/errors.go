package domain

import "errors"

// Sentinel errors. Handlers map these to HTTP statuses.
var (
	ErrNotFound              = errors.New("not found")
	ErrConflict              = errors.New("conflict")
	ErrValidation            = errors.New("validation failed")
	ErrForbidden             = errors.New("forbidden")
	ErrUnauthorized          = errors.New("unauthorized")
	ErrTemplateNotFound      = errors.New("template not found")
	ErrNotificationNotFound  = errors.New("notification not found")
	ErrPreferenceNotFound    = errors.New("preference not found")
	ErrInvalidChannel        = errors.New("invalid channel")
	ErrInvalidStatus         = errors.New("invalid status")
	ErrInvalidPriority       = errors.New("invalid priority")
	ErrEmailSuppressed       = errors.New("recipient email is suppressed")
	ErrOptedOut              = errors.New("recipient opted out for this category/channel")
	ErrRateLimitExceeded     = errors.New("recipient daily rate limit exceeded")
	ErrMissingRecipient      = errors.New("notification has no valid recipient")
	ErrTemplateRenderFailed  = errors.New("template render failed")
	ErrMissingTemplateVar    = errors.New("missing required template variable")
	ErrChannelUnavailable    = errors.New("channel unavailable")
	ErrProviderError         = errors.New("provider error")
	ErrInvalidTenantScope    = errors.New("resource belongs to a different tenant")
	ErrWebhookSignature      = errors.New("invalid webhook signature")
)

// ValidationError aggregates multiple field errors.
type ValidationError struct {
	Fields map[string]string
}

// Error implements error.
func (e *ValidationError) Error() string {
	return "validation failed"
}

// NewValidationError constructs a validation error from a field/message map.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}
