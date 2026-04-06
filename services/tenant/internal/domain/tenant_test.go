package domain

import "testing"

func TestValidateSlug(t *testing.T) {
	cases := []struct {
		name    string
		slug    string
		wantErr bool
	}{
		{"ok simple", "acme", false},
		{"ok with hyphen", "acme-corp", false},
		{"ok alphanumeric", "acme123", false},
		{"too short", "ab", true},
		{"too long", "a234567890123456789012345678901234567890123456789012345678901234567890", true},
		{"leading hyphen", "-acme", true},
		{"trailing hyphen", "acme-", true},
		{"double hyphen", "ac--me", true},
		{"uppercase", "Acme", true},
		{"space", "ac me", true},
		{"underscore", "ac_me", true},
		{"special", "ac!me", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateSlug(c.slug)
			if (err != nil) != c.wantErr {
				t.Fatalf("ValidateSlug(%q) err=%v, wantErr=%v", c.slug, err, c.wantErr)
			}
		})
	}
}

func TestValidateVKN(t *testing.T) {
	// Generate a valid VKN algorithmically: pick 9 digits, brute-force the 10th.
	validVKN := generateValidVKN("123456789")

	cases := []struct {
		name    string
		vkn     string
		wantErr bool
	}{
		{"too short", "12345", true},
		{"too long", "12345678901", true},
		{"non-digits", "12345abcde", true},
		{"generated valid", validVKN, false},
		{"invalid checksum", "1234567891", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateVKN(c.vkn)
			if (err != nil) != c.wantErr {
				t.Fatalf("ValidateVKN(%q) err=%v, wantErr=%v", c.vkn, err, c.wantErr)
			}
		})
	}
}

// generateValidVKN takes 9 digits and appends the correct 10th checksum digit.
func generateValidVKN(first9 string) string {
	for d := 0; d < 10; d++ {
		candidate := first9 + string(rune('0'+d))
		if ValidateVKN(candidate) == nil {
			return candidate
		}
	}
	return "0000000000"
}

func TestValidateTCKN(t *testing.T) {
	validTCKN := generateValidTCKN("123456789")

	cases := []struct {
		name    string
		tckn    string
		wantErr bool
	}{
		{"too short", "1234567890", true},
		{"too long", "123456789012", true},
		{"starts with 0", "01234567890", true},
		{"non-digit", "1234567890a", true},
		{"generated valid", validTCKN, false},
		{"invalid checksum", "12345678901", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := ValidateTCKN(c.tckn)
			if (err != nil) != c.wantErr {
				t.Fatalf("ValidateTCKN(%q) err=%v, wantErr=%v", c.tckn, err, c.wantErr)
			}
		})
	}
}

// generateValidTCKN takes 9 digits and brute-forces digits 10 and 11.
func generateValidTCKN(first9 string) string {
	for d10 := 0; d10 < 10; d10++ {
		for d11 := 0; d11 < 10; d11++ {
			candidate := first9 + string(rune('0'+d10)) + string(rune('0'+d11))
			if ValidateTCKN(candidate) == nil {
				return candidate
			}
		}
	}
	return "10000000000"
}

func TestNormalizeSlug(t *testing.T) {
	if got := NormalizeSlug("  Acme-Corp  "); got != "acme-corp" {
		t.Fatalf("NormalizeSlug: got %q", got)
	}
}

func TestTenantIsActive(t *testing.T) {
	tr := &Tenant{Status: TenantStatusActive}
	if !tr.IsActive() {
		t.Fatal("expected active")
	}
	tr.Status = TenantStatusTrial
	if !tr.IsActive() {
		t.Fatal("expected trial is active")
	}
	tr.Status = TenantStatusSuspended
	if tr.IsActive() {
		t.Fatal("expected suspended is not active")
	}
}
