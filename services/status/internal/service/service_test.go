package service

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// newMockService wires a sqlmock-backed Service for unit tests.
func newMockService(t *testing.T) (*Service, sqlmock.Sqlmock, func()) {
	t.Helper()
	mdb, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	db := sqlx.NewDb(mdb, "postgres")
	return New(db, zerolog.Nop()), mock, func() { _ = mdb.Close() }
}

func TestUUIDArrayRoundtrip(t *testing.T) {
	id1 := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	id2 := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	a := UUIDArray{id1, id2}

	raw, err := a.Value()
	if err != nil {
		t.Fatalf("value: %v", err)
	}
	got := raw.(string)
	if got != "{00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002}" {
		t.Fatalf("unexpected: %q", got)
	}

	var b UUIDArray
	if err := b.Scan(got); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(b) != 2 || b[0] != id1 || b[1] != id2 {
		t.Fatalf("roundtrip mismatch: %v", b)
	}

	// Empty
	var c UUIDArray
	if err := c.Scan("{}"); err != nil {
		t.Fatalf("empty: %v", err)
	}
	if len(c) != 0 {
		t.Fatalf("empty should be 0 len, got %v", c)
	}
}

func TestUUIDArrayJSON(t *testing.T) {
	a := UUIDArray{uuid.MustParse("00000000-0000-0000-0000-000000000001")}
	j, err := a.MarshalJSON()
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(j) != `["00000000-0000-0000-0000-000000000001"]` {
		t.Fatalf("unexpected: %s", j)
	}
	var back UUIDArray
	if err := back.UnmarshalJSON(j); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(back) != 1 {
		t.Fatalf("back len: %d", len(back))
	}
}

func TestDailyRollupUptime(t *testing.T) {
	r := DailyRollup{TotalProbes: 100, FailedProbes: 2}
	if u := r.Uptime(); u < 0.97 || u > 0.99 {
		t.Fatalf("uptime: %v", u)
	}
	if (DailyRollup{}).Uptime() != 1.0 {
		t.Fatalf("empty day should be 1.0")
	}
}

func TestListComponents(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_components`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "code", "name", "description", "category", "sort_order", "status",
			"healthcheck_url", "prometheus_job", "auto_sync_enabled",
			"last_checked_at", "created_at", "updated_at",
		}).AddRow(uuid.New(), "api_gateway", "API Gateway", nil, "core", 10, "operational",
			nil, nil, true, nil, time.Now(), time.Now()))

	comps, err := svc.ListComponents(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(comps) != 1 {
		t.Fatalf("expected 1 comp, got %d", len(comps))
	}
	if comps[0].Code != "api_gateway" {
		t.Fatalf("code: %q", comps[0].Code)
	}
}

func TestCreateIncidentValidation(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()

	_, err := svc.CreateIncident(context.Background(), CreateIncidentParams{Title: ""})
	if err == nil {
		t.Fatalf("expected title_required")
	}

	_, err = svc.CreateIncident(context.Background(), CreateIncidentParams{Title: "x", Impact: "nope"})
	if err == nil {
		t.Fatalf("expected invalid_impact")
	}
}

func TestCreateIncidentHappyPath(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectBegin()
	incID := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_incidents`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "impact", "status", "started_at", "resolved_at",
			"postmortem_url", "postmortem_summary", "component_ids",
			"created_by", "created_at", "updated_at",
		}).AddRow(incID, "API down", "major", "investigating", time.Now(), nil,
			nil, nil, "{}", nil, time.Now(), time.Now()))
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO app.status_incident_updates`)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	inc, err := svc.CreateIncident(context.Background(), CreateIncidentParams{
		Title:  "API down",
		Impact: "major",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if inc.ID != incID {
		t.Fatalf("id mismatch")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("expectations: %v", err)
	}
}

func TestAppendIncidentUpdateInvalidStatus(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	_, err := svc.AppendIncidentUpdate(context.Background(), uuid.New(), "banana", "body", "")
	if err == nil {
		t.Fatalf("expected invalid status")
	}
}

func TestAppendIncidentUpdateRequiresBody(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	_, err := svc.AppendIncidentUpdate(context.Background(), uuid.New(), "monitoring", "", "")
	if err == nil {
		t.Fatalf("expected body_required")
	}
}

func TestAppendIncidentUpdateSuccess(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	updID := uuid.New()
	incID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_incident_updates`)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "incident_id", "status", "body", "author", "created_at"}).
			AddRow(updID, incID, "monitoring", "sistem toparlıyor", nil, time.Now()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.status_incidents`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	upd, err := svc.AppendIncidentUpdate(context.Background(), incID, "monitoring", "sistem toparlıyor", "")
	if err != nil {
		t.Fatalf("append: %v", err)
	}
	if upd.ID != updID {
		t.Fatalf("id mismatch")
	}
}

func TestResolveRequiresPostmortem(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	if err := svc.ResolveIncident(context.Background(), uuid.New(), "", "", ""); err == nil {
		t.Fatalf("expected postmortem_required")
	}
}

func TestResolveHappyPath(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.status_incidents`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO app.status_incident_updates`)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()
	if err := svc.ResolveIncident(context.Background(), uuid.New(), "https://status.upcore.io/postmortems/42", "özet", "admin"); err != nil {
		t.Fatalf("resolve: %v", err)
	}
}

func TestSubscribeInvalidChannel(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	_, err := svc.Subscribe(context.Background(), SubscribeRequest{Channel: "fax", Target: "foo@bar"})
	if err == nil {
		t.Fatalf("expected invalid channel")
	}
}

func TestSubscribeInvalidEmail(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	_, err := svc.Subscribe(context.Background(), SubscribeRequest{Channel: "email", Target: "not-an-email"})
	if err == nil {
		t.Fatalf("expected invalid email")
	}
}

func TestSubscribeWebhookHTTPS(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	_, err := svc.Subscribe(context.Background(), SubscribeRequest{Channel: "webhook", Target: "http://insecure"})
	if err == nil {
		t.Fatalf("expected https required")
	}
}

func TestSubscribeSuccess(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	subID := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_subscribers`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "channel", "target", "component_ids", "confirmed", "confirm_token",
			"unsubscribe_token", "created_at", "confirmed_at", "last_notified_at",
		}).AddRow(subID, "email", "alice@example.com", "{}", false, "abc123", "unsub456", time.Now(), nil, nil))
	s, err := svc.Subscribe(context.Background(), SubscribeRequest{Channel: "email", Target: "alice@example.com"})
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	if s.Channel != "email" || s.Target != "alice@example.com" {
		t.Fatalf("mismatch: %+v", s)
	}
}

func TestConfirmSubscription(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.status_subscribers`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	ok, err := svc.ConfirmSubscription(context.Background(), "abc123")
	if err != nil {
		t.Fatalf("confirm: %v", err)
	}
	if !ok {
		t.Fatalf("expected ok")
	}
}

func TestConfirmSubscriptionTokenInvalid(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	if _, err := svc.ConfirmSubscription(context.Background(), ""); err == nil {
		t.Fatalf("expected invalid token")
	}
}

func TestUnsubscribe(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM app.status_subscribers`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	ok, err := svc.Unsubscribe(context.Background(), "unsub456")
	if err != nil {
		t.Fatalf("unsub: %v", err)
	}
	if !ok {
		t.Fatalf("expected ok")
	}
}

func TestCreateMaintenanceValidation(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	start := time.Now().Add(1 * time.Hour)
	end := start.Add(-1 * time.Hour)
	_, err := svc.CreateMaintenance(context.Background(), MaintenanceWindow{
		Title:          "t",
		Description:    "d",
		ScheduledStart: start,
		ScheduledEnd:   end,
	})
	if err == nil {
		t.Fatalf("expected end_before_start")
	}
}

func TestRollupGlobalStatus(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_components`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "code", "name", "description", "category", "sort_order", "status",
			"healthcheck_url", "prometheus_job", "auto_sync_enabled",
			"last_checked_at", "created_at", "updated_at",
		}).AddRow(uuid.New(), "a", "A", nil, "core", 1, "operational", nil, nil, true, nil, time.Now(), time.Now()).
			AddRow(uuid.New(), "b", "B", nil, "service", 1, "partial_outage", nil, nil, true, nil, time.Now(), time.Now()))
	status, comps, err := svc.RollupGlobalStatus(context.Background())
	if err != nil {
		t.Fatalf("rollup: %v", err)
	}
	if status != "partial_outage" {
		t.Fatalf("worst not partial_outage: %s", status)
	}
	if len(comps) != 2 {
		t.Fatalf("len: %d", len(comps))
	}
}

func TestSetComponentStatusRejectsInvalid(t *testing.T) {
	svc, _, cleanup := newMockService(t)
	defer cleanup()
	if err := svc.SetComponentStatus(context.Background(), uuid.New(), "bogus"); err == nil {
		t.Fatalf("expected invalid status")
	}
}

func TestRecordProbe(t *testing.T) {
	svc, mock, cleanup := newMockService(t)
	defer cleanup()
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO app.status_component_daily`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	if err := svc.RecordProbe(context.Background(), uuid.New(), true, 120); err != nil {
		t.Fatalf("record probe: %v", err)
	}
}
