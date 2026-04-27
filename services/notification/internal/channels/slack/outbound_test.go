package slack

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/notification/internal/domain"
)

type fakeRepo struct {
	inst        *Installation
	slackUserID string
	upsertCalls int32
}

func (f *fakeRepo) GetActiveForTenant(_ context.Context, _ uuid.UUID) (*Installation, error) {
	return f.inst, nil
}

func (f *fakeRepo) ResolveSlackUserID(_ context.Context, _, _ uuid.UUID, _ string) (string, error) {
	return f.slackUserID, nil
}

func (f *fakeRepo) UpsertSlackUserMap(_ context.Context, _, _ uuid.UUID, _, _, _ string) error {
	atomic.AddInt32(&f.upsertCalls, 1)
	return nil
}

func TestChannel_Send_NoInstall(t *testing.T) {
	c := NewChannel(NewClient(zerolog.Nop()), &fakeRepo{inst: nil}, zerolog.Nop())
	n := &domain.Notification{TenantID: uuid.New(), Channel: domain.ChannelSlack}
	_, err := c.Send(context.Background(), n)
	if err == nil {
		t.Fatal("expected error when no install")
	}
}

func TestChannel_Send_DM(t *testing.T) {
	var captured url.Values
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		captured = r.Form
		_, _ = w.Write([]byte(`{"ok":true,"channel":"D01","ts":"111.222"}`))
	}))
	defer srv.Close()
	APIBaseURL = srv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	repo := &fakeRepo{
		inst: &Installation{
			TenantID:         uuid.New(),
			TeamID:           "T01",
			BotToken:         "xoxb-test",
			DefaultChannelID: "C01",
		},
		slackUserID: "U77777",
	}
	client := NewClient(zerolog.Nop())
	c := NewChannel(client, repo, zerolog.Nop())

	uid := uuid.New()
	subj := "Başlık"
	body := "mesaj gövdesi"
	n := &domain.Notification{
		TenantID: repo.inst.TenantID,
		UserID:   &uid,
		Channel:  domain.ChannelSlack,
		Subject:  &subj,
		Body:     &body,
		Payload:  domain.JSONMap{},
	}

	ts, err := c.Send(context.Background(), n)
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	if ts != "111.222" {
		t.Fatalf("unexpected provider id: %s", ts)
	}
	if captured.Get("channel") != "U77777" {
		t.Fatalf("should have posted to resolved Slack user ID, got %s", captured.Get("channel"))
	}
	if !strings.Contains(captured.Get("blocks"), "Başlık") {
		t.Fatalf("missing subject in blocks: %s", captured.Get("blocks"))
	}
}

func TestChannel_Send_InterventionBlockedByOptOut(t *testing.T) {
	repo := &fakeRepo{
		inst: &Installation{
			TenantID:             uuid.New(),
			TeamID:               "T01",
			BotToken:             "xoxb",
			DefaultChannelID:     "C01",
			AllowDMInterventions: false,
		},
		slackUserID: "U111",
	}
	c := NewChannel(NewClient(zerolog.Nop()), repo, zerolog.Nop())

	uid := uuid.New()
	tk := "intervention_consent_request"
	subj := "UpCore Koruma"
	body := "..."
	n := &domain.Notification{
		TenantID:    repo.inst.TenantID,
		UserID:      &uid,
		Channel:     domain.ChannelSlack,
		TemplateKey: &tk,
		Subject:     &subj,
		Body:        &body,
		Payload:     domain.JSONMap{"intervention_type": "CBT", "consent_link": "https://x"},
	}
	_, err := c.Send(context.Background(), n)
	if err == nil || !strings.Contains(err.Error(), "KVKK") {
		t.Fatalf("expected KVKK opt-out error, got %v", err)
	}
}

func TestChannel_Send_WebhookFallback(t *testing.T) {
	var hit atomic.Int32
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hit.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer webhook.Close()

	// Slack API server — should NOT be called because no channel is resolvable.
	apiHit := false
	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiHit = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer apiSrv.Close()
	APIBaseURL = apiSrv.URL
	defer func() { APIBaseURL = "https://slack.com/api" }()

	repo := &fakeRepo{
		inst: &Installation{
			TenantID:           uuid.New(),
			TeamID:             "T01",
			BotToken:           "xoxb",
			IncomingWebhookURL: webhook.URL,
		},
	}
	c := NewChannel(NewClient(zerolog.Nop()), repo, zerolog.Nop())
	subj := "Duyuru"
	body := "merhaba"
	n := &domain.Notification{
		TenantID: repo.inst.TenantID,
		Channel:  domain.ChannelSlack,
		Subject:  &subj,
		Body:     &body,
		Payload:  domain.JSONMap{},
	}
	pid, err := c.Send(context.Background(), n)
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	if hit.Load() != 1 {
		t.Fatalf("webhook not called")
	}
	if apiHit {
		t.Fatalf("chat.postMessage should not be called when channel unresolved")
	}
	if !strings.HasPrefix(pid, "webhook-") {
		t.Fatalf("unexpected provider id %s", pid)
	}
}
