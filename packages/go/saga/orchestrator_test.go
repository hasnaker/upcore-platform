package saga

import (
	"context"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

var now = time.Now()

// orchestratorHarness wires a sqlmock-backed orchestrator so we can verify the
// end-to-end lifecycle (insert → step rows → advance → terminal status) without
// a real Postgres.
func orchestratorHarness(t *testing.T) (*Orchestrator, sqlmock.Sqlmock) {
	t.Helper()
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	t.Cleanup(func() { _ = mdb.Close() })
	db := sqlx.NewDb(mdb, "postgres")
	return NewOrchestrator(db), mock
}

func instanceColumns() []string {
	return []string{
		"id", "tenant_id", "saga_name", "correlation_id", "aggregate_id",
		"current_step", "total_steps", "status", "payload",
		"last_error", "created_at", "updated_at", "completed_at",
	}
}

func TestOrchestrator_Start_RejectsEmptyDef(t *testing.T) {
	o, _ := orchestratorHarness(t)
	_, err := o.Start(context.Background(), Definition{}, State{TenantID: uuid.New()})
	if err == nil {
		t.Fatalf("empty definition must error")
	}
}

func TestOrchestrator_Start_RejectsMissingTenant(t *testing.T) {
	o, _ := orchestratorHarness(t)
	tr := &trace{}
	def := Definition{Name: "x", Steps: []Step{&recordStep{name: "s1", t: tr}}}
	_, err := o.Start(context.Background(), def, State{})
	if err == nil {
		t.Fatalf("missing tenant must error")
	}
}

func TestOrchestrator_Start_HappyPath_CompletesInstance(t *testing.T) {
	o, mock := orchestratorHarness(t)
	tr := &trace{}
	def := Definition{
		Name: "onboarding",
		Steps: []Step{
			&recordStep{name: "create_user", t: tr},
			&recordStep{name: "send_welcome", t: tr},
		},
	}
	tid := uuid.New()
	instID := uuid.New()
	step1, step2 := uuid.New(), uuid.New()

	// INSERT saga_instances
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_instances`)).
		WillReturnRows(sqlmock.NewRows(instanceColumns()).
			AddRow(instID, tid, "onboarding", nil, nil, 0, 2, "running",
				[]byte("{}"), nil, now, now, nil))

	// Step 1 execute: begin → succeed → advance
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_steps`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(step1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_steps SET status='success'`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances SET current_step=`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Step 2 execute: begin → succeed → advance
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_steps`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(step2))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_steps SET status='success'`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances SET current_step=`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Final status 'completed'
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	inst, err := o.Start(context.Background(), def,
		State{TenantID: tid, Data: map[string]any{}})
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if inst.Status != "completed" {
		t.Errorf("want status completed, got %s", inst.Status)
	}
	if tr.Events[0] != "exec:create_user" || tr.Events[1] != "exec:send_welcome" {
		t.Errorf("step order wrong: %v", tr.Events)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestOrchestrator_Start_CompensatesOnFailure(t *testing.T) {
	o, mock := orchestratorHarness(t)
	tr := &trace{}
	def := Definition{
		Name: "payment",
		Steps: []Step{
			&recordStep{name: "reserve", t: tr},
			&recordStep{name: "charge", executeErr: errors.New("card declined"), t: tr},
		},
	}
	tid := uuid.New()
	instID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_instances`)).
		WillReturnRows(sqlmock.NewRows(instanceColumns()).
			AddRow(instID, tid, "payment", nil, nil, 0, 2, "running",
				[]byte("{}"), nil, now, now, nil))

	// Step 1 reserve: succeeds
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_steps`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(uuid.New()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_steps SET status='success'`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances SET current_step=`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Step 2 charge: fails → failStep + status=compensating
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_steps`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(uuid.New()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_steps SET status='failed'`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Compensate reserve: begin step + succeed step
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.saga_steps`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(uuid.New()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_steps SET status='success'`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	// Final status 'compensated'
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.saga_instances`)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	inst, err := o.Start(context.Background(), def,
		State{TenantID: tid, Data: map[string]any{}})
	if err == nil {
		t.Fatalf("expected err from failing step")
	}
	if inst.Status != "compensated" {
		t.Errorf("want status compensated, got %s", inst.Status)
	}
	// Events: exec:reserve, exec:charge, err:charge, comp:reserve
	want := []string{"exec:reserve", "exec:charge", "err:charge", "comp:reserve"}
	if len(tr.Events) != len(want) {
		t.Fatalf("events: want %v, got %v", want, tr.Events)
	}
	for i, w := range want {
		if tr.Events[i] != w {
			t.Errorf("event[%d] = %s, want %s", i, tr.Events[i], w)
		}
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

func TestOrchestrator_Start_Idempotent_ReturnsExisting(t *testing.T) {
	o, mock := orchestratorHarness(t)
	tr := &trace{}
	def := Definition{
		Name:  "onboarding",
		Steps: []Step{&recordStep{name: "s", t: tr}},
	}
	tid := uuid.New()
	existingID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, tenant_id`)).
		WithArgs(tid, "onboarding", "corr-1").
		WillReturnRows(sqlmock.NewRows(instanceColumns()).
			AddRow(existingID, tid, "onboarding", "corr-1", nil, 1, 1, "completed",
				[]byte("{}"), nil, now, now, now))

	inst, err := o.Start(context.Background(), def, State{
		TenantID: tid, CorrelationID: "corr-1", Data: map[string]any{},
	})
	if err != nil {
		t.Fatalf("Start: %v", err)
	}
	if inst.ID != existingID {
		t.Errorf("want existing id")
	}
	// No steps should execute since we returned early.
	if len(tr.Events) != 0 {
		t.Errorf("idempotent start must not execute steps, got %v", tr.Events)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet: %v", err)
	}
}

func TestWithMetrics_ReturnsCopy(t *testing.T) {
	o, _ := orchestratorHarness(t)
	m := DefaultMetrics()
	o2 := o.WithMetrics(m)
	if o2 == nil || o2.Metrics != m {
		t.Errorf("WithMetrics should return new orchestrator with metrics")
	}
	// nil metrics → pass-through
	o3 := o.WithMetrics(nil)
	if o3 != o {
		t.Errorf("nil metrics must return same pointer")
	}
}

// removed placeholder — var now is declared in import block above.
