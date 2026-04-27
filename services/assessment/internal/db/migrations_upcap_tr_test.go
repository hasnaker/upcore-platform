package db

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestUpCapTRValidationMigrationExists verifies the 057 migration file exists
// and declares the mandatory psychometric_scales / items / norms tables plus
// the UpCap-TR v1.0 seed (upc-upcap-validation skill).
//
// This is a static-SQL content test (no live DB required) — it locks the
// migration contract so breaking changes surface in CI.
func TestUpCapTRValidationMigrationExists(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	path := filepath.Join(root, "database", "migrations", "057_psychometric_validation.up.sql")

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration 057: %v", err)
	}
	sql := string(data)

	required := []string{
		// Tables
		"CREATE TABLE IF NOT EXISTS app.psychometric_scales",
		"CREATE TABLE IF NOT EXISTS app.psychometric_items",
		"CREATE TABLE IF NOT EXISTS app.psychometric_norms",
		"CREATE TABLE IF NOT EXISTS app.upcap_pilot_consents",
		"CREATE TABLE IF NOT EXISTS app.upcap_pilot_responses",

		// Mandatory columns per skill spec
		"validated      BOOLEAN",
		"doi            VARCHAR",
		"norm_table     JSONB",
		"factor         VARCHAR(40) NOT NULL",
		"reverse_scored BOOLEAN",
		"percentile_map JSONB",
		"t_score_map    JSONB",

		// Factor check: 3 factors (umut-iyimserlik + dirençlilik + öz-yeterlik)
		"'hope_optimism'",
		"'resilience'",
		"'self_efficacy'",

		// Seed: UpCap-TR v1.0 + 12 items
		"'upcap_tr', '1.0', 'tr-TR'",
		"'upcap_01'",
		"'upcap_12'",
	}

	for _, frag := range required {
		if !strings.Contains(sql, frag) {
			t.Errorf("migration 057 missing required fragment: %q", frag)
		}
	}
}

func TestUpCapTRValidationDownMigrationExists(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	path := filepath.Join(root, "database", "migrations", "057_psychometric_validation.down.sql")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration 057 down: %v", err)
	}
	sql := string(data)

	required := []string{
		"DROP TABLE IF EXISTS app.upcap_pilot_responses",
		"DROP TABLE IF EXISTS app.upcap_pilot_consents",
		"DROP TABLE IF EXISTS app.psychometric_norms",
		"DROP TABLE IF EXISTS app.psychometric_items",
		"DROP TABLE IF EXISTS app.psychometric_scales",
	}
	for _, frag := range required {
		if !strings.Contains(sql, frag) {
			t.Errorf("migration 057 down missing required fragment: %q", frag)
		}
	}
}

func TestUpCapTRValidationSeedsTwelveItems(t *testing.T) {
	t.Parallel()

	root := repoRoot(t)
	path := filepath.Join(root, "database", "migrations", "057_psychometric_validation.up.sql")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration 057: %v", err)
	}
	sql := string(data)

	// 12 upcap items referenced by the item-insert block
	for i := 1; i <= 12; i++ {
		codeStr := fmt.Sprintf("upcap_%02d", i)
		if !strings.Contains(sql, "'"+codeStr+"'") {
			t.Errorf("seed missing item code %s", codeStr)
		}
	}

	// Three reverse-coded items
	reverseCount := strings.Count(sql, "true,  -- REVERSE")
	if reverseCount != 3 {
		t.Errorf("expected 3 reverse-coded items, found %d", reverseCount)
	}
}

// repoRoot walks up from the test file to find the upcore-platform repo root.
func repoRoot(t *testing.T) string {
	t.Helper()

	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}

	d := wd
	for i := 0; i < 8; i++ {
		candidate := filepath.Join(d, "database", "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return d
		}
		parent := filepath.Dir(d)
		if parent == d {
			break
		}
		d = parent
	}
	t.Fatalf("could not locate repo root (database/migrations) from %s", wd)
	return ""
}
