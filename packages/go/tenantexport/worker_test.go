package tenantexport

import (
	"bytes"
	"context"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

type fakeUploader struct {
	lastKey, lastType string
	lastBody          []byte
	retURL            string
	retErr            error
}

func (f *fakeUploader) Upload(_ context.Context, key string, body []byte, ct string) (string, error) {
	f.lastKey = key
	f.lastBody = make([]byte, len(body))
	copy(f.lastBody, body)
	f.lastType = ct
	return f.retURL, f.retErr
}

func TestNewWorker_Defaults(t *testing.T) {
	w := NewWorker(nil, &fakeUploader{}, zerolog.Nop())
	if w.Interval != 30*time.Second {
		t.Errorf("default interval: want 30s, got %v", w.Interval)
	}
	if w.Uploader == nil {
		t.Errorf("uploader must be stored")
	}
}

func TestExportTables_ContainsCriticalSets(t *testing.T) {
	required := []string{
		"employees", "audit_events", "payroll_slips",
		"documents", "performance_reviews", "applications",
	}
	present := map[string]bool{}
	for _, tbl := range exportTables {
		present[tbl] = true
	}
	for _, r := range required {
		if !present[r] {
			t.Errorf("exportTables missing required table: %s", r)
		}
	}
}

func TestFakeUploader_CapturesInputsForAssertions(t *testing.T) {
	// Not an exported function test — this ensures our fake is wired for use
	// in downstream integration tests.
	up := &fakeUploader{retURL: "https://blob/x.zip"}
	url, err := up.Upload(context.Background(), "k", []byte("hello"), "application/zip")
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	if url != "https://blob/x.zip" {
		t.Errorf("url roundtrip failed")
	}
	if !bytes.Equal(up.lastBody, []byte("hello")) {
		t.Errorf("body capture failed")
	}
	if up.lastType != "application/zip" {
		t.Errorf("content type capture failed")
	}
}
