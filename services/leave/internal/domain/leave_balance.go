package domain

import (
	"time"

	"github.com/google/uuid"
)

// LeaveBalance represents an employee's balance for a single leave type in a given year.
// `remaining_days` is a GENERATED column in the DB, so it is read-only.
type LeaveBalance struct {
	ID            uuid.UUID  `db:"id" json:"id"`
	TenantID      uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID  `db:"employee_id" json:"employee_id"`
	LeaveTypeID   uuid.UUID  `db:"leave_type_id" json:"leave_type_id"`
	Year          int        `db:"year" json:"year"`
	AccruedDays   float64    `db:"accrued_days" json:"accrued_days"`
	UsedDays      float64    `db:"used_days" json:"used_days"`
	PendingDays   float64    `db:"pending_days" json:"pending_days"`
	CarriedOver   float64    `db:"carried_over" json:"carried_over"`
	AdjustedDays  float64    `db:"adjusted_days" json:"adjusted_days"`
	RemainingDays float64    `db:"remaining_days" json:"remaining_days"`
	LastAccrualAt *time.Time `db:"last_accrual_at" json:"last_accrual_at,omitempty"`
	CreatedAt     time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time  `db:"updated_at" json:"updated_at"`
}

// Available returns the balance available for consumption.
func (b *LeaveBalance) Available() float64 {
	return b.AccruedDays + b.CarriedOver + b.AdjustedDays - b.UsedDays - b.PendingDays
}

// CanConsume reports whether days can be reserved from available balance.
func (b *LeaveBalance) CanConsume(days float64) bool {
	return b.Available() >= days
}
