package piiredact

import (
	"strings"
	"testing"
)

func TestSanitise_Empty(t *testing.T) {
	if got := Sanitise(""); got != "" {
		t.Errorf("empty in → empty out, got %q", got)
	}
}

func TestSanitise_TCKN(t *testing.T) {
	in := "user tckn=12345678901 filed"
	out := Sanitise(in)
	if strings.Contains(out, "12345678901") {
		t.Errorf("TCKN leaked: %s", out)
	}
	// first 2 + last 2 visible per policy
	if !strings.Contains(out, "12") || !strings.Contains(out, "01") {
		t.Errorf("partial visibility broken: %s", out)
	}
}

func TestSanitise_IBAN(t *testing.T) {
	in := "IBAN: TR330006100519786457841326 ödendi"
	out := Sanitise(in)
	if strings.Contains(out, "TR330006100519786457841326") {
		t.Errorf("IBAN leaked: %s", out)
	}
	if !strings.Contains(out, "TR") || !strings.Contains(out, "26") {
		t.Errorf("partial visibility broken: %s", out)
	}
}

func TestSanitise_Email(t *testing.T) {
	cases := []struct {
		in     string
		hidden string
	}{
		{"ahmet@acme.com", "ahmet"},
		{"a@b.co", "a"},
	}
	for _, c := range cases {
		out := Sanitise(c.in)
		if strings.Contains(out, c.hidden) {
			t.Errorf("email local leaked: in=%q out=%q", c.in, out)
		}
		if !strings.Contains(out, "@") {
			t.Errorf("email @ missing: %s", out)
		}
	}
}

func TestSanitise_Phone(t *testing.T) {
	for _, p := range []string{
		"+90 532 123 45 67",
		"05321234567",
		"05321234567",
		"(532) 123-4567",
	} {
		out := Sanitise(p)
		if out == p {
			t.Errorf("phone not masked: %s", p)
		}
	}
}

func TestSanitise_Card_LastFourOnly(t *testing.T) {
	in := "card 4532 1234 5678 9012 ok"
	out := Sanitise(in)
	if strings.Contains(out, "4532") || strings.Contains(out, "1234") {
		t.Errorf("card leaked: %s", out)
	}
	if !strings.Contains(out, "9012") {
		t.Errorf("last 4 should stay: %s", out)
	}
}

func TestSanitise_MultiplePatternsInOneString(t *testing.T) {
	in := "Kullanıcı 12345678901 email ali@a.co kart 4111111111111111"
	out := Sanitise(in)
	if strings.Contains(out, "12345678901") {
		t.Errorf("TCKN still visible")
	}
	if strings.Contains(out, "ali@a.co") {
		t.Errorf("email still visible")
	}
	if strings.Contains(out, "4111111111111111") {
		t.Errorf("card still visible")
	}
}

func TestSanitise_NoPII_Unchanged(t *testing.T) {
	in := "Sipariş 42 onaylandı; tutar 199.90 TL"
	if out := Sanitise(in); out != in {
		t.Errorf("non-PII must pass through: got %q", out)
	}
}

func TestSanitiseMap_RecursesAndPreservesKeys(t *testing.T) {
	in := map[string]any{
		"user_id":   "uid-123",
		"tckn":      "12345678901",
		"nested":    map[string]any{"email": "user@example.com"},
		"count":     42,
		"not_pii":   "hello",
	}
	out := SanitiseMap(in)
	// keys preserved
	if _, ok := out["tckn"]; !ok {
		t.Errorf("key renamed")
	}
	// value masked
	if out["tckn"].(string) == "12345678901" {
		t.Errorf("tckn not masked: %v", out["tckn"])
	}
	// nested masked
	nested := out["nested"].(map[string]any)
	if nested["email"].(string) == "user@example.com" {
		t.Errorf("nested email not masked")
	}
	// non-string untouched
	if out["count"] != 42 {
		t.Errorf("non-string value changed: %v", out["count"])
	}
	// innocuous untouched
	if out["not_pii"] != "hello" {
		t.Errorf("innocuous changed: %v", out["not_pii"])
	}
}

func TestSanitiseMap_NilIn(t *testing.T) {
	if SanitiseMap(nil) != nil {
		t.Errorf("nil in must return nil")
	}
}
