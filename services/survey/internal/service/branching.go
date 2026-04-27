package service

import (
	"encoding/json"
)

// BranchRule is one conditional-skip rule attached to a survey_questions row.
// Example: if answer value equals "evet", jump to question_id Y; if between
// 1-3, skip to section_b; if regex matches, end the survey.
type BranchRule struct {
	IfAnswerEquals   *string  `json:"if_answer_equals,omitempty"`
	IfAnswerIn       []string `json:"if_answer_in,omitempty"`
	IfAnswerGTE      *float64 `json:"if_answer_gte,omitempty"`
	IfAnswerLTE      *float64 `json:"if_answer_lte,omitempty"`
	SkipToQuestionID string   `json:"skip_to_question_id,omitempty"`
	SkipToSection    string   `json:"skip_to_section,omitempty"`
	EndSurvey        bool     `json:"end_survey,omitempty"`
}

// ParseBranchingRules decodes the jsonb blob stored on the question.
func ParseBranchingRules(raw []byte) ([]BranchRule, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var rules []BranchRule
	if err := json.Unmarshal(raw, &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

// EvaluateBranching returns the next question/section/end-flag for a given
// answer. Rules are evaluated in order; first match wins.
//
// answer can be string, float64, or nil. Frontend sends both `value` (the
// selected option) and `numeric_value` (1..5 Likert) — so we look at both.
func EvaluateBranching(rules []BranchRule, value string, numeric *float64) (next BranchDecision) {
	for _, r := range rules {
		if r.IfAnswerEquals != nil && value == *r.IfAnswerEquals {
			return apply(r)
		}
		if len(r.IfAnswerIn) > 0 && containsStr(r.IfAnswerIn, value) {
			return apply(r)
		}
		if numeric != nil {
			if r.IfAnswerGTE != nil && *numeric >= *r.IfAnswerGTE {
				return apply(r)
			}
			if r.IfAnswerLTE != nil && *numeric <= *r.IfAnswerLTE {
				return apply(r)
			}
		}
	}
	return BranchDecision{} // no branch — continue linearly
}

// BranchDecision — the engine's output.
type BranchDecision struct {
	SkipToQuestionID string
	SkipToSection    string
	EndSurvey        bool
	Matched          bool
}

func apply(r BranchRule) BranchDecision {
	return BranchDecision{
		SkipToQuestionID: r.SkipToQuestionID,
		SkipToSection:    r.SkipToSection,
		EndSurvey:        r.EndSurvey,
		Matched:          true,
	}
}

func containsStr(xs []string, v string) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}
