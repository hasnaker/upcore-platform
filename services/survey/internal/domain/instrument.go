package domain

import (
	"time"

	"github.com/google/uuid"
)

// Well-known instrument codes used across the survey service.
const (
	InstrumentBAT12  = "bat12"
	InstrumentCOPSOQ = "copsoq"
	InstrumentUpCap  = "upcap"
)

// ResponseFormat mirrors app.instruments.response_format.
type ResponseFormat string

// Response formats.
const (
	ResponseFormatLikert5        ResponseFormat = "likert_5"
	ResponseFormatLikert6        ResponseFormat = "likert_6"
	ResponseFormatLikert7        ResponseFormat = "likert_7"
	ResponseFormatFrequency5     ResponseFormat = "frequency_5"
	ResponseFormatBinary         ResponseFormat = "binary"
	ResponseFormatMultipleChoice ResponseFormat = "multiple_choice"
	ResponseFormatNumeric        ResponseFormat = "numeric"
	ResponseFormatText           ResponseFormat = "text"
)

// Instrument mirrors app.instruments.
type Instrument struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	Code           string         `db:"code" json:"code"`
	Version        string         `db:"version" json:"version"`
	Locale         string         `db:"locale" json:"locale"`
	NameTR         string         `db:"name_tr" json:"name_tr"`
	NameEN         *string        `db:"name_en" json:"name_en,omitempty"`
	DescriptionTR  *string        `db:"description_tr" json:"description_tr,omitempty"`
	License        *string        `db:"license" json:"license,omitempty"`
	AuthorOrg      *string        `db:"author_org" json:"author_org,omitempty"`
	Citations      JSONB          `db:"citations" json:"citations"`
	ItemCount      int            `db:"item_count" json:"item_count"`
	ScaleMin       int            `db:"scale_min" json:"scale_min"`
	ScaleMax       int            `db:"scale_max" json:"scale_max"`
	ResponseFormat ResponseFormat `db:"response_format" json:"response_format"`
	Active         bool           `db:"active" json:"active"`
	PublishedAt    *time.Time     `db:"published_at" json:"published_at,omitempty"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

// InstrumentItem mirrors app.instrument_items.
type InstrumentItem struct {
	ID           uuid.UUID `db:"id" json:"id"`
	InstrumentID uuid.UUID `db:"instrument_id" json:"instrument_id"`
	ItemCode     string    `db:"item_code" json:"item_code"`
	Seq          int       `db:"seq" json:"seq"`
	Subscale     *string   `db:"subscale" json:"subscale,omitempty"`
	TextTR       string    `db:"text_tr" json:"text_tr"`
	TextEN       *string   `db:"text_en" json:"text_en,omitempty"`
	ReverseCoded bool      `db:"reverse_coded" json:"reverse_coded"`
	MinValue     int       `db:"min_value" json:"min_value"`
	MaxValue     int       `db:"max_value" json:"max_value"`
	AnchorLabels JSONB     `db:"anchor_labels" json:"anchor_labels"`
	Required     bool      `db:"required" json:"required"`
	Active       bool      `db:"active" json:"active"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}
