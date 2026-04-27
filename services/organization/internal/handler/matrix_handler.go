package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/organization/internal/middleware"
)

// MatrixHandler manages app.matrix_assignments (migration 042).
// Matrix org: line manager (employees.manager_id) + dotted-line/project/
// functional managers here. Her employee için N adet matrix bağlantısı olabilir.
type MatrixHandler struct {
	DB *sqlx.DB
}

// NewMatrixHandler constructs.
func NewMatrixHandler(db *sqlx.DB) *MatrixHandler { return &MatrixHandler{DB: db} }

// Register wires routes onto a subrouter.
func (h *MatrixHandler) Register(r chi.Router) {
	r.Route("/matrix", func(r chi.Router) {
		r.Get("/employees/{eid}", h.ListForEmployee)
		r.Get("/managers/{mid}", h.ListForManager)
		r.Post("/", h.Create)
		r.Patch("/{id}", h.Update)
		r.Delete("/{id}", h.End)
	})
}

type matrixRow struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	EmployeeID      uuid.UUID  `db:"employee_id" json:"employee_id"`
	MatrixManagerID uuid.UUID  `db:"matrix_manager_id" json:"matrix_manager_id"`
	Relationship    string     `db:"relationship" json:"relationship"`
	AllocationPct   int        `db:"allocation_pct" json:"allocation_pct"`
	StartDate       time.Time  `db:"start_date" json:"start_date"`
	EndDate         *time.Time `db:"end_date" json:"end_date,omitempty"`
	ProjectName     *string    `db:"project_name" json:"project_name,omitempty"`
	Notes           *string    `db:"notes" json:"notes,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
}

func matrixTID(r *http.Request) uuid.UUID {
	return middleware.TenantIDFromContext(r.Context())
}

func matrixWriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

const matrixCols = `id, employee_id, matrix_manager_id, relationship, allocation_pct,
	start_date, end_date, project_name, notes, created_at`

// ListForEmployee GET /matrix/employees/{eid}
func (h *MatrixHandler) ListForEmployee(w http.ResponseWriter, r *http.Request) {
	tid := matrixTID(r)
	if tid == uuid.Nil {
		matrixWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	eid, err := uuid.Parse(chi.URLParam(r, "eid"))
	if err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	out := []matrixRow{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT `+matrixCols+` FROM app.matrix_assignments
		 WHERE tenant_id=$1 AND employee_id=$2
		   AND (end_date IS NULL OR end_date > CURRENT_DATE)
		 ORDER BY start_date DESC`, tid, eid); err != nil {
		matrixWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	matrixWriteJSON(w, 200, map[string]any{"items": out})
}

// ListForManager GET /matrix/managers/{mid}
func (h *MatrixHandler) ListForManager(w http.ResponseWriter, r *http.Request) {
	tid := matrixTID(r)
	if tid == uuid.Nil {
		matrixWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	mid, err := uuid.Parse(chi.URLParam(r, "mid"))
	if err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	out := []matrixRow{}
	if err := h.DB.SelectContext(r.Context(), &out,
		`SELECT `+matrixCols+` FROM app.matrix_assignments
		 WHERE tenant_id=$1 AND matrix_manager_id=$2
		   AND (end_date IS NULL OR end_date > CURRENT_DATE)
		 ORDER BY start_date DESC`, tid, mid); err != nil {
		matrixWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	matrixWriteJSON(w, 200, map[string]any{"items": out})
}

// Create POST /matrix
func (h *MatrixHandler) Create(w http.ResponseWriter, r *http.Request) {
	tid := matrixTID(r)
	if tid == uuid.Nil {
		matrixWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	var body struct {
		EmployeeID      uuid.UUID `json:"employee_id"`
		MatrixManagerID uuid.UUID `json:"matrix_manager_id"`
		Relationship    string    `json:"relationship"`
		AllocationPct   int       `json:"allocation_pct"`
		StartDate       time.Time `json:"start_date"`
		ProjectName     *string   `json:"project_name"`
		Notes           *string   `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if body.Relationship == "" {
		body.Relationship = "project"
	}
	if body.AllocationPct <= 0 {
		body.AllocationPct = 100
	}
	var id uuid.UUID
	if err := h.DB.GetContext(r.Context(), &id,
		`INSERT INTO app.matrix_assignments
		 (tenant_id, employee_id, matrix_manager_id, relationship, allocation_pct,
		  start_date, project_name, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		tid, body.EmployeeID, body.MatrixManagerID, body.Relationship,
		body.AllocationPct, body.StartDate, body.ProjectName, body.Notes); err != nil {
		matrixWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	matrixWriteJSON(w, 201, map[string]any{"id": id})
}

// Update PATCH /matrix/{id}
func (h *MatrixHandler) Update(w http.ResponseWriter, r *http.Request) {
	tid := matrixTID(r)
	if tid == uuid.Nil {
		matrixWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	var body struct {
		AllocationPct *int       `json:"allocation_pct"`
		EndDate       *time.Time `json:"end_date"`
		ProjectName   *string    `json:"project_name"`
		Notes         *string    `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_request"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.matrix_assignments SET
		   allocation_pct = COALESCE($3, allocation_pct),
		   end_date       = COALESCE($4, end_date),
		   project_name   = COALESCE($5, project_name),
		   notes          = COALESCE($6, notes),
		   updated_at     = NOW()
		 WHERE tenant_id=$1 AND id=$2`,
		tid, id, body.AllocationPct, body.EndDate, body.ProjectName, body.Notes); err != nil {
		matrixWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	matrixWriteJSON(w, 200, map[string]any{"ok": true})
}

// End DELETE /matrix/{id} — sets end_date=today (soft removal).
func (h *MatrixHandler) End(w http.ResponseWriter, r *http.Request) {
	tid := matrixTID(r)
	if tid == uuid.Nil {
		matrixWriteJSON(w, 401, map[string]string{"error": "unauthorized"})
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		matrixWriteJSON(w, 400, map[string]string{"error": "bad_uuid"})
		return
	}
	if _, err := h.DB.ExecContext(r.Context(),
		`UPDATE app.matrix_assignments SET end_date=CURRENT_DATE, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2 AND end_date IS NULL`, tid, id); err != nil {
		matrixWriteJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	matrixWriteJSON(w, 200, map[string]any{"ok": true})
}
