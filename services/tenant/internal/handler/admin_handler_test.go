package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// buildAdminRouter returns a chi router with AdminHandler wired to the mock
// DB, plus the mock itself for expectation scripting.
func buildAdminRouter(t *testing.T) (*chi.Mux, sqlmock.Sqlmock, *sqlx.DB) {
	t.Helper()
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	t.Cleanup(func() { _ = mdb.Close() })
	db := sqlx.NewDb(mdb, "postgres")

	h := NewAdminHandler(db)
	r := chi.NewRouter()
	h.Register(r)
	return r, mock, db
}

func do(t *testing.T, r http.Handler, method, path string, body any, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ---------------------------------------------------------------------------
// Helper functions — no DB needed
// ---------------------------------------------------------------------------

func TestAdminHelpers_ParseHeaders(t *testing.T) {
	tid := uuid.New()
	uid := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Tenant-ID", "  "+tid.String()+"  ")
	req.Header.Set("X-User-ID", uid.String())

	if got := adminTenantID(req); got != tid {
		t.Errorf("adminTenantID: want %s, got %s", tid, got)
	}
	if got := adminUserID(req); got != uid {
		t.Errorf("adminUserID mismatch")
	}

	bad := httptest.NewRequest(http.MethodGet, "/", nil)
	if got := adminTenantID(bad); got != uuid.Nil {
		t.Errorf("missing header must return uuid.Nil, got %s", got)
	}
}

func TestAdminWriteJSON_HeaderAndBody(t *testing.T) {
	w := httptest.NewRecorder()
	adminWriteJSON(w, http.StatusCreated, map[string]string{"ok": "yes"})
	if w.Code != http.StatusCreated {
		t.Errorf("status: want 201, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Errorf("Content-Type: %s", ct)
	}
	var out map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out["ok"] != "yes" {
		t.Errorf("body mismatch")
	}
}

// ---------------------------------------------------------------------------
// Webhook CRUD — DB mocked
// ---------------------------------------------------------------------------

func TestAdminHandler_ListWebhooks_ReturnsItems(t *testing.T) {
	r, mock, _ := buildAdminRouter(t)
	tid := uuid.New()
	rows := sqlmock.NewRows([]string{
		"id", "name", "target_url", "event_types", "active",
		"failure_count", "last_success_at", "last_failure_at", "created_at",
	}).AddRow(
		uuid.New(), "Slack bridge", "https://hooks.slack.com/x",
		pq.StringArray{"employee.created", "leave.approved"},
		true, 0, nil, nil, time.Now(),
	)
	mock.ExpectQuery(regexp.QuoteMeta(`FROM app.webhook_subscriptions WHERE tenant_id=$1`)).
		WithArgs(tid).WillReturnRows(rows)

	w := do(t, r, http.MethodGet, "/webhooks", nil, map[string]string{
		"X-Tenant-ID": tid.String(),
	})
	if w.Code != http.StatusOK {
		t.Fatalf("code: %d body=%s", w.Code, w.Body.String())
	}
	var out struct{ Items []map[string]any `json:"items"` }
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if len(out.Items) != 1 {
		t.Errorf("want 1 webhook, got %d", len(out.Items))
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("expectations: %v", err)
	}
}

func TestAdminHandler_CreateWebhook_AutoSecret(t *testing.T) {
	r, mock, _ := buildAdminRouter(t)
	tid := uuid.New()
	uid := uuid.New()
	newID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO app.webhook_subscriptions`)).
		WithArgs(tid, "slack", "https://hooks", sqlmock.AnyArg(), sqlmock.AnyArg(), uid).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(newID))

	body := map[string]any{
		"name":        "slack",
		"target_url":  "https://hooks",
		"event_types": []string{"employee.created"},
		// secret omitted → handler must auto-generate
	}
	w := do(t, r, http.MethodPost, "/webhooks", body, map[string]string{
		"X-Tenant-ID": tid.String(),
		"X-User-ID":   uid.String(),
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("code %d body=%s", w.Code, w.Body.String())
	}
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out["id"] != newID.String() {
		t.Errorf("id mismatch: %v", out["id"])
	}
	secret, _ := out["secret"].(string)
	if len(secret) < 30 {
		t.Errorf("auto-generated secret must be non-trivial, got %q", secret)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("expectations: %v", err)
	}
}

func TestAdminHandler_CreateWebhook_BadJSON(t *testing.T) {
	r, _, _ := buildAdminRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/webhooks", bytes.NewBufferString("not json"))
	req.Header.Set("X-Tenant-ID", uuid.New().String())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("bad json must 400, got %d", w.Code)
	}
}

func TestAdminHandler_DeleteWebhook_SoftDeactivate(t *testing.T) {
	r, mock, _ := buildAdminRouter(t)
	tid := uuid.New()
	whID := uuid.New()

	mock.ExpectExec(regexp.QuoteMeta(`UPDATE app.webhook_subscriptions SET active=FALSE`)).
		WithArgs(tid, whID).WillReturnResult(sqlmock.NewResult(0, 1))

	w := do(t, r, http.MethodDelete, "/webhooks/"+whID.String(), nil, map[string]string{
		"X-Tenant-ID": tid.String(),
	})
	if w.Code != http.StatusOK {
		t.Fatalf("code %d body=%s", w.Code, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("expectations: %v", err)
	}
}

func TestAdminHandler_DeleteWebhook_BadUUID(t *testing.T) {
	r, _, _ := buildAdminRouter(t)
	w := do(t, r, http.MethodDelete, "/webhooks/not-a-uuid", nil, map[string]string{
		"X-Tenant-ID": uuid.New().String(),
	})
	if w.Code != http.StatusBadRequest {
		t.Errorf("bad uuid must 400, got %d", w.Code)
	}
}
