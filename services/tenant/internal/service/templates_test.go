package service

import "testing"

func TestLoadTemplates_AllFourLoad(t *testing.T) {
	all, err := LoadTemplates()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	expected := []string{"belediye", "holding", "tech", "kobi"}
	for _, code := range expected {
		if _, ok := all[code]; !ok {
			t.Fatalf("missing template %q", code)
		}
	}
	if len(all) != 4 {
		t.Fatalf("expected 4 templates, got %d", len(all))
	}
}

func TestGetTemplate_Belediye_HasMemur657(t *testing.T) {
	tpl, ok := GetTemplate("belediye")
	if !ok {
		t.Fatal("belediye not found")
	}
	if tpl.DefaultPlanID != "platform" {
		t.Fatalf("plan=%s", tpl.DefaultPlanID)
	}
	hasMemur := false
	for _, p := range tpl.Positions {
		if p.PersonnelType == "MEMUR_657" {
			hasMemur = true
			break
		}
	}
	if !hasMemur {
		t.Fatal("belediye template missing MEMUR_657 position")
	}
}

func TestGetTemplate_Holding_HasMatrixManagerFlag(t *testing.T) {
	tpl, ok := GetTemplate("holding")
	if !ok {
		t.Fatal("holding not found")
	}
	if !tpl.FeatureFlags["matrix_manager"] {
		t.Fatal("holding should enable matrix_manager flag")
	}
}

func TestGetTemplate_CaseInsensitive(t *testing.T) {
	if _, ok := GetTemplate("  Tech  "); !ok {
		t.Fatal("expected case-insensitive/trimmed lookup")
	}
}

func TestGetTemplate_Unknown_ReturnsFalse(t *testing.T) {
	if _, ok := GetTemplate("doesnotexist"); ok {
		t.Fatal("expected false for unknown code")
	}
}

func TestListTemplates_Sorted(t *testing.T) {
	out := ListTemplates()
	if len(out) != 4 {
		t.Fatalf("expected 4, got %d", len(out))
	}
	want := []string{"belediye", "holding", "kobi", "tech"}
	for i, t2 := range out {
		if t2.Code != want[i] {
			t.Fatalf("index %d: got %s want %s", i, t2.Code, want[i])
		}
	}
}

func TestTemplates_AllHaveKVKKNotices(t *testing.T) {
	for _, tpl := range ListTemplates() {
		if len(tpl.KVKKNotices) < 3 {
			t.Fatalf("%s has only %d notices, expected >=3", tpl.Code, len(tpl.KVKKNotices))
		}
	}
}
