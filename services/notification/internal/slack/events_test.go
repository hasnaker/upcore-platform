package slack

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	channelslack "github.com/upcore/notification/internal/channels/slack"
)

func TestParseMention(t *testing.T) {
	uid, display, rem := parseMention("<@U12345|ada> harika iş bugün")
	if uid != "U12345" || display != "ada" || rem != "harika iş bugün" {
		t.Fatalf("unexpected parse: %q %q %q", uid, display, rem)
	}
	uid2, _, _ := parseMention("no mention here")
	if uid2 != "" {
		t.Fatal("should not match bare text")
	}
	uid3, _, rem3 := parseMention("<@UBARE> merhaba")
	if uid3 != "UBARE" || rem3 != "merhaba" {
		t.Fatalf("bare-id parse failed: %q %q", uid3, rem3)
	}
}

// --- Events handler tests use a minimal mock for DB + feedback poster ---

type fakeFeedback struct {
	calls int32
	last  struct {
		tenant           uuid.UUID
		from, to, msg, t string
	}
}

func (f *fakeFeedback) PostFeedback(_ context.Context, tenantID uuid.UUID, fromSlackUserID, toSlackUserID, message, teamID string) error {
	atomic.AddInt32(&f.calls, 1)
	f.last.tenant = tenantID
	f.last.from = fromSlackUserID
	f.last.to = toSlackUserID
	f.last.msg = message
	f.last.t = teamID
	return nil
}

// lightweightEvents builds an EventsHandler with a fake installation lookup
// that returns an in-memory install. We avoid touching sqlx by giving the
// handler a custom lookup via closure.
type testEvents struct {
	handler  *EventsHandler
	feedback *fakeFeedback

	slackSrv *httptest.Server
	lastAPI  struct {
		path   string
		params url.Values
	}
	mu sync.Mutex
}

// unused-in-test-but-required-for-compile references.
var _ = context.Background

func newTestEvents(t *testing.T) *testEvents {
	t.Helper()

	te := &testEvents{feedback: &fakeFeedback{}}

	// Slack API stub that responds to conversations.open + chat.postMessage.
	te.slackSrv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		te.mu.Lock()
		te.lastAPI.path = r.URL.Path
		te.lastAPI.params = r.Form
		te.mu.Unlock()
		switch r.URL.Path {
		case "/conversations.open":
			_, _ = w.Write([]byte(`{"ok":true,"channel":{"id":"D12345"}}`))
		default:
			_, _ = w.Write([]byte(`{"ok":true,"ts":"1.2"}`))
		}
	}))
	t.Cleanup(func() { te.slackSrv.Close() })
	channelslack.APIBaseURL = te.slackSrv.URL
	t.Cleanup(func() { channelslack.APIBaseURL = "https://slack.com/api" })

	client := channelslack.NewClient(zerolog.Nop())

	// Build the handler with nil Repository + nil db. We substitute the
	// lookupInstallByTeam function through a direct field patch via a
	// wrapper struct because the real handler uses h.db internally. For
	// these unit tests we bypass the real handler's ServeHTTP and directly
	// test handlePulseCommand / handleFeedbackCommand by constructing a
	// stub handler that fakes the install lookup.
	te.handler = &EventsHandler{
		repo:          nil,
		client:        client,
		feedback:      te.feedback,
		db:            nil,
		publicBaseURL: "https://upcore.test",
		log:           zerolog.Nop(),
	}
	return te
}

// TestHandleFeedbackCommand exercises the parsing + feedback publishing path.
// The DB-backed install lookup is stubbed via a wrapping helper.
func TestHandleFeedbackCommand(t *testing.T) {
	te := newTestEvents(t)
	tenantID := uuid.New()

	// Shim the install lookup via a drop-in wrapper.
	wrap := &wrapperEvents{real: te.handler, tenantID: tenantID}

	form := url.Values{}
	form.Set("command", "/upcore-feedback")
	form.Set("team_id", "T-1")
	form.Set("user_id", "U-FROM")
	form.Set("text", "<@U-TO|ada> iyi iş çıkardın")
	body := form.Encode()

	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	wrap.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("unexpected status %d body %s", rr.Code, rr.Body.String())
	}
	if atomic.LoadInt32(&te.feedback.calls) != 1 {
		t.Fatalf("feedback poster not called")
	}
	if te.feedback.last.from != "U-FROM" || te.feedback.last.to != "U-TO" {
		t.Fatalf("unexpected feedback: %+v", te.feedback.last)
	}
	if !strings.Contains(te.feedback.last.msg, "iyi iş") {
		t.Fatalf("message lost: %+v", te.feedback.last)
	}
	if te.feedback.last.tenant != tenantID {
		t.Fatalf("tenant mismatch")
	}
	if !strings.Contains(rr.Body.String(), "iletildi") {
		t.Fatalf("confirmation text missing: %s", rr.Body.String())
	}
}

func TestHandleFeedbackCommand_MalformedInput(t *testing.T) {
	te := newTestEvents(t)
	wrap := &wrapperEvents{real: te.handler, tenantID: uuid.New()}

	form := url.Values{}
	form.Set("command", "/upcore-feedback")
	form.Set("team_id", "T-1")
	form.Set("user_id", "U-FROM")
	form.Set("text", "mesaj mention siz")
	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader([]byte(form.Encode())))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	wrap.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if atomic.LoadInt32(&te.feedback.calls) != 0 {
		t.Fatalf("should not have called feedback")
	}
	if !strings.Contains(rr.Body.String(), "Kullanım") {
		t.Fatalf("usage hint missing: %s", rr.Body.String())
	}
}

func TestURLVerificationChallenge(t *testing.T) {
	te := newTestEvents(t)
	wrap := &wrapperEvents{real: te.handler, tenantID: uuid.New()}
	body := []byte(`{"type":"url_verification","challenge":"ch4llenge"}`)
	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	wrap.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if strings.TrimSpace(rr.Body.String()) != "ch4llenge" {
		t.Fatalf("challenge not echoed: %q", rr.Body.String())
	}
}

func TestUnknownSlashCommand(t *testing.T) {
	te := newTestEvents(t)
	wrap := &wrapperEvents{real: te.handler, tenantID: uuid.New()}
	form := url.Values{}
	form.Set("command", "/upcore-nope")
	req := httptest.NewRequest(http.MethodPost, "/events", bytes.NewReader([]byte(form.Encode())))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	wrap.ServeHTTP(rr, req)
	if !strings.Contains(rr.Body.String(), "tanınmadı") {
		t.Fatalf("expected unknown response: %s", rr.Body.String())
	}
}
