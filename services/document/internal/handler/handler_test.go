package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/esignature"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/middleware"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/service"
	"github.com/upcore/document/internal/storage"
)

type harness struct {
	router   http.Handler
	docSvc   *service.DocumentService
	verSvc   *service.VersionService
	sigSvc   *service.SignatureService
	expSvc   *service.ExpiryService
	pub      *event.InMemoryPublisher
	docs     *repository.FakeDocumentRepo
	versions *repository.FakeVersionRepo
	blob     *storage.MemoryBlobClient
	tenantID uuid.UUID
	userID   uuid.UUID
}

func newHarness() *harness {
	log := zerolog.Nop()
	docs := repository.NewFakeDocumentRepo()
	versions := repository.NewFakeVersionRepo()
	blob := storage.NewMemoryBlobClient()
	pub := event.NewInMemoryPublisher()
	deps := service.Deps{
		Docs: docs, Versions: versions, Blob: blob, Publisher: pub,
		Container: "documents", MaxBytes: 2 * 1024 * 1024,
		SASReadTTL: 5 * time.Minute, Log: log,
	}
	docSvc := service.NewDocumentService(deps)
	verSvc := service.NewVersionService(deps)
	expSvc := service.NewExpiryService(docs, pub, 30, log)
	providers := map[domain.SignProvider]esignature.ESignatureProvider{
		domain.SignProviderEImzala: esignature.NewStubProvider("eimzala"),
	}
	sigSvc := service.NewSignatureService(service.SignatureServiceDeps{
		Docs: docs, Versions: versions, Blob: blob, Publisher: pub,
		Providers: providers, Container: "documents", Log: log,
	})

	dep := Dependencies{Log: log, Validator: NewValidator()}
	docH := NewDocumentHandler(docSvc, dep)
	upH := NewUploadHandler(docSvc, 2*1024*1024, dep)
	dlH := NewDownloadHandler(docSvc, dep)
	verH := NewVersionHandler(verSvc, 2*1024*1024, dep)
	sigH := NewSignatureHandler(sigSvc, dep)
	expH := NewExpiryHandler(expSvc, dep)

	tenantID := uuid.New()
	userID := uuid.New()

	r := chi.NewRouter()
	r.Use(injectCtx(tenantID, userID))
	r.Route("/api/v1/documents", func(r chi.Router) {
		r.Get("/", docH.List)
		r.Post("/", upH.Post)
		r.Get("/expiring", expH.List)
		r.Post("/expiring/notify", expH.Notify)
		r.Get("/{id}", docH.Get)
		r.Patch("/{id}", docH.Patch)
		r.Delete("/{id}", docH.Delete)
		r.Get("/{id}/download", dlH.Get)
		r.Get("/{id}/versions", verH.List)
		r.Post("/{id}/versions", verH.Create)
		r.Get("/{id}/versions/{version}/download", verH.Download)
		r.Post("/{id}/versions/{version}/restore", verH.Restore)
		r.Post("/{id}/signature", sigH.Initiate)
		r.Get("/{id}/signature/status", sigH.Status)
	})
	r.Delete("/api/v1/signatures/{id}", sigH.Cancel)

	return &harness{
		router: r, docSvc: docSvc, verSvc: verSvc, sigSvc: sigSvc, expSvc: expSvc,
		pub: pub, docs: docs, versions: versions, blob: blob,
		tenantID: tenantID, userID: userID,
	}
}

func injectCtx(tenantID, userID uuid.UUID) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), middleware.CtxTenantID, tenantID)
			ctx = context.WithValue(ctx, middleware.CtxUserID, userID)
			ctx = context.WithValue(ctx, middleware.CtxRole, "hr_admin")
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func multipartBody(t *testing.T, fields map[string]string, fileName, content, contentType string) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		_ = mw.WriteField(k, v)
	}
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="`+fileName+`"`)
	h.Set("Content-Type", contentType)
	fw, err := mw.CreatePart(h)
	if err != nil {
		t.Fatalf("create part: %v", err)
	}
	if _, err := io.Copy(fw, bytes.NewReader([]byte(content))); err != nil {
		t.Fatalf("copy: %v", err)
	}
	_ = mw.Close()
	return &buf, mw.FormDataContentType()
}

func TestUploadHandler_HappyPath(t *testing.T) {
	h := newHarness()
	body, ct := multipartBody(t, map[string]string{
		"type":        "sözleşme",
		"name":        "Ali İş Sözleşmesi",
		"description": "new contract",
		"tags":        "hr,contract",
	}, "contract.pdf", "%PDF-body-bytes", "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got["version"].(float64) != 1 {
		t.Fatalf("unexpected version: %+v", got)
	}
}

func TestUploadHandler_RejectsWrongMime(t *testing.T) {
	h := newHarness()
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme"}, "x.html", "<html/>", "text/html")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("want 415, got %d", rec.Code)
	}
}

func TestDownloadHandler_ReturnsRedirect(t *testing.T) {
	h := newHarness()
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme", "name": "c"}, "c.pdf", "body", "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload failed: %d %s", rec.Code, rec.Body.String())
	}
	var up map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &up)
	id := up["id"].(string)

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/documents/"+id+"/download?redirect=false", nil)
	rec2 := httptest.NewRecorder()
	h.router.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rec2.Code, rec2.Body.String())
	}
	var dl map[string]string
	_ = json.Unmarshal(rec2.Body.Bytes(), &dl)
	if dl["url"] == "" {
		t.Fatalf("missing url in response")
	}
}

func TestVersionHandler_ListAndRestore(t *testing.T) {
	h := newHarness()
	// Upload initial version.
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme", "name": "c"}, "c.pdf", "v1", "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	var up map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &up)
	id := up["id"].(string)
	// Upload v2.
	b2, ct2 := multipartBody(t, map[string]string{"notes": "updated"}, "c.pdf", "v2-body", "application/pdf")
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/documents/"+id+"/versions", b2)
	req2.Header.Set("Content-Type", ct2)
	rec2 := httptest.NewRecorder()
	h.router.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusCreated {
		t.Fatalf("v2 failed: %d %s", rec2.Code, rec2.Body.String())
	}
	// List versions.
	req3 := httptest.NewRequest(http.MethodGet, "/api/v1/documents/"+id+"/versions", nil)
	rec3 := httptest.NewRecorder()
	h.router.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusOK {
		t.Fatalf("list failed: %d", rec3.Code)
	}
	// Restore v1.
	req4 := httptest.NewRequest(http.MethodPost, "/api/v1/documents/"+id+"/versions/1/restore", nil)
	rec4 := httptest.NewRecorder()
	h.router.ServeHTTP(rec4, req4)
	if rec4.Code != http.StatusOK {
		t.Fatalf("restore failed: %d %s", rec4.Code, rec4.Body.String())
	}
}

func TestSignatureHandler_InitiateAndStatus(t *testing.T) {
	h := newHarness()
	// Create document first.
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme", "name": "c"}, "c.pdf", "body", "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	var up map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &up)
	docID := up["id"].(string)

	// Initiate signature.
	payload := `{"signer_employee_id":"` + uuid.NewString() + `","provider":"eimzala","signer_name":"Test","signer_tckn":"11111111110"}`
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/documents/"+docID+"/signature", bytes.NewReader([]byte(payload)))
	req2.Header.Set("Content-Type", "application/json")
	rec2 := httptest.NewRecorder()
	h.router.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusCreated {
		t.Fatalf("initiate failed: %d %s", rec2.Code, rec2.Body.String())
	}
	var sig map[string]any
	_ = json.Unmarshal(rec2.Body.Bytes(), &sig)
	sigID := sig["signature_id"].(string)

	// Status.
	req3 := httptest.NewRequest(http.MethodGet, "/api/v1/documents/"+docID+"/signature/status?signature_id="+sigID, nil)
	rec3 := httptest.NewRecorder()
	h.router.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusOK {
		t.Fatalf("status failed: %d %s", rec3.Code, rec3.Body.String())
	}
	// Cancel.
	req4 := httptest.NewRequest(http.MethodDelete, "/api/v1/signatures/"+sigID, nil)
	rec4 := httptest.NewRecorder()
	h.router.ServeHTTP(rec4, req4)
	if rec4.Code != http.StatusOK {
		t.Fatalf("cancel failed: %d %s", rec4.Code, rec4.Body.String())
	}
}

func TestDocumentHandler_PatchAndDelete(t *testing.T) {
	h := newHarness()
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme", "name": "c"}, "c.pdf", "body", "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	var up map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &up)
	id := up["id"].(string)

	// PATCH.
	patch := `{"title":"Yeni Başlık","tags":["yenilenmis"]}`
	req2 := httptest.NewRequest(http.MethodPatch, "/api/v1/documents/"+id, bytes.NewReader([]byte(patch)))
	req2.Header.Set("Content-Type", "application/json")
	rec2 := httptest.NewRecorder()
	h.router.ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("patch failed: %d %s", rec2.Code, rec2.Body.String())
	}
	// DELETE.
	req3 := httptest.NewRequest(http.MethodDelete, "/api/v1/documents/"+id, nil)
	rec3 := httptest.NewRecorder()
	h.router.ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusNoContent {
		t.Fatalf("delete failed: %d", rec3.Code)
	}
	// GET now 404.
	req4 := httptest.NewRequest(http.MethodGet, "/api/v1/documents/"+id, nil)
	rec4 := httptest.NewRecorder()
	h.router.ServeHTTP(rec4, req4)
	if rec4.Code != http.StatusNotFound {
		t.Fatalf("want 404 after delete, got %d", rec4.Code)
	}
}

func TestExpiryHandler_List(t *testing.T) {
	h := newHarness()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/documents/expiring?within_days=30", nil)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expiring failed: %d %s", rec.Code, rec.Body.String())
	}
}

func TestUploadHandler_TooLarge(t *testing.T) {
	h := newHarness()
	huge := bytes.Repeat([]byte("A"), 3*1024*1024)
	body, ct := multipartBody(t, map[string]string{"type": "sözleşme", "name": "big"}, "big.pdf", string(huge), "application/pdf")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/documents", body)
	req.Header.Set("Content-Type", ct)
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestEntityTooLarge && rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 413/422, got %d", rec.Code)
	}
}

func TestMapError_Mapping(t *testing.T) {
	t.Parallel()
	cases := []struct {
		err  error
		code int
	}{
		{domain.ErrDocumentNotFound, http.StatusNotFound},
		{domain.ErrFileTooLarge, http.StatusRequestEntityTooLarge},
		{domain.ErrUnsupportedMimeType, http.StatusUnsupportedMediaType},
		{domain.ErrEmptyFile, http.StatusUnprocessableEntity},
		{domain.ErrForbidden, http.StatusForbidden},
		{domain.ErrUnauthorized, http.StatusUnauthorized},
		{domain.ErrAlreadyDeleted, http.StatusConflict},
	}
	for _, c := range cases {
		code, _ := mapError(c.err)
		if code != c.code {
			t.Fatalf("err=%v want %d got %d", c.err, c.code, code)
		}
	}
}
