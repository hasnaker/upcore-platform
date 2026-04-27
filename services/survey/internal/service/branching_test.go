package service

import (
	"testing"
)

func strPtr(s string) *string { return &s }
func f64Ptr(f float64) *float64 { return &f }

func TestParseBranchingRules_EmptyReturnsNil(t *testing.T) {
	rules, err := ParseBranchingRules(nil)
	if err != nil || rules != nil {
		t.Fatalf("expected nil/nil, got %v/%v", rules, err)
	}
}

func TestParseBranchingRules_InvalidJSON(t *testing.T) {
	_, err := ParseBranchingRules([]byte("not-json"))
	if err == nil {
		t.Fatal("expected unmarshal error")
	}
}

func TestEvaluateBranching_EqualsMatch(t *testing.T) {
	rules := []BranchRule{
		{IfAnswerEquals: strPtr("evet"), SkipToSection: "finalize"},
	}
	d := EvaluateBranching(rules, "evet", nil)
	if !d.Matched || d.SkipToSection != "finalize" {
		t.Fatalf("expected match+finalize, got %+v", d)
	}
}

func TestEvaluateBranching_InMatch(t *testing.T) {
	rules := []BranchRule{
		{IfAnswerIn: []string{"hayir", "emin_degilim"}, EndSurvey: true},
	}
	d := EvaluateBranching(rules, "emin_degilim", nil)
	if !d.Matched || !d.EndSurvey {
		t.Fatalf("expected end_survey, got %+v", d)
	}
}

func TestEvaluateBranching_GTEAndLTE(t *testing.T) {
	rules := []BranchRule{
		{IfAnswerGTE: f64Ptr(4.0), SkipToQuestionID: "q-high"},
		{IfAnswerLTE: f64Ptr(2.0), SkipToQuestionID: "q-low"},
	}
	high := EvaluateBranching(rules, "", f64Ptr(5.0))
	if !high.Matched || high.SkipToQuestionID != "q-high" {
		t.Fatalf("expected q-high, got %+v", high)
	}
	low := EvaluateBranching(rules, "", f64Ptr(1.0))
	if !low.Matched || low.SkipToQuestionID != "q-low" {
		t.Fatalf("expected q-low, got %+v", low)
	}
	mid := EvaluateBranching(rules, "", f64Ptr(3.0))
	if mid.Matched {
		t.Fatalf("expected no match for mid, got %+v", mid)
	}
}

func TestEvaluateBranching_FirstMatchWins(t *testing.T) {
	rules := []BranchRule{
		{IfAnswerEquals: strPtr("evet"), SkipToSection: "a"},
		{IfAnswerEquals: strPtr("evet"), SkipToSection: "b"},
	}
	d := EvaluateBranching(rules, "evet", nil)
	if d.SkipToSection != "a" {
		t.Fatalf("expected first-match 'a', got %q", d.SkipToSection)
	}
}

func TestEvaluateBranching_NoMatchReturnsZero(t *testing.T) {
	rules := []BranchRule{
		{IfAnswerEquals: strPtr("hayir")},
	}
	d := EvaluateBranching(rules, "evet", nil)
	if d.Matched || d.EndSurvey || d.SkipToSection != "" {
		t.Fatalf("expected zero decision, got %+v", d)
	}
}

func TestContainsStr_SearchHelper(t *testing.T) {
	if !containsStr([]string{"a", "b", "c"}, "b") {
		t.Fatal("expected b to be found")
	}
	if containsStr([]string{"a", "b"}, "z") {
		t.Fatal("z should not be found")
	}
	if containsStr(nil, "x") {
		t.Fatal("nil slice must return false")
	}
}
