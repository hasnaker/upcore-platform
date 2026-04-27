// Package hris defines the common interface satisfied by every HRIS
// connector (SuccessFactors, Workday, BambooHR). UpCore pulls an abstract
// `Employee` list; per-tenant `source_of_truth` flag decides whether UpCore
// pushes back edits or is purely a replica.
package hris

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Employee is the normalised record written to app.hris_staging.
type Employee struct {
	ExternalID    string            // HRIS primary key
	Email         string
	FirstName     string
	LastName      string
	EmployeeNo    string
	Department    string
	Title         string
	ManagerExtID  string
	HireDate      time.Time
	TerminationDate *time.Time
	Country       string
	Phone         string
	Active        bool
	Metadata      map[string]string
}

// SyncResult is the summary emitted by every Run().
type SyncResult struct {
	TenantID    uuid.UUID
	Provider    string
	StartedAt   time.Time
	FinishedAt  time.Time
	Inserted    int
	Updated     int
	SoftDeleted int
	Conflicts   int
	Errors      []string
}

// Conflict is logged in app.hris_sync_conflicts when UpCore and HRIS disagree.
type Conflict struct {
	EmployeeExternalID string
	Field              string
	LocalValue         string
	RemoteValue        string
	Resolution         string // "remote_wins" | "local_wins"
	OccurredAt         time.Time
}

// Connector is implemented by each HRIS package.
type Connector interface {
	// Provider returns the canonical name stored in db ("successfactors", "workday", "bamboohr").
	Provider() string
	// FetchEmployees returns a full or delta page.
	FetchEmployees(ctx context.Context, since time.Time, pageToken string) (emps []Employee, nextToken string, err error)
	// PushUpdate writes the given field back to the HRIS. Returns ErrReadOnly
	// for connectors that don't support writeback.
	PushUpdate(ctx context.Context, externalID, field, value string) error
}

// SourceOfTruth is the per-tenant resolution flag.
type SourceOfTruth string

const (
	// SourceHRIS — HRIS wins on conflict; UpCore never pushes.
	SourceHRIS SourceOfTruth = "hris"
	// SourceUpCore — UpCore wins; push changes back to HRIS.
	SourceUpCore SourceOfTruth = "upcore"
	// SourceLastWriteWins — use updated_at timestamps; both sides may push.
	SourceLastWriteWins SourceOfTruth = "last_write_wins"
)
