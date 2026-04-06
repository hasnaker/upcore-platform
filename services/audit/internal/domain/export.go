package domain

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ExportFormat enumerates supported export formats.
type ExportFormat string

const (
	ExportFormatCSV    ExportFormat = "csv"
	ExportFormatNDJSON ExportFormat = "ndjson"
	ExportFormatJSON   ExportFormat = "json"
)

// Valid returns nil if the format is known.
func (f ExportFormat) Valid() error {
	switch f {
	case ExportFormatCSV, ExportFormatNDJSON, ExportFormatJSON:
		return nil
	}
	return fmt.Errorf("%w: invalid export format: %s", ErrInvalidInput, f)
}

// ExportStatus enumerates export lifecycle states.
type ExportStatus string

const (
	ExportStatusPending    ExportStatus = "pending"
	ExportStatusProcessing ExportStatus = "processing"
	ExportStatusCompleted  ExportStatus = "completed"
	ExportStatusFailed     ExportStatus = "failed"
)

// Export is a record of an audit log export request.
type Export struct {
	ID          uuid.UUID       `db:"id" json:"id"`
	TenantID    uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	RequestedBy uuid.UUID       `db:"requested_by" json:"requested_by"`
	Format      ExportFormat    `db:"format" json:"format"`
	Filter      json.RawMessage `db:"filter" json:"filter"`
	Status      ExportStatus    `db:"status" json:"status"`
	RowCount    int             `db:"row_count" json:"row_count"`
	FileURL     string          `db:"file_url" json:"file_url,omitempty"`
	RequestedAt time.Time       `db:"requested_at" json:"requested_at"`
	CompletedAt *time.Time      `db:"completed_at" json:"completed_at,omitempty"`
}

// Validate ensures an Export has the required fields.
func (e *Export) Validate() error {
	if e.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id required", ErrInvalidInput)
	}
	if e.RequestedBy == uuid.Nil {
		return fmt.Errorf("%w: requested_by required", ErrInvalidInput)
	}
	if err := e.Format.Valid(); err != nil {
		return err
	}
	return nil
}

// ExportRequest is the input payload for creating a new export.
type ExportRequest struct {
	Format ExportFormat `json:"format"`
	Filter ExportFilter `json:"filter"`
}

// ExportFilter defines what events to include in the export.
type ExportFilter struct {
	From     *time.Time `json:"from,omitempty"`
	To       *time.Time `json:"to,omitempty"`
	Services []string   `json:"services,omitempty"`
	Actions  []string   `json:"actions,omitempty"`
}
