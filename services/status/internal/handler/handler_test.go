package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"

	"github.com/upcore/status/internal/service"
)

// harness builds a chi router with the full public + admin surface backed by sqlmock.
func harness(t *testing.T) (*chi.Mux, sqlmock.Sqlmock, func()) {
	t.Helper()
	mdb, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	db := sqlx.NewDb(mdb, "postgres")
	svc := service.New(db, zerolog.Nop())
	h := New(db, svc, Config{PublicBaseURL: "https://status.upcore.io", AzureSecret: "topsecret"})

	r := chi.NewRouter()
	r.Route("/api/v2", h.RegisterPublic)
	r.Route("/api/v1/admin/status", h.RegisterAdmin)
	r.Route("/webhooks", h.RegisterWebhooks)
	return r, mock, func() { _ = mdb.Close() }
}

func doReq(t *testing.T, r http.Handler, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var buf *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("json: %v", err)
		}
		buf = bytes.NewReader(b)
	} else {
		buf = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, buf)
	req = req.WithContext(context.Background())
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func adminHeaders() map[string]string {
	return map[string]string{"X-User-Roles": "platform_admin", "X-User-ID": "user_admin_1"}
}

// ---- public ----------------------------------------------------------------

func TestGetStatusSummary_OK(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_components`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "code", "name", "description", "category", "sort_order", "status",
			"healthcheck_url", "prometheus_job", "auto_sync_enabled",
			"last_checked_at", "created_at", "updated_at",
		}).AddRow(uuid.New(), "api_gateway", "API Gateway", nil, "core", 10, "operational",
			nil, nil, true, nil, time.Now(), time.Now()))
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_incidents`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "impact", "status", "started_at", "resolved_at",
			"postmortem_url", "postmortem_summary", "component_ids",
			"created_by", "created_at", "updated_at",
		}))
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_maintenance_windows`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "description", "scheduled_start", "scheduled_end", "status",
			"component_ids", "created_by", "created_at", "updated_at",
		}))

	w := doReq(t, r, http.MethodGet, "/api/v2/status", nil, nil)
	if w.Code != 200 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	st := body["status"].(map[string]any)
	if st["indicator"] != "none" {
		t.Fatalf("indicator: %v", st["indicator"])
	}
}

func TestListComponents(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_components`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "code", "name", "description", "category", "sort_order", "status",
			"healthcheck_url", "prometheus_job", "auto_sync_enabled",
			"last_checked_at", "created_at", "updated_at",
		}).AddRow(uuid.New(), "auth", "Auth", nil, "service", 100, "operational", nil, nil, true, nil, time.Now(), time.Now()))
	w := doReq(t, r, http.MethodGet, "/api/v2/components", nil, nil)
	if w.Code != 200 {
		t.Fatalf("status: %d", w.Code)
	}
}

func TestSubscribeRejectsBadEmail(t *testing.T) {
	r, _, cleanup := harness(t)
	defer cleanup()
	w := doReq(t, r, http.MethodPost, "/api/v2/subscribe",
		map[string]string{"channel": "email", "target": "not-an-email"}, nil)
	if w.Code != 400 {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestSubscribeEmailSuccess(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_subscribers`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "channel", "target", "component_ids", "confirmed", "confirm_token",
			"unsubscribe_token", "created_at", "confirmed_at", "last_notified_at",
		}).AddRow(uuid.New(), "email", "bob@example.com", "{}", false, "tok123", "unsub123", time.Now(), nil, nil))
	w := doReq(t, r, http.MethodPost, "/api/v2/subscribe",
		map[string]string{"channel": "email", "target": "bob@example.com"}, nil)
	if w.Code != 202 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
}

func TestRSSFeed(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_incidents`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "impact", "status", "started_at", "resolved_at",
			"postmortem_url", "postmortem_summary", "component_ids",
			"created_by", "created_at", "updated_at",
		}).AddRow(uuid.New(), "API yavaşlamış", "minor", "resolved", time.Now(), nil, nil, nil, "{}", nil, time.Now(), time.Now()))
	w := doReq(t, r, http.MethodGet, "/api/v2/rss", nil, nil)
	if w.Code != 200 {
		t.Fatalf("status: %d", w.Code)
	}
	if !strings.HasPrefix(w.Body.String(), "<?xml") {
		t.Fatalf("not xml: %s", w.Body.String())
	}
}

// ---- admin -----------------------------------------------------------------

func TestAdminRequiresRole(t *testing.T) {
	r, _, cleanup := harness(t)
	defer cleanup()
	w := doReq(t, r, http.MethodPost, "/api/v1/admin/status/incidents",
		map[string]string{"title": "hi"}, nil)
	if w.Code != 403 {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestAdminCreateIncident(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	incID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_incidents`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "impact", "status", "started_at", "resolved_at",
			"postmortem_url", "postmortem_summary", "component_ids",
			"created_by", "created_at", "updated_at",
		}).AddRow(incID, "Database slow", "major", "investigating", time.Now(), nil, nil, nil, "{}", nil, time.Now(), time.Now()))
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO app.status_incident_updates`)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	w := doReq(t, r, http.MethodPost, "/api/v1/admin/status/incidents", map[string]any{
		"title":  "Database slow",
		"impact": "major",
	}, adminHeaders())
	if w.Code != 201 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
	var got service.Incident
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if got.ID != incID {
		t.Fatalf("id mismatch")
	}
}

func TestAdminAppendUpdate(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	incID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_incident_updates`)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "incident_id", "status", "body", "author", "created_at"}).
			AddRow(uuid.New(), incID, "monitoring", "Bileşen geri geldi", nil, time.Now()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.status_incidents`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	w := doReq(t, r, http.MethodPost, "/api/v1/admin/status/incidents/"+incID.String()+"/updates",
		map[string]string{"status": "monitoring", "body": "Bileşen geri geldi"}, adminHeaders())
	if w.Code != 201 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
}

func TestAdminResolveRequiresPostmortem(t *testing.T) {
	r, _, cleanup := harness(t)
	defer cleanup()
	w := doReq(t, r, http.MethodPost, "/api/v1/admin/status/incidents/"+uuid.NewString()+"/resolve",
		map[string]string{}, adminHeaders())
	if w.Code != 400 {
		t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestAdminCreateMaintenance(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	mID := uuid.New()
	start := time.Now().Add(24 * time.Hour)
	end := start.Add(2 * time.Hour)
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.status_maintenance_windows`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "title", "description", "scheduled_start", "scheduled_end", "status",
			"component_ids", "created_by", "created_at", "updated_at",
		}).AddRow(mID, "DB upgrade", "Postgres minor upgrade", start, end, "scheduled",
			"{}", nil, time.Now(), time.Now()))
	w := doReq(t, r, http.MethodPost, "/api/v1/admin/status/maintenance",
		map[string]any{
			"title":           "DB upgrade",
			"description":     "Postgres minor upgrade",
			"scheduled_start": start,
			"scheduled_end":   end,
		}, adminHeaders())
	if w.Code != 201 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
}

// ---- webhook ---------------------------------------------------------------

func TestAzureWebhookRequiresSignature(t *testing.T) {
	r, _, cleanup := harness(t)
	defer cleanup()
	w := doReq(t, r, http.MethodPost, "/webhooks/azure-monitor",
		map[string]any{"data": map[string]any{}}, nil)
	if w.Code != 401 {
		t.Fatalf("expected 401 got %d", w.Code)
	}
}

func TestAzureWebhookUpdatesStatus(t *testing.T) {
	r, mock, cleanup := harness(t)
	defer cleanup()
	compID := uuid.New()
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.status_components WHERE code`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "code", "name", "description", "category", "sort_order", "status",
			"healthcheck_url", "prometheus_job", "auto_sync_enabled",
			"last_checked_at", "created_at", "updated_at",
		}).AddRow(compID, "auth", "Auth", nil, "service", 100, "operational", nil, nil, true, nil, time.Now(), time.Now()))
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.status_components`)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	w := doReq(t, r, http.MethodPost, "/webhooks/azure-monitor", map[string]any{
		"data": map[string]any{
			"essentials": map[string]any{
				"componentCode":    "auth",
				"monitorCondition": "Fired",
				"severity":         "Sev1",
			},
		},
	}, map[string]string{"X-Shared-Secret": "topsecret"})
	if w.Code != 202 {
		t.Fatalf("status: %d body=%s", w.Code, w.Body.String())
	}
}

func TestAtlasDescriptionMapping(t *testing.T) {
	cases := map[string]string{
		service.StatusOperational:   "All Systems Operational",
		service.StatusMajorOutage:   "Major Outage",
		service.StatusPartialOutage: "Partial Outage",
		service.StatusDegraded:      "Degraded Performance",
		service.StatusMaintenance:   "Scheduled Maintenance",
	}
	for in, want := range cases {
		if got := atlasDescription(in); got != want {
			t.Fatalf("%s → %s (want %s)", in, got, want)
		}
	}
}

func TestAtlasIndicatorMapping(t *testing.T) {
	cases := map[string]string{
		service.StatusOperational:   "none",
		service.StatusDegraded:      "minor",
		service.StatusPartialOutage: "major",
		service.StatusMajorOutage:   "critical",
	}
	for in, want := range cases {
		if got := atlasIndicator(in); got != want {
			t.Fatalf("%s → %s (want %s)", in, got, want)
		}
	}
}
