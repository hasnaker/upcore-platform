package domain

import "errors"

// Domain errors are returned from repositories and services and mapped to
// HTTP status codes in the handler layer.
var (
	ErrNotFound            = errors.New("resource not found")
	ErrEventNotFound       = errors.New("audit event not found")
	ErrDSRNotFound         = errors.New("dsr request not found")
	ErrExportNotFound      = errors.New("export not found")
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidLegalBasis   = errors.New("invalid legal basis")
	ErrInvalidDSRType      = errors.New("invalid dsr request type")
	ErrInvalidDSRStatus    = errors.New("invalid dsr status")
	ErrInvalidTransition   = errors.New("invalid dsr status transition")
	ErrImmutable           = errors.New("audit events are immutable")
	ErrMissingTenantID     = errors.New("missing tenant id")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrBackpressure        = errors.New("ingestion backpressure triggered")
	ErrDSRAlreadyCompleted = errors.New("dsr request already completed")
)
