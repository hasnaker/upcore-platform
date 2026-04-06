package domain

import "github.com/google/uuid"

// RespType classifies the expected answer format for a survey item.
type RespType string

const (
	RespTypeLikert5        RespType = "likert5"
	RespTypeLikert7        RespType = "likert7"
	RespTypeNPS            RespType = "nps"
	RespTypeMultipleChoice RespType = "multiple_choice"
	RespTypeText           RespType = "text"
)

// IsValid reports whether the response type is recognised.
func (t RespType) IsValid() bool {
	switch t {
	case RespTypeLikert5, RespTypeLikert7, RespTypeNPS,
		RespTypeMultipleChoice, RespTypeText:
		return true
	}
	return false
}

// Item corresponds to a row in app.survey_items.
type Item struct {
	ID              uuid.UUID `db:"id" json:"id"`
	SurveyID        uuid.UUID `db:"survey_id" json:"survey_id"`
	ItemCode        string    `db:"item_code" json:"item_code"`
	TextTR          string    `db:"text_tr" json:"text_tr"`
	TextEN          *string   `db:"text_en" json:"text_en,omitempty"`
	Dimension       string    `db:"dimension" json:"dimension"`
	ResponseType    RespType  `db:"response_type" json:"response_type"`
	ResponseOptions JSONB     `db:"response_options" json:"response_options"`
	ReverseScored   bool      `db:"reverse_scored" json:"reverse_scored"`
	OrderIndex      int       `db:"order_index" json:"order_index"`
}

// Validate checks required fields and enum values.
func (i *Item) Validate() error {
	fields := map[string]string{}
	if i.SurveyID == uuid.Nil {
		fields["survey_id"] = "required"
	}
	if i.ItemCode == "" {
		fields["item_code"] = "required"
	}
	if i.TextTR == "" {
		fields["text_tr"] = "required"
	}
	if i.ResponseType != "" && !i.ResponseType.IsValid() {
		fields["response_type"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
