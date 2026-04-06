package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/middleware"
	"github.com/upcore/employee/internal/repository"
	"github.com/upcore/employee/internal/service"
)

func buildRouter(t *testing.T) (*chi.Mux, *repository.FakeEmployeeRepo, uuid.UUID) {
	t.Helper()
	empRepo := repository.NewFakeEmployeeRepo()
	histRepo := repository.NewFakeHistoryRepo()
	ctRepo := repository.NewFakeContactRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()

	empSvc := service.NewEmployeeService(empRepo, histRepo, pub, log)
	searchSvc := service.NewSearchService(empRepo)
	histSvc := service.NewHistoryService(empRepo, histRepo, pub)
	ctSvc := service.NewContactService(empRepo, ctRepo)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	empH := NewEmployeeHandler(empSvc, dep)
	searchH := NewSearchHandler(searchSvc)
	histH := NewHistoryHandler(histSvc)
	ctH := NewContactHandler(ctSvc)

	tenantID := uuid.New()
	userID := uuid.New()
	injector := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tenantID)
			ctx = context.WithValue(ctx, middleware.CtxUserID, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}

	r := chi.NewRouter()
	r.Use(injector)
	r.Route("/api/v1/employees", func(r chi.Router) {
		r.Get("/", empH.List)
		r.Post("/", empH.Create)
		r.Get("/search", searchH.Search)
		r.Get("/me", empH.GetMe)
		r.Get("/{id}", empH.Get)
		r.Patch("/{id}", empH.Patch)
		r.Delete("/{id}", empH.Delete)
		r.Post("/{id}/terminate", empH.Terminate)
		r.Post("/{id}/reinstate", empH.Reinstate)
		r.Get("/{id}/history", histH.List)
		r.Post("/{id}/history", histH.Append)
		r.Get("/{id}/contacts", ctH.List)
		r.Post("/{id}/contacts", ctH.Create)
		r.Patch("/{id}/contacts/{cid}", ctH.Patch)
		r.Delete("/{id}/contacts/{cid}", ctH.Delete)
	})
	return r, empRepo, tenantID
}

func TestHandler_CreateAndGetEmployee(t *testing.T) {
	r, _, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateEmployeeRequest{
		EmployeeNo: "EMP001",
		Ad:         "Ayşe",
		Soyad:      "Yılmaz",
		HireDate:   "2020-01-15",
		TCKN:       "12345678950",
		EmailIs:    "ayse@acme.com",
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	// GET /employees/{id}
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/employees/"+id, nil)
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusOK, w2.Code)
}

func TestHandler_ListEmployees(t *testing.T) {
	r, _, _ := buildRouter(t)

	for i, name := range []string{"Ayşe", "Mehmet"} {
		body, _ := json.Marshal(service.CreateEmployeeRequest{
			EmployeeNo: formatEmpNo(i + 1), Ad: name, Soyad: "X", HireDate: "2020-01-01",
		})
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
		r.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)
	}
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/employees/?page=1&limit=10", nil)
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var out struct {
		Items []any `json:"items"`
		Total int   `json:"total"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, 2, out.Total)
	assert.Len(t, out.Items, 2)
}

func TestHandler_CreateValidationError(t *testing.T) {
	r, _, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "", Soyad: "", HireDate: "bogus",
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestHandler_DuplicateEmployeeNo(t *testing.T) {
	r, _, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusCreated, w1.Code)

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestHandler_Terminate(t *testing.T) {
	r, _, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	tbody, _ := json.Marshal(service.TerminateRequest{
		TerminationDate: "2023-06-30", Reason: "istifa",
	})
	wt := httptest.NewRecorder()
	rt := httptest.NewRequest(http.MethodPost, "/api/v1/employees/"+id+"/terminate", bytes.NewBuffer(tbody))
	r.ServeHTTP(wt, rt)
	assert.Equal(t, http.StatusOK, wt.Code)
}

func TestHandler_Contacts(t *testing.T) {
	r, _, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateEmployeeRequest{
		EmployeeNo: "EMP001", Ad: "A", Soyad: "B", HireDate: "2020-01-01",
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/employees/", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	empID := created["id"].(string)

	cBody, _ := json.Marshal(service.ContactRequest{
		FullName: "Anne", PhonePrimary: "+905551111111", IsPrimary: true, Relationship: "anne",
	})
	w2 := httptest.NewRecorder()
	r2 := httptest.NewRequest(http.MethodPost, "/api/v1/employees/"+empID+"/contacts", bytes.NewBuffer(cBody))
	r.ServeHTTP(w2, r2)
	require.Equal(t, http.StatusCreated, w2.Code)

	w3 := httptest.NewRecorder()
	r3 := httptest.NewRequest(http.MethodGet, "/api/v1/employees/"+empID+"/contacts", nil)
	r.ServeHTTP(w3, r3)
	assert.Equal(t, http.StatusOK, w3.Code)
}

func TestHandler_NotFound(t *testing.T) {
	r, _, _ := buildRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/employees/"+uuid.New().String(), nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestHandler_InvalidUUID(t *testing.T) {
	r, _, _ := buildRouter(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/employees/not-a-uuid", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func formatEmpNo(i int) string {
	s := ""
	for i > 0 {
		s = string(rune('0'+(i%10))) + s
		i /= 10
	}
	for len(s) < 4 {
		s = "0" + s
	}
	return "EMP" + s
}
