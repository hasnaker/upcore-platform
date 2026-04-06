package validator

import "testing"

func TestIsValidTCKN(t *testing.T) {
	tests := []struct {
		name  string
		tckn  string
		valid bool
	}{
		// Known-valid TCKNs (synthetic, generated to satisfy checksum).
		{"valid 12345678950", "12345678950", true},
		{"valid 10000000146", "10000000146", true},
		{"valid 10000000078", "10000000078", true},
		{"valid 29396044276", "29396044276", true},
		{"valid 16295688342", "16295688342", true},

		// Invalid cases.
		{"empty", "", false},
		{"too short", "1234567890", false},
		{"too long", "123456789012", false},
		{"starts with zero", "01234567890", false},
		{"non-digit chars", "1234567890a", false},
		{"whitespace in middle", "12345 67890", false},
		{"bad d10", "12345678900", false},
		{"bad d11", "12345678951", false},
		{"all zeros", "00000000000", false},
		{"all nines", "99999999999", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValidTCKN(tt.tckn)
			if got != tt.valid {
				t.Fatalf("IsValidTCKN(%q)=%v, want %v", tt.tckn, got, tt.valid)
			}
		})
	}
}

func TestIsValidTCKN_TrimsWhitespace(t *testing.T) {
	if !IsValidTCKN("  10000000146  ") {
		t.Fatal("expected whitespace-trimmed input to validate")
	}
}

func TestMaskTCKN(t *testing.T) {
	tests := map[string]string{
		"12345678901": "123*****901",
		"":            "",
		"short":       "short",
	}
	for in, want := range tests {
		if got := MaskTCKN(in); got != want {
			t.Fatalf("MaskTCKN(%q)=%q want %q", in, got, want)
		}
	}
}

// verifyDigits is a helper used while designing tests: it recomputes
// d10 and d11 and is not exported.
func verifyDigits(t *testing.T, tckn string) {
	t.Helper()
	if len(tckn) != 11 {
		t.Fatalf("len=%d", len(tckn))
	}
	d := [11]int{}
	for i := range tckn {
		d[i] = int(tckn[i] - '0')
	}
	d10 := ((d[0]+d[2]+d[4]+d[6]+d[8])*7 - (d[1] + d[3] + d[5] + d[7])) % 10
	if d10 < 0 {
		d10 += 10
	}
	sum := 0
	for i := 0; i < 10; i++ {
		sum += d[i]
	}
	d11 := sum % 10
	if d[9] != d10 || d[10] != d11 {
		t.Logf("tckn %s expected d10=%d d11=%d", tckn, d10, d11)
	}
}

func TestGoldenTCKNs(t *testing.T) {
	for _, tckn := range []string{
		"12345678950", "10000000146", "10000000078", "29396044276", "16295688342",
	} {
		if !IsValidTCKN(tckn) {
			t.Fatalf("golden TCKN %s should be valid", tckn)
		}
		verifyDigits(t, tckn)
	}
}
