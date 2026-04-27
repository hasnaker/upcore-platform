package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/performance/internal/domain"
	"github.com/upcore/performance/internal/middleware"
	"github.com/upcore/performance/internal/repository"
	"github.com/upcore/performance/internal/service"
)

// buildPipTestRouter builds a chi router with the PIP handler mounted and a
// helper middleware that injects tenant/user/role headers from the request.
func buildPipTestRouter(t *testing.T) (*chi.Mux, *repository.InMemoryPipRepository) {
	t.Helper()
	repo := repository.NewInMemoryPipRepository()
	svc := service.NewPipService(repo, zerolog.Nop())
	h := NewPipHandler(svc)

	r := chi.NewRouter()
	r.Use(injectHeadersAsCtx)
	r.Route("/api/v1/performance", func(r chi.Router) {
		h.Register(r)
	})
	return r, repo
}

// injectHeadersAsCtx mirrors middleware.TenantInjector so tests stay local.
func injectHeadersAsCtx(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if v := strings.TrimSpace(r.Header.Get("X-Tenant-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, middleware.CtxTenantID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-ID")); v != "" {
			if id, err := uuid.Parse(v); err == nil {
				ctx = context.WithValue(ctx, middleware.CtxUserID, id)
			}
		}
		if v := strings.TrimSpace(r.Header.Get("X-User-Role")); v != "" {
			ctx = context.WithValue(ctx, middleware.CtxRole, v)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type actor struct {
	tenant uuid.UUID
	user   uuid.UUID
	role   string
}

func (a actor) apply(r *http.Request) {
	r.Header.Set("X-Tenant-ID", a.tenant.String())
	r.Header.Set("X-User-ID", a.user.String())
	r.Header.Set("X-User-Role", a.role)
}

func do(t *testing.T, router http.Handler, method, path string, a actor, body any) (*httptest.ResponseRecorder, []byte) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal: %v", err)
		}
		reader = bytes.NewReader(buf)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	a.apply(req)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	return rr, rr.Body.Bytes()
}

func unmarshalCase(t *testing.T, raw []byte) *domain.PipCase {
	t.Helper()
	var c domain.PipCase
	if err := json.Unmarshal(raw, &c); err != nil {
		t.Fatalf("unmarshal: %v (%s)", err, string(raw))
	}
	return &c
}

var initiateBody = map[string]any{
	"reason_category": "performance",
	"reason_summary":  "Son ceyrek hedefler altinda kaldi.",
	"start_date":      "2026-04-01",
	"duration_days":   30,
	"goals": []map[string]any{
		{
			"description":       "Kod inceleme katilimi",
			"measurable_target": "Haftada 5 PR review",
			"deadline":          "2026-04-15",
			"priority":          "high",
		},
	},
}

func TestPipHandler_Initiate_SuccessManager(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	body := map[string]any{}
	for k, v := range initiateBody {
		body[k] = v
	}
	body["employee_id"] = uuid.New().String()
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip", actor{
		tenant: uuid.New(), user: uuid.New(), role: "manager",
	}, body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status: %d body=%s", rr.Code, string(raw))
	}
	c := unmarshalCase(t, raw)
	if c.Status != domain.PipStatusDraft {
		t.Errorf("status: %s", c.Status)
	}
	if len(c.Goals) != 1 {
		t.Errorf("expected 1 goal, got %d", len(c.Goals))
	}
}

func TestPipHandler_Initiate_ForbiddenForEmployee(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	body := map[string]any{}
	for k, v := range initiateBody {
		body[k] = v
	}
	body["employee_id"] = uuid.New().String()
	rr, _ := do(t, r, "POST", "/api/v1/performance/pip", actor{
		tenant: uuid.New(), user: uuid.New(), role: "employee",
	}, body)
	if rr.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", rr.Code)
	}
}

func TestPipHandler_Initiate_RejectsInvalidDuration(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	body := map[string]any{}
	for k, v := range initiateBody {
		body[k] = v
	}
	body["employee_id"] = uuid.New().String()
	body["duration_days"] = 45
	rr, _ := do(t, r, "POST", "/api/v1/performance/pip", actor{
		tenant: uuid.New(), user: uuid.New(), role: "hr",
	}, body)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPipHandler_Initiate_MissingUser(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	body := map[string]any{}
	for k, v := range initiateBody {
		body[k] = v
	}
	body["employee_id"] = uuid.New().String()
	// No X-User-ID header
	rr, _ := do(t, r, "POST", "/api/v1/performance/pip", actor{
		tenant: uuid.New(), role: "manager",
	}, body)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("want 401, got %d", rr.Code)
	}
}

func initiate(t *testing.T, r http.Handler, tenant, manager uuid.UUID, employee uuid.UUID) *domain.PipCase {
	t.Helper()
	body := map[string]any{
		"employee_id":     employee.String(),
		"reason_category": "performance",
		"reason_summary":  "Hedeflerin altinda kalindi.",
		"start_date":      "2026-04-01",
		"duration_days":   30,
	}
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip", actor{
		tenant: tenant, user: manager, role: "manager",
	}, body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("initiate failed: %d %s", rr.Code, string(raw))
	}
	return unmarshalCase(t, raw)
}

func submitLegal(t *testing.T, r http.Handler, tenant, manager, caseID uuid.UUID) *domain.PipCase {
	t.Helper()
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+caseID.String()+"/submit-legal", actor{
		tenant: tenant, user: manager, role: "manager",
	}, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("submit-legal failed: %d %s", rr.Code, string(raw))
	}
	return unmarshalCase(t, raw)
}

func approveLegal(t *testing.T, r http.Handler, tenant, legal, caseID uuid.UUID, fileURL string) *domain.PipCase {
	t.Helper()
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+caseID.String()+"/approve-legal", actor{
		tenant: tenant, user: legal, role: "legal",
	}, map[string]any{"legal_file_url": fileURL})
	if rr.Code != http.StatusOK {
		t.Fatalf("approve-legal failed: %d %s", rr.Code, string(raw))
	}
	return unmarshalCase(t, raw)
}

func TestPipHandler_FullHappyPath_Passed(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	if c.Status != domain.PipStatusPendingLegal {
		t.Fatalf("expected pending_legal, got %s", c.Status)
	}
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/legal.pdf")
	if c.Status != domain.PipStatusActive {
		t.Fatalf("expected active, got %s", c.Status)
	}

	// Add a checkin
	rr, _ := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/checkins", actor{
		tenant: tenant, user: manager, role: "manager",
	}, map[string]any{"week_number": 1, "on_track": "on_track"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("checkin: %d %s", rr.Code, rr.Body.String())
	}

	// Close passed
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/close-passed", actor{
		tenant: tenant, user: manager, role: "manager",
	}, map[string]any{"outcome_reason": "Hedeflere ulasildi."})
	if rr.Code != http.StatusOK {
		t.Fatalf("close passed: %d %s", rr.Code, string(raw))
	}
	c = unmarshalCase(t, raw)
	if c.Status != domain.PipStatusPassed {
		t.Errorf("expected passed, got %s", c.Status)
	}
}

func TestPipHandler_CloseTerminated_RequiresFile(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	// No file URL → 422
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/close-terminated", actor{
		tenant: tenant, user: manager, role: "hr",
	}, map[string]any{"outcome_reason": "Basarisiz."})
	if rr.Code != http.StatusUnprocessableEntity {
		t.Errorf("want 422, got %d %s", rr.Code, string(raw))
	}
}

func TestPipHandler_CloseTerminated_Success(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/close-terminated", actor{
		tenant: tenant, user: manager, role: "hr",
	}, map[string]any{
		"legal_file_url":  "https://docs/fesih.pdf",
		"outcome_reason":  "Basarisiz, uzatma sonrasi.",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d %s", rr.Code, string(raw))
	}
	c = unmarshalCase(t, raw)
	if c.Status != domain.PipStatusTerminated {
		t.Errorf("status: %s", c.Status)
	}
}

func TestPipHandler_ApproveLegal_Forbidden(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, employee := uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	// manager cannot approve
	rr, _ := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/approve-legal", actor{
		tenant: tenant, user: manager, role: "manager",
	}, map[string]any{"legal_file_url": "https://docs/a.pdf"})
	if rr.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", rr.Code)
	}
}

func TestPipHandler_Extend(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/extend", actor{
		tenant: tenant, user: manager, role: "hr",
	}, map[string]any{
		"extension_days": 30,
		"reason":         "Ek sure gerekiyor.",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("extend: %d %s", rr.Code, string(raw))
	}
	c = unmarshalCase(t, raw)
	if c.Status != domain.PipStatusExtended {
		t.Errorf("expected extended, got %s", c.Status)
	}
	if c.DurationDays != 60 {
		t.Errorf("duration: %d", c.DurationDays)
	}
}

func TestPipHandler_Extend_Forbidden(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	rr, _ := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/extend", actor{
		tenant: tenant, user: manager, role: "manager", // manager cannot extend
	}, map[string]any{"extension_days": 30, "reason": "x"})
	if rr.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", rr.Code)
	}
}

func TestPipHandler_Get_EmployeeSeesOwn(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, employee := uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)

	rr, raw := do(t, r, "GET", "/api/v1/performance/pip/"+c.ID.String(), actor{
		tenant: tenant, user: employee, role: "employee",
	}, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d %s", rr.Code, string(raw))
	}
}

func TestPipHandler_Get_EmployeeBlockedFromOthers(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, employee, other := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)

	rr, _ := do(t, r, "GET", "/api/v1/performance/pip/"+c.ID.String(), actor{
		tenant: tenant, user: other, role: "employee",
	}, nil)
	if rr.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", rr.Code)
	}
}

func TestPipHandler_List_RequiresHR(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	rr, _ := do(t, r, "GET", "/api/v1/performance/pip", actor{
		tenant: uuid.New(), user: uuid.New(), role: "manager",
	}, nil)
	if rr.Code != http.StatusForbidden {
		t.Errorf("want 403, got %d", rr.Code)
	}
}

func TestPipHandler_List_HRSees(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, employee := uuid.New(), uuid.New(), uuid.New()
	_ = initiate(t, r, tenant, manager, employee)
	rr, raw := do(t, r, "GET", "/api/v1/performance/pip", actor{
		tenant: tenant, user: uuid.New(), role: "hr",
	}, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d %s", rr.Code, string(raw))
	}
	var resp struct {
		Items []*domain.PipCase `json:"items"`
		Total int               `json:"total"`
	}
	_ = json.Unmarshal(raw, &resp)
	if resp.Total < 1 {
		t.Errorf("expected ≥1 items, got %d", resp.Total)
	}
}

func TestPipHandler_ListMine_EmployeeReadOnly(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, employee := uuid.New(), uuid.New(), uuid.New()
	_ = initiate(t, r, tenant, manager, employee)
	rr, raw := do(t, r, "GET", "/api/v1/performance/pip/mine", actor{
		tenant: tenant, user: employee, role: "employee",
	}, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d %s", rr.Code, string(raw))
	}
	var resp struct {
		Items []*domain.PipCase `json:"items"`
	}
	_ = json.Unmarshal(raw, &resp)
	if len(resp.Items) != 1 {
		t.Errorf("want 1 item, got %d", len(resp.Items))
	}
	if resp.Items[0].EmployeeID != employee {
		t.Errorf("employee mismatch")
	}
}

func TestPipHandler_AcknowledgeCheckin_WithIP(t *testing.T) {
	r, repo := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")
	// Add checkin
	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/checkins", actor{
		tenant: tenant, user: manager, role: "manager",
	}, map[string]any{"week_number": 1, "on_track": "on_track"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("checkin: %d", rr.Code)
	}
	var k domain.PipCheckin
	_ = json.Unmarshal(raw, &k)

	// Ack with X-Forwarded-For header simulating reverse proxy
	req := httptest.NewRequest("POST", "/api/v1/performance/pip/checkins/"+k.ID.String()+"/acknowledge",
		bytes.NewReader([]byte(`{"employee_notes":"Anladım."}`)))
	req.Header.Set("X-Tenant-ID", tenant.String())
	req.Header.Set("X-User-ID", employee.String())
	req.Header.Set("X-User-Role", "employee")
	req.Header.Set("X-Forwarded-For", "203.0.113.42, 10.0.0.1")
	req.Header.Set("User-Agent", "PipTest/1.0")
	req.Header.Set("Content-Type", "application/json")
	rr2 := httptest.NewRecorder()
	r.ServeHTTP(rr2, req)
	if rr2.Code != http.StatusOK {
		t.Fatalf("ack: %d %s", rr2.Code, rr2.Body.String())
	}
	list, _ := repo.ListCheckins(context.Background(), tenant, c.ID)
	if len(list) != 1 || list[0].AcknowledgedByEmployee == nil {
		t.Fatalf("ack not recorded")
	}
	if list[0].AcknowledgeIP == nil || *list[0].AcknowledgeIP != "203.0.113.42" {
		t.Errorf("IP: %v", list[0].AcknowledgeIP)
	}
	if list[0].AcknowledgeUserAgent == nil || *list[0].AcknowledgeUserAgent != "PipTest/1.0" {
		t.Errorf("UA: %v", list[0].AcknowledgeUserAgent)
	}
}

func TestPipHandler_AddGoal_AfterApproval(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	rr, raw := do(t, r, "POST", "/api/v1/performance/pip/"+c.ID.String()+"/goals", actor{
		tenant: tenant, user: manager, role: "manager",
	}, map[string]any{
		"description":       "Haftalik sprint planlamasi",
		"measurable_target": "4 sprint uzunluguna sadik",
		"deadline":          "2026-05-15",
		"priority":          "medium",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("add goal: %d %s", rr.Code, string(raw))
	}
}

func TestPipHandler_PDFExport_ReturnsPdf(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	tenant, manager, legal, employee := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	c := initiate(t, r, tenant, manager, employee)
	c = submitLegal(t, r, tenant, manager, c.ID)
	c = approveLegal(t, r, tenant, legal, c.ID, "https://docs/a.pdf")

	rr, raw := do(t, r, "GET", "/api/v1/performance/pip/"+c.ID.String()+"/pdf", actor{
		tenant: tenant, user: manager, role: "manager",
	}, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("pdf: %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Errorf("content-type: %s", ct)
	}
	if !bytes.HasPrefix(raw, []byte("%PDF-1.4")) {
		t.Errorf("not a PDF; first bytes: %q", raw[:min(16, len(raw))])
	}
	if !bytes.Contains(raw, []byte("%%EOF")) {
		t.Errorf("missing EOF marker")
	}
}

func TestPipHandler_BadCaseID(t *testing.T) {
	r, _ := buildPipTestRouter(t)
	rr, _ := do(t, r, "GET", "/api/v1/performance/pip/not-a-uuid", actor{
		tenant: uuid.New(), user: uuid.New(), role: "hr",
	}, nil)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("want 400, got %d", rr.Code)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
