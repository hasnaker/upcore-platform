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

	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/middleware"
	"github.com/upcore/ats/internal/repository"
	"github.com/upcore/ats/internal/service"
)

func buildRouter(t *testing.T) (*chi.Mux, uuid.UUID) {
	t.Helper()
	reqRepo := repository.NewFakeRequisitionRepo()
	candRepo := repository.NewFakeCandidateRepo()
	appRepo := repository.NewFakeApplicationRepo()
	evtRepo := repository.NewFakeEventRepo()
	interviewRepo := repository.NewFakeInterviewRepo()
	offerRepo := repository.NewFakeOfferRepo()
	stageRepo := repository.NewFakeStageRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()

	reqSvc := service.NewRequisitionService(reqRepo, pub, log)
	candSvc := service.NewCandidateService(candRepo, pub, log)
	appSvc := service.NewApplicationService(appRepo, reqRepo, candRepo, evtRepo, pub, log)
	pipelineSvc := service.NewPipelineService(appRepo, evtRepo, stageRepo, pub, log)
	interviewSvc := service.NewInterviewService(interviewRepo, appRepo, evtRepo, pub, log)
	offerSvc := service.NewOfferService(offerRepo, appRepo, evtRepo, pub, log)

	dep := Dependencies{Log: log, Validator: NewValidator()}
	reqH := NewRequisitionHandler(reqSvc, dep)
	candH := NewCandidateHandler(candSvc, dep)
	appH := NewApplicationHandler(appSvc, pipelineSvc, dep)
	pipelineH := NewPipelineHandler(pipelineSvc, dep)
	interviewH := NewInterviewHandler(interviewSvc, dep)
	offerH := NewOfferHandler(offerSvc, dep)

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
	r.Route("/api/v1/ats", func(r chi.Router) {
		r.Route("/requisitions", func(r chi.Router) {
			r.Get("/", reqH.List)
			r.Post("/", reqH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", reqH.Get)
				r.Patch("/", reqH.Patch)
				r.Post("/open", reqH.Open)
				r.Post("/hold", reqH.Hold)
				r.Post("/close", reqH.Close)
				r.Get("/board", pipelineH.GetBoard)
			})
		})
		r.Route("/candidates", func(r chi.Router) {
			r.Get("/", candH.List)
			r.Post("/", candH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", candH.Get)
				r.Patch("/", candH.Patch)
				r.Delete("/", candH.Delete)
				r.Post("/tags", candH.AddTags)
			})
		})
		r.Route("/applications", func(r chi.Router) {
			r.Get("/", appH.List)
			r.Post("/", appH.Submit)
			r.Post("/bulk-move", appH.BulkMove)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", appH.Get)
				r.Post("/move", appH.Move)
				r.Post("/reject", appH.Reject)
				r.Post("/score", appH.Score)
				r.Post("/notes", appH.AddNote)
				r.Get("/events", appH.ListEvents)
			})
		})
		r.Route("/pipeline/stages", func(r chi.Router) {
			r.Get("/", pipelineH.ListStages)
			r.Post("/", pipelineH.CreateStage)
		})
		r.Route("/interviews", func(r chi.Router) {
			r.Post("/", interviewH.Schedule)
			r.Get("/mine", interviewH.ListMine)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", interviewH.Get)
				r.Post("/cancel", interviewH.Cancel)
				r.Post("/complete", interviewH.Complete)
				r.Post("/feedback", interviewH.SubmitFeedback)
			})
		})
		r.Route("/offers", func(r chi.Router) {
			r.Post("/", offerH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", offerH.Get)
				r.Post("/send", offerH.Send)
				r.Post("/accept", offerH.Accept)
				r.Post("/decline", offerH.Decline)
			})
		})
	})
	return r, tenantID
}

// ---- Requisition tests ----

func TestHandler_CreateAndGetRequisition(t *testing.T) {
	r, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateRequisitionRequest{
		Title:       "Senior Go Developer",
		Description: "We need a Go dev.",
		Headcount:   2,
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)
	assert.Equal(t, "draft", created["status"])

	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/ats/requisitions/"+id, nil)
	r.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusOK, w2.Code)
}

func TestHandler_RequisitionLifecycle(t *testing.T) {
	r, _ := buildRouter(t)

	// Create
	body, _ := json.Marshal(service.CreateRequisitionRequest{
		Title: "Engineer", Description: "desc", Headcount: 1,
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	// Open
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions/"+id+"/open", nil))
	require.Equal(t, http.StatusOK, w2.Code)
	var opened map[string]any
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &opened))
	assert.Equal(t, "open", opened["status"])

	// Hold
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions/"+id+"/hold", nil))
	require.Equal(t, http.StatusOK, w3.Code)

	// Close from on_hold
	w4 := httptest.NewRecorder()
	closeBody, _ := json.Marshal(service.CloseRequisitionRequest{Reason: "filled externally"})
	r.ServeHTTP(w4, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions/"+id+"/close", bytes.NewBuffer(closeBody)))
	require.Equal(t, http.StatusOK, w4.Code)
}

func TestHandler_ListRequisitions(t *testing.T) {
	r, _ := buildRouter(t)
	for _, title := range []string{"Dev1", "Dev2"} {
		body, _ := json.Marshal(service.CreateRequisitionRequest{Title: title, Description: "d", Headcount: 1})
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions", bytes.NewBuffer(body)))
		require.Equal(t, http.StatusCreated, w.Code)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/ats/requisitions", nil))
	require.Equal(t, http.StatusOK, w.Code)
	var out struct {
		Items []any `json:"items"`
		Total int   `json:"total"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	assert.Equal(t, 2, out.Total)
}

// ---- Candidate tests ----

func TestHandler_CreateAndGetCandidate(t *testing.T) {
	r, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateCandidateRequest{
		Email:       "ayse@example.com",
		FirstName:   "Ayse",
		LastName:    "Yilmaz",
		Source:      "direct",
		GDPRConsent: true,
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodGet, "/api/v1/ats/candidates/"+id, nil))
	require.Equal(t, http.StatusOK, w2.Code)
}

func TestHandler_DuplicateCandidateEmail(t *testing.T) {
	r, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateCandidateRequest{
		Email: "dup@example.com", FirstName: "A", LastName: "B", GDPRConsent: true,
	})
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w1.Code)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(body)))
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestHandler_DeleteCandidate_GDPR(t *testing.T) {
	r, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateCandidateRequest{
		Email: "gdpr@example.com", FirstName: "G", LastName: "D", GDPRConsent: true,
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(body)))
	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodDelete, "/api/v1/ats/candidates/"+id, nil))
	assert.Equal(t, http.StatusNoContent, w2.Code)

	// Should be gone.
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodGet, "/api/v1/ats/candidates/"+id, nil))
	assert.Equal(t, http.StatusNotFound, w3.Code)
}

func TestHandler_CandidateTags(t *testing.T) {
	r, _ := buildRouter(t)
	body, _ := json.Marshal(service.CreateCandidateRequest{
		Email: "tags@example.com", FirstName: "T", LastName: "G", GDPRConsent: true,
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(body)))
	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	id := created["id"].(string)

	tagBody, _ := json.Marshal(service.TagsRequest{Tags: []string{"golang", "senior"}})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates/"+id+"/tags", bytes.NewBuffer(tagBody)))
	assert.Equal(t, http.StatusOK, w2.Code)
}

// ---- Application + Pipeline tests ----

func createReqAndCandidate(t *testing.T, r *chi.Mux) (reqID, candID string) {
	t.Helper()

	// Create requisition and open it.
	reqBody, _ := json.Marshal(service.CreateRequisitionRequest{
		Title: "Dev", Description: "d", Headcount: 1,
	})
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions", bytes.NewBuffer(reqBody)))
	require.Equal(t, http.StatusCreated, w1.Code)
	var reqRes map[string]any
	require.NoError(t, json.Unmarshal(w1.Body.Bytes(), &reqRes))
	reqID = reqRes["id"].(string)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions/"+reqID+"/open", nil))
	require.Equal(t, http.StatusOK, w2.Code)

	// Create candidate.
	candBody, _ := json.Marshal(service.CreateCandidateRequest{
		Email: "app" + uuid.New().String()[:8] + "@example.com",
		FirstName: "App", LastName: "Cand", GDPRConsent: true,
	})
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(candBody)))
	require.Equal(t, http.StatusCreated, w3.Code)
	var candRes map[string]any
	require.NoError(t, json.Unmarshal(w3.Body.Bytes(), &candRes))
	candID = candRes["id"].(string)

	return reqID, candID
}

func TestHandler_SubmitApplication(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	assert.Equal(t, "applied", created["current_stage"])
}

func TestHandler_DuplicateApplication(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w1.Code)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestHandler_PipelineTransitions(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	// Submit application.
	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	// Move: applied -> screened
	moveBody, _ := json.Marshal(service.MoveRequest{ToStage: "screened"})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody)))
	require.Equal(t, http.StatusOK, w2.Code)
	var moved map[string]any
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &moved))
	assert.Equal(t, "screened", moved["current_stage"])

	// Move: screened -> assessed
	moveBody2, _ := json.Marshal(service.MoveRequest{ToStage: "assessed"})
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody2)))
	require.Equal(t, http.StatusOK, w3.Code)

	// Move: assessed -> interviewed
	moveBody3, _ := json.Marshal(service.MoveRequest{ToStage: "interviewed"})
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody3)))
	require.Equal(t, http.StatusOK, w4.Code)

	// Move: interviewed -> offered
	moveBody4, _ := json.Marshal(service.MoveRequest{ToStage: "offered"})
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody4)))
	require.Equal(t, http.StatusOK, w5.Code)

	// Move: offered -> hired
	moveBody5, _ := json.Marshal(service.MoveRequest{ToStage: "hired"})
	w6 := httptest.NewRecorder()
	r.ServeHTTP(w6, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody5)))
	require.Equal(t, http.StatusOK, w6.Code)
	var hired map[string]any
	require.NoError(t, json.Unmarshal(w6.Body.Bytes(), &hired))
	assert.Equal(t, "hired", hired["current_stage"])
}

func TestHandler_InvalidTransition(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	// Try invalid: applied -> offered (should fail)
	moveBody, _ := json.Marshal(service.MoveRequest{ToStage: "offered"})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody)))
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestHandler_RejectApplication(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	rejectBody, _ := json.Marshal(service.RejectRequest{Reason: "not a fit"})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/reject", bytes.NewBuffer(rejectBody)))
	require.Equal(t, http.StatusOK, w2.Code)
	var rejected map[string]any
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &rejected))
	assert.Equal(t, "rejected", rejected["current_stage"])
}

func TestHandler_ScoreApplication(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	scoreBody, _ := json.Marshal(service.ScoreRequest{Score: 85.5})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/score", bytes.NewBuffer(scoreBody)))
	assert.Equal(t, http.StatusOK, w2.Code)
}

func TestHandler_ApplicationEvents(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	// Add note.
	noteBody, _ := json.Marshal(service.NoteRequest{Note: "Great candidate"})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/notes", bytes.NewBuffer(noteBody)))
	assert.Equal(t, http.StatusCreated, w2.Code)

	// List events.
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodGet, "/api/v1/ats/applications/"+appID+"/events", nil))
	assert.Equal(t, http.StatusOK, w3.Code)
}

func TestHandler_KanbanBoard(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)

	// Get board.
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodGet, "/api/v1/ats/requisitions/"+reqID+"/board", nil))
	require.Equal(t, http.StatusOK, w2.Code)
}

// ---- Offer tests ----

func TestHandler_OfferLifecycle(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	// Submit app.
	appBody, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(appBody)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	// Create offer.
	offerBody, _ := json.Marshal(service.CreateOfferRequest{
		ApplicationID: uuid.MustParse(appID),
		SalaryTRY:     50000,
		StartDate:     "2026-06-01",
		ExpiryDate:    "2026-07-01",
	})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/offers", bytes.NewBuffer(offerBody)))
	require.Equal(t, http.StatusCreated, w2.Code)
	var offer map[string]any
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &offer))
	offerID := offer["id"].(string)
	assert.Equal(t, "draft", offer["status"])

	// Send offer.
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/offers/"+offerID+"/send", nil))
	require.Equal(t, http.StatusOK, w3.Code)

	// Accept offer.
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, httptest.NewRequest(http.MethodPost, "/api/v1/ats/offers/"+offerID+"/accept", nil))
	require.Equal(t, http.StatusOK, w4.Code)
}

// ---- Not found / bad UUID ----

func TestHandler_NotFound(t *testing.T) {
	r, _ := buildRouter(t)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/ats/requisitions/"+uuid.New().String(), nil))
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestHandler_InvalidUUID(t *testing.T) {
	r, _ := buildRouter(t)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/ats/requisitions/not-a-uuid", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestHandler_RequisitionNotOpen_CannotApply(t *testing.T) {
	r, _ := buildRouter(t)

	// Create requisition (draft, not opened).
	reqBody, _ := json.Marshal(service.CreateRequisitionRequest{
		Title: "Draft Req", Description: "d", Headcount: 1,
	})
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, httptest.NewRequest(http.MethodPost, "/api/v1/ats/requisitions", bytes.NewBuffer(reqBody)))
	require.Equal(t, http.StatusCreated, w1.Code)
	var reqRes map[string]any
	require.NoError(t, json.Unmarshal(w1.Body.Bytes(), &reqRes))
	reqID := reqRes["id"].(string)

	// Create candidate.
	candBody, _ := json.Marshal(service.CreateCandidateRequest{
		Email: "noopen@example.com", FirstName: "N", LastName: "O", GDPRConsent: true,
	})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/candidates", bytes.NewBuffer(candBody)))
	require.Equal(t, http.StatusCreated, w2.Code)
	var candRes map[string]any
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &candRes))
	candID := candRes["id"].(string)

	// Try to apply to draft requisition.
	appBody, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(appBody)))
	assert.Equal(t, http.StatusConflict, w3.Code)
}

func TestHandler_TerminalStage_CannotMove(t *testing.T) {
	r, _ := buildRouter(t)
	reqID, candID := createReqAndCandidate(t, r)

	body, _ := json.Marshal(service.SubmitApplicationRequest{
		CandidateID:   uuid.MustParse(candID),
		RequisitionID: uuid.MustParse(reqID),
	})
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications", bytes.NewBuffer(body)))
	require.Equal(t, http.StatusCreated, w.Code)
	var app map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &app))
	appID := app["id"].(string)

	// Reject the application.
	rejectBody, _ := json.Marshal(service.RejectRequest{Reason: "no"})
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/reject", bytes.NewBuffer(rejectBody)))
	require.Equal(t, http.StatusOK, w2.Code)

	// Try to move from rejected.
	moveBody, _ := json.Marshal(service.MoveRequest{ToStage: "screened"})
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest(http.MethodPost, "/api/v1/ats/applications/"+appID+"/move", bytes.NewBuffer(moveBody)))
	assert.Equal(t, http.StatusConflict, w3.Code)
}
