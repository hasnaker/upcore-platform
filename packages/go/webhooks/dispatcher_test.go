package webhooks

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestMatchesAny_Wildcard(t *testing.T) {
	cases := []struct {
		event    string
		patterns []string
		want     bool
	}{
		{"employee.created", []string{"*"}, true},
		{"employee.created", []string{"employee.created"}, true},
		{"employee.updated", []string{"employee.created"}, false},
		{"employee.updated", []string{"employee.*"}, true},
		{"employee.updated", []string{"employee.*", "leave.*"}, true},
		{"leave.requested", []string{"employee.*"}, false},
		{"any.event", []string{}, false},
		// Prefix trick: "employee." should not match "employ.something"
		{"employed.user", []string{"employee.*"}, false},
	}
	for _, c := range cases {
		got := matchesAny(c.event, c.patterns)
		if got != c.want {
			t.Errorf("%s vs %v: want %v, got %v", c.event, c.patterns, c.want, got)
		}
	}
}

func TestSignHMAC_Deterministic(t *testing.T) {
	body := []byte(`{"event":"x"}`)
	secret := "whsec_top_secret"

	got := signHMAC(secret, body)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	want := hex.EncodeToString(mac.Sum(nil))

	if got != want {
		t.Errorf("signature mismatch:\n  got:  %s\n  want: %s", got, want)
	}
	// Same input + same secret → same signature (determinism).
	if got2 := signHMAC(secret, body); got2 != got {
		t.Errorf("signature must be deterministic")
	}
	// Different body → different signature.
	if signHMAC(secret, []byte(`tampered`)) == got {
		t.Errorf("tampered body must produce different signature")
	}
	// Different secret → different signature.
	if signHMAC("other_secret", body) == got {
		t.Errorf("different secret must produce different signature")
	}
}
