package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
	"github.com/upcore/organization/internal/event"
	"github.com/upcore/organization/internal/middleware"
	"github.com/upcore/organization/internal/service"
	"github.com/upcore/organization/internal/testsupport"
)

type harness struct {
	router   http.Handler
	orgSvc   *service.OrgService
	posSvc   *service.PositionService
	teamSvc  *service.TeamService
	reorgSvc *service.ReorgService
	hcSvc    *service.HeadcountService
	tid      uuid.UUID
}

func newHarness() *harness {
	pub := event.NewInMemoryPublisher()
	depts := testsupport.NewFakeDepartmentRepo()
	positions := testsupport.NewFakePositionRepo()
	teams := testsupport.NewFakeTeamRepo()
	rep := testsupport.NewFakeReportingRepo()
	hc := testsupport.NewFakeHeadcountRepo()
	log := zerolog.Nop()

	orgSvc := service.NewOrgService(service.NoopTxRunner{}, depts, pub, 7, log)
	posSvc := service.NewPositionService(positions, pub, log)
	teamSvc := service.NewTeamService(teams, pub, log)
	reorgSvc := service.NewReorgService(rep, pub, log)
	hcSvc := service.NewHeadcountService(hc, depts, pub, log)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	deptH := NewDepartmentHandler(orgSvc, dep)
	posH := NewPositionHandler(posSvc, dep)
	teamH := NewTeamHandler(teamSvc, dep)
	repH := NewReportingHandler(reorgSvc, dep)
	hcH := NewHeadcountHandler(hcSvc, dep)

	r := chi.NewRouter()
	r.Group(func(r chi.Router) {
		r.Use(fakeAuth)
		r.Get("/api/v1/departments", deptH.List)
		r.Get("/api/v1/departments/tree", deptH.GetTree)
		r.Post("/api/v1/departments", deptH.Create)
		r.Get("/api/v1/departments/{id}", deptH.Get)
		r.Patch("/api/v1/departments/{id}", deptH.Patch)
		r.Delete("/api/v1/departments/{id}", deptH.Archive)
		r.Get("/api/v1/departments/{id}/subtree", deptH.GetSubtree)
		r.Get("/api/v1/departments/{id}/ancestors", deptH.GetAncestors)
		r.Get("/api/v1/departments/{id}/children", deptH.GetChildren)
		r.Post("/api/v1/departments/{id}/move", deptH.Move)

		r.Get("/api/v1/positions", posH.List)
		r.Post("/api/v1/positions", posH.Create)
		r.Get("/api/v1/positions/{id}", posH.Get)
		r.Patch("/api/v1/positions/{id}", posH.Patch)
		r.Patch("/api/v1/positions/{id}/jdr", posH.UpdateJDR)
		r.Delete("/api/v1/positions/{id}", posH.Archive)

		r.Get("/api/v1/teams", teamH.List)
		r.Post("/api/v1/teams", teamH.Create)
		r.Get("/api/v1/teams/{id}", teamH.Get)
		r.Post("/api/v1/teams/{id}/members", teamH.AddMember)
		r.Delete("/api/v1/teams/{id}/members/{employeeId}", teamH.RemoveMember)
		r.Get("/api/v1/teams/{id}/members", teamH.ListMembers)

		r.Post("/api/v1/reporting/set-manager", repH.SetManager)
		r.Get("/api/v1/reporting/manager/{employee_id}/reports", repH.GetReports)
		r.Get("/api/v1/reporting/matrix", repH.GetMatrix)

		r.Get("/api/v1/headcount", hcH.GetCurrent)
		r.Post("/api/v1/headcount/snapshot", hcH.TakeSnapshot)
	})

	return &harness{
		router: r, orgSvc: orgSvc, posSvc: posSvc, teamSvc: teamSvc, reorgSvc: reorgSvc, hcSvc: hcSvc,
		tid: uuid.New(),
	}
}

func fakeAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid := r.Header.Get("X-Tenant-ID")
		uid := r.Header.Get("X-User-ID")
		if tid == "" || uid == "" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		tUUID, err := uuid.Parse(tid)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		uUUID, _ := uuid.Parse(uid)
		ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tUUID)
		ctx = context.WithValue(ctx, middleware.CtxUserID, uUUID)
		ctx = context.WithValue(ctx, middleware.CtxRole, "admin")
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (h *harness) do(method, path string, body any) *httptest.ResponseRecorder {
	var buf io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("X-Tenant-ID", h.tid.String())
	req.Header.Set("X-User-ID", uuid.NewString())
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)
	return rr
}

func TestCreateDepartmentEndpoint(t *testing.T) {
	h := newHarness()
	rr := h.do(http.MethodPost, "/api/v1/departments", map[string]any{
		"code":    "root",
		"name_tr": "Organization",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUnauthenticatedRequest(t *testing.T) {
	h := newHarness()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/departments", nil)
	rr := httptest.NewRecorder()
	h.router.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestDepartmentTreeEndpoint(t *testing.T) {
	h := newHarness()
	rr := h.do(http.MethodPost, "/api/v1/departments", map[string]any{"code": "root", "name_tr": "Org"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("create root: %d %s", rr.Code, rr.Body.String())
	}
	rr = h.do(http.MethodGet, "/api/v1/departments/tree", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("tree: %d %s", rr.Code, rr.Body.String())
	}
	var got struct {
		Roots []map[string]any `json:"roots"`
	}
	_ = json.NewDecoder(rr.Body).Decode(&got)
	if len(got.Roots) != 1 {
		t.Fatalf("expected 1 root, got %d", len(got.Roots))
	}
}

func TestMoveDepartmentCycleDetected(t *testing.T) {
	h := newHarness()
	mk := func(code string, parent *string) string {
		body := map[string]any{"code": code, "name_tr": code}
		if parent != nil {
			body["parent_id"] = *parent
		}
		rr := h.do(http.MethodPost, "/api/v1/departments", body)
		if rr.Code != http.StatusCreated {
			t.Fatalf("create %s: %d %s", code, rr.Code, rr.Body.String())
		}
		var d domain.Department
		_ = json.NewDecoder(rr.Body).Decode(&d)
		return d.ID.String()
	}
	root := mk("root", nil)
	tech := mk("tech", &root)
	backend := mk("backend", &tech)

	rr := h.do(http.MethodPost, "/api/v1/departments/"+tech+"/move", map[string]any{
		"new_parent_id": backend,
	})
	if rr.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreatePositionEndpoint(t *testing.T) {
	h := newHarness()
	body := map[string]any{
		"code":    "be-eng",
		"title_tr": "Backend",
		"jdr_talepler": map[string]int{
			"is_yuku": 7, "duygusal_yuk": 5, "bilissel_yuk": 8,
			"zaman_baskisi": 6, "rol_catismasi": 3, "rol_belirsizligi": 3,
		},
		"jdr_kaynaklar": map[string]int{
			"ozerklik": 8, "geri_bildirim": 7, "sosyal_destek": 7,
			"gelisim_firsati": 8, "beceri_cesitliligi": 8, "gorev_onemi": 7,
		},
	}
	rr := h.do(http.MethodPost, "/api/v1/positions", body)
	if rr.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreatePositionInvalidJDR(t *testing.T) {
	h := newHarness()
	body := map[string]any{
		"code":     "bad",
		"title_tr": "Bad",
		"jdr_talepler": map[string]int{"is_yuku": 99},
	}
	rr := h.do(http.MethodPost, "/api/v1/positions", body)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", rr.Code)
	}
}

func TestHeadcountSnapshotEndpoint(t *testing.T) {
	h := newHarness()
	body := map[string]any{
		"counts": []map[string]any{
			{"department_id": uuid.NewString(), "total_count": 5, "active_count": 5, "terminated_count": 0},
		},
	}
	rr := h.do(http.MethodPost, "/api/v1/headcount/snapshot", body)
	if rr.Code != http.StatusAccepted {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestSetManagerEndpoint(t *testing.T) {
	h := newHarness()
	body := map[string]any{
		"employee_id": uuid.NewString(),
		"manager_id":  uuid.NewString(),
		"type":        "solid",
	}
	rr := h.do(http.MethodPost, "/api/v1/reporting/set-manager", body)
	if rr.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreateTeamAndAddMember(t *testing.T) {
	h := newHarness()
	rr := h.do(http.MethodPost, "/api/v1/teams", map[string]any{"name": "Squad A"})
	if rr.Code != http.StatusCreated {
		t.Fatalf("create team: %d %s", rr.Code, rr.Body.String())
	}
	var team domain.Team
	_ = json.NewDecoder(rr.Body).Decode(&team)
	rr = h.do(http.MethodPost, "/api/v1/teams/"+team.ID.String()+"/members", map[string]any{
		"employee_id": uuid.NewString(),
		"role":        "member",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("add member: %d %s", rr.Code, rr.Body.String())
	}
}
