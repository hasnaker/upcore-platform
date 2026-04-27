package slack

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestWelcomeMessage_Shape(t *testing.T) {
	m := WelcomeMessage("Ada", "UpCore A.Ş.", "https://app.upcore.io")
	if m.Text == "" {
		t.Fatal("text fallback required for accessibility + mobile notifs")
	}
	if len(m.Blocks) < 3 {
		t.Fatalf("expected >=3 blocks got %d", len(m.Blocks))
	}
	buf, err := json.Marshal(m.Blocks)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	s := string(buf)
	if !strings.Contains(s, "Ada") || !strings.Contains(s, "UpCore A.Ş.") {
		t.Fatalf("blocks missing interpolated values: %s", s)
	}
	// Ensure Block Kit (type:header/section) is used — no legacy attachments.
	if strings.Contains(s, "\"attachments\"") {
		t.Fatalf("legacy attachments present: %s", s)
	}
}

func TestInterventionDM_MentionsKVKK(t *testing.T) {
	m := InterventionDM("CBT Modülü", "Kısa açıklama", "https://app.upcore.io/consent/xx")
	buf, _ := json.Marshal(m.Blocks)
	if !strings.Contains(string(buf), "KVKK") {
		t.Fatalf("intervention DM must surface KVKK disclosure")
	}
}

func TestPulseReminder_HasButton(t *testing.T) {
	m := PulseReminder("Haftalık Pulse", "https://app.upcore.io/pulse/1", "01.05.2026")
	buf, _ := json.Marshal(m.Blocks)
	if !strings.Contains(string(buf), "Pulse'a Katıl") {
		t.Fatalf("missing CTA button label")
	}
}

func TestPlainDM_Defaults(t *testing.T) {
	m := PlainDM("Başlık", "Body")
	if len(m.Blocks) != 2 {
		t.Fatalf("plain DM should render header+section")
	}
}

func TestMarshalBlocks_RoundTrip(t *testing.T) {
	blocks := []Block{NewHeader("H"), NewSection("*md*"), NewDivider()}
	s, err := marshalBlocks(blocks)
	if err != nil {
		t.Fatal(err)
	}
	var parsed []map[string]any
	if err := json.Unmarshal([]byte(s), &parsed); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(parsed) != 3 || parsed[0]["type"] != "header" || parsed[2]["type"] != "divider" {
		t.Fatalf("unexpected blocks: %s", s)
	}
}
