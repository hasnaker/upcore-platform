package subscriber

import (
	"context"
	"strings"
	"testing"
)

func TestNoopMailerRequiresTo(t *testing.T) {
	m := NoopMailer{}
	if err := m.Send(context.Background(), Message{}); err == nil {
		t.Fatalf("expected to_required")
	}
	if err := m.Send(context.Background(), Message{To: "x@y"}); err != nil {
		t.Fatalf("unexpected: %v", err)
	}
}

func TestConfirmationTemplate(t *testing.T) {
	html, text := ConfirmationTemplate("https://status.upcore.io/", "tok123")
	if !strings.Contains(html, "tok123") {
		t.Fatalf("token missing in html: %s", html)
	}
	if !strings.Contains(text, "tok123") {
		t.Fatalf("token missing in text: %s", text)
	}
	if !strings.Contains(html, "upcore.io/status/subscribe/confirm?token=tok123") {
		t.Fatalf("link malformed: %s", html)
	}
}

func TestIncidentNotifyTemplate(t *testing.T) {
	html, text := IncidentNotifyTemplate("https://status.upcore.io", "API down", "investigating", "DB unreachable")
	if !strings.Contains(html, "API down") {
		t.Fatalf("title missing")
	}
	if !strings.Contains(text, "investigating") {
		t.Fatalf("status missing")
	}
}

func TestNewPostmarkReturnsNoopWithoutToken(t *testing.T) {
	t.Setenv("POSTMARK_TOKEN", "")
	m := NewPostmark()
	if _, ok := m.(NoopMailer); !ok {
		t.Fatalf("expected NoopMailer, got %T", m)
	}
}
