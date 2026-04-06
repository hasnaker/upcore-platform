package service

import (
	"bytes"
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/event"
	"github.com/upcore/document/internal/repository"
	"github.com/upcore/document/internal/storage"
)

func newDocSvc() (*DocumentService, *VersionService, *event.InMemoryPublisher, *repository.FakeDocumentRepo, *repository.FakeVersionRepo, storage.BlobClient) {
	docs := repository.NewFakeDocumentRepo()
	versions := repository.NewFakeVersionRepo()
	blob := storage.NewMemoryBlobClient()
	pub := event.NewInMemoryPublisher()
	deps := Deps{
		Docs: docs, Versions: versions, Blob: blob, Publisher: pub,
		Container: "documents", MaxBytes: 2 * 1024 * 1024,
		SASReadTTL: 5 * time.Minute, SASWriteTTL: 5 * time.Minute,
		Log: zerolog.Nop(),
	}
	return NewDocumentService(deps), NewVersionService(deps), pub, docs, versions, blob
}

func TestDocumentService_Upload_Success(t *testing.T) {
	t.Parallel()
	svc, _, pub, _, vRepo, _ := newDocSvc()
	ctx := context.Background()

	doc, ver, err := svc.Upload(ctx, UploadRequest{
		TenantID:   uuid.New(),
		UploaderID: uuid.New(),
		Category:   domain.DocTypeContract,
		Title:      "Contract",
		MimeType:   "application/pdf",
		Filename:   "contract.pdf",
		Body:       strings.NewReader("PDF-BODY"),
	})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	if doc.CurrentVersion != 1 {
		t.Fatalf("want v1, got %d", doc.CurrentVersion)
	}
	if ver.SizeBytes != int64(len("PDF-BODY")) {
		t.Fatalf("size mismatch: %d", ver.SizeBytes)
	}
	if ver.ChecksumSHA256 == nil || len(*ver.ChecksumSHA256) != 64 {
		t.Fatalf("missing checksum")
	}
	if doc.RetentionUntil == nil {
		t.Fatal("retention default missing")
	}
	if pub.Count(event.TopicDocumentUploaded) != 1 {
		t.Fatalf("expected 1 uploaded event, got %d", pub.Count(event.TopicDocumentUploaded))
	}
	// Version persisted.
	list, _ := vRepo.ListByDocument(ctx, doc.TenantID, doc.ID)
	if len(list) != 1 {
		t.Fatalf("want 1 version, got %d", len(list))
	}
}

func TestDocumentService_Upload_RejectsBadMime(t *testing.T) {
	t.Parallel()
	svc, _, _, _, _, _ := newDocSvc()
	_, _, err := svc.Upload(context.Background(), UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "x",
		MimeType: "text/html", Body: strings.NewReader("x"),
	})
	if err != domain.ErrUnsupportedMimeType {
		t.Fatalf("want ErrUnsupportedMimeType, got %v", err)
	}
}

func TestDocumentService_Upload_RejectsOversize(t *testing.T) {
	t.Parallel()
	svc, _, _, _, _, _ := newDocSvc()
	big := bytes.Repeat([]byte("A"), 3*1024*1024) // > 2MB limit
	_, _, err := svc.Upload(context.Background(), UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "big",
		MimeType: "application/pdf", Body: bytes.NewReader(big),
	})
	if err != domain.ErrFileTooLarge {
		t.Fatalf("want ErrFileTooLarge, got %v", err)
	}
}

func TestDocumentService_Upload_RejectsEmpty(t *testing.T) {
	t.Parallel()
	svc, _, _, _, _, _ := newDocSvc()
	_, _, err := svc.Upload(context.Background(), UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "empty",
		MimeType: "application/pdf", Body: bytes.NewReader(nil),
	})
	if err != domain.ErrEmptyFile {
		t.Fatalf("want ErrEmptyFile, got %v", err)
	}
}

func TestDocumentService_Download_ReturnsSAS(t *testing.T) {
	t.Parallel()
	svc, _, pub, _, _, _ := newDocSvc()
	ctx := context.Background()
	d, _, _ := svc.Upload(ctx, UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "c", MimeType: "application/pdf",
		Body: strings.NewReader("body"),
	})
	url, err := svc.Download(ctx, d.TenantID, d.ID, uuid.New())
	if err != nil {
		t.Fatalf("download: %v", err)
	}
	if !strings.HasPrefix(url, "mem://documents/") {
		t.Fatalf("bad url: %s", url)
	}
	if pub.Count(event.TopicDocumentDownloaded) != 1 {
		t.Fatalf("missing downloaded event")
	}
}

func TestDocumentService_Delete_SoftDeletes(t *testing.T) {
	t.Parallel()
	svc, _, pub, _, _, _ := newDocSvc()
	ctx := context.Background()
	d, _, _ := svc.Upload(ctx, UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "c", MimeType: "application/pdf",
		Body: strings.NewReader("body"),
	})
	if err := svc.Delete(ctx, d.TenantID, d.ID, uuid.New()); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.Get(ctx, d.TenantID, d.ID); err != domain.ErrDocumentNotFound {
		t.Fatalf("still visible: %v", err)
	}
	if pub.Count(event.TopicDocumentDeleted) != 1 {
		t.Fatalf("missing deleted event")
	}
}

func TestVersionService_CreateVersion(t *testing.T) {
	t.Parallel()
	svc, vsvc, pub, _, _, _ := newDocSvc()
	ctx := context.Background()
	d, _, _ := svc.Upload(ctx, UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "c", MimeType: "application/pdf",
		Body: strings.NewReader("v1"),
	})
	ver, err := vsvc.CreateVersion(ctx, VersionUploadRequest{
		TenantID: d.TenantID, DocumentID: d.ID, UploaderID: uuid.New(),
		MimeType: "application/pdf", Filename: "v2.pdf",
		Body: strings.NewReader("v2-body"),
	})
	if err != nil {
		t.Fatalf("new version: %v", err)
	}
	if ver.Version != 2 {
		t.Fatalf("want v2, got %d", ver.Version)
	}
	refreshed, _ := svc.Get(ctx, d.TenantID, d.ID)
	if refreshed.CurrentVersion != 2 {
		t.Fatalf("current version not updated: %d", refreshed.CurrentVersion)
	}
	if pub.Count(event.TopicDocumentVersionCreated) != 1 {
		t.Fatalf("missing version event")
	}
}

func TestVersionService_RestoreVersion(t *testing.T) {
	t.Parallel()
	svc, vsvc, _, _, _, _ := newDocSvc()
	ctx := context.Background()
	d, _, _ := svc.Upload(ctx, UploadRequest{
		TenantID: uuid.New(), UploaderID: uuid.New(),
		Category: domain.DocTypeContract, Title: "c", MimeType: "application/pdf",
		Body: strings.NewReader("v1"),
	})
	_, _ = vsvc.CreateVersion(ctx, VersionUploadRequest{
		TenantID: d.TenantID, DocumentID: d.ID, UploaderID: uuid.New(),
		MimeType: "application/pdf", Body: strings.NewReader("v2"),
	})
	ver, err := vsvc.RestoreVersion(ctx, d.TenantID, d.ID, 1, uuid.New())
	if err != nil {
		t.Fatalf("restore: %v", err)
	}
	if ver.Version != 3 {
		t.Fatalf("want v3 after restore, got %d", ver.Version)
	}
}

func TestSafeTitle(t *testing.T) {
	t.Parallel()
	if got := safeTitle("İş Sözleşmesi 2024!"); got == "" {
		t.Fatalf("empty result")
	}
	if got := safeTitle("!!!"); got != "document" {
		t.Fatalf("fallback wrong: %q", got)
	}
}
