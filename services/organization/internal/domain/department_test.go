package domain

import "testing"

func TestBuildPath(t *testing.T) {
	if got := BuildPath("", "root"); got != "root" {
		t.Fatalf("root path: %q", got)
	}
	if got := BuildPath("root", "tech"); got != "root.tech" {
		t.Fatalf("child path: %q", got)
	}
	if got := BuildPath("root.tech", "backend-team"); got != "root.tech.backend_team" {
		t.Fatalf("hyphen -> underscore: %q", got)
	}
}

func TestCodeToLabel(t *testing.T) {
	cases := map[string]string{
		"tech":     "tech",
		"TECH":     "tech",
		"back-end": "back_end",
		"9teams":   "_9teams",
		" spaced ": "spaced",
	}
	for in, want := range cases {
		if got := CodeToLabel(in); got != want {
			t.Fatalf("CodeToLabel(%q)=%q want %q", in, got, want)
		}
	}
}

func TestIsValidLtreePath(t *testing.T) {
	good := []string{"root", "root.tech", "a.b.c_d"}
	bad := []string{"", "9root", "root..tech", "root.TECH", "root.tech-team"}
	for _, s := range good {
		if !IsValidLtreePath(s) {
			t.Fatalf("expected valid: %q", s)
		}
	}
	for _, s := range bad {
		if IsValidLtreePath(s) {
			t.Fatalf("expected invalid: %q", s)
		}
	}
}

func TestPathDepth(t *testing.T) {
	if PathDepth("") != 0 {
		t.Fatal("empty")
	}
	if PathDepth("root") != 0 {
		t.Fatal("root")
	}
	if PathDepth("root.tech") != 1 {
		t.Fatal("level 1")
	}
	if PathDepth("root.tech.backend.team_a") != 3 {
		t.Fatal("level 3")
	}
}

func TestIsAncestorPath(t *testing.T) {
	if !IsAncestorPath("root.tech", "root.tech.backend") {
		t.Fatal("tech should be ancestor of tech.backend")
	}
	if IsAncestorPath("root.tech", "root.tech") {
		t.Fatal("same path is not ancestor")
	}
	if IsAncestorPath("root.tech", "root.finance") {
		t.Fatal("unrelated")
	}
}

func TestMoveSubpath(t *testing.T) {
	// Move root.tech subtree to root.eng
	if got := MoveSubpath("root.tech", "root.eng", "root.tech"); got != "root.eng" {
		t.Fatalf("root itself: %q", got)
	}
	if got := MoveSubpath("root.tech", "root.eng", "root.tech.backend"); got != "root.eng.backend" {
		t.Fatalf("child: %q", got)
	}
	if got := MoveSubpath("root.tech", "root.eng", "root.tech.backend.team_a"); got != "root.eng.backend.team_a" {
		t.Fatalf("grandchild: %q", got)
	}
	// Unrelated path untouched.
	if got := MoveSubpath("root.tech", "root.eng", "root.finance"); got != "root.finance" {
		t.Fatalf("unrelated: %q", got)
	}
}

func TestValidateCode(t *testing.T) {
	good := []string{"tech", "back-end", "dept_01", "abc"}
	for _, c := range good {
		if err := ValidateCode(c); err != nil {
			t.Fatalf("expected valid %q: %v", c, err)
		}
	}
	bad := []string{"", "a", "-abc", "abc-", "abc def", "TECH", string(make([]byte, 45))}
	for _, c := range bad {
		if err := ValidateCode(c); err == nil {
			t.Fatalf("expected invalid %q", c)
		}
	}
}

func TestDepartmentValidate(t *testing.T) {
	d := &Department{NameTR: "Teknoloji", Code: "tech", Path: "root.tech"}
	if err := d.Validate(); err != nil {
		t.Fatalf("valid: %v", err)
	}
	d2 := &Department{NameTR: "", Code: "tech", Path: "root.tech"}
	if err := d2.Validate(); err == nil {
		t.Fatal("should fail empty name")
	}
	d3 := &Department{NameTR: "X", Code: "tech", Path: "bad..path"}
	if err := d3.Validate(); err == nil {
		t.Fatal("should fail invalid path")
	}
}
