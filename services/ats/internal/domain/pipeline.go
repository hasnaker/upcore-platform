package domain

import "github.com/google/uuid"

// PipelineStage represents a customizable or system-defined pipeline stage.
type PipelineStage struct {
	ID         uuid.UUID `db:"id" json:"id"`
	TenantID   uuid.UUID `db:"tenant_id" json:"tenant_id"`
	Name       string    `db:"name" json:"name"`
	OrderIndex int       `db:"order_index" json:"order_index"`
	Color      *string   `db:"color" json:"color,omitempty"`
	IsSystem   bool      `db:"is_system" json:"is_system"`
	IsTerminal bool      `db:"is_terminal" json:"is_terminal"`
}

// SystemStages lists the default pipeline stages in order.
var SystemStages = []struct {
	Name       string
	Order      int
	IsTerminal bool
}{
	{Name: "applied", Order: 0, IsTerminal: false},
	{Name: "screened", Order: 1, IsTerminal: false},
	{Name: "assessed", Order: 2, IsTerminal: false},
	{Name: "interviewed", Order: 3, IsTerminal: false},
	{Name: "offered", Order: 4, IsTerminal: false},
	{Name: "hired", Order: 5, IsTerminal: true},
	{Name: "rejected", Order: 6, IsTerminal: true},
	{Name: "withdrawn", Order: 7, IsTerminal: true},
}

// KanbanBoard represents a requisition's pipeline as a kanban view.
type KanbanBoard struct {
	RequisitionID uuid.UUID       `json:"requisition_id"`
	Stages        []KanbanColumn  `json:"stages"`
}

// KanbanColumn represents one column in the kanban board.
type KanbanColumn struct {
	Stage        string         `json:"stage"`
	Count        int            `json:"count"`
	Applications []*Application `json:"applications"`
}
