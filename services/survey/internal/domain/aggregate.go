package domain

import (
	"time"

	"github.com/google/uuid"
)

// SegType classifies the aggregation dimension for survey results.
type SegType string

const (
	SegTypeOverall       SegType = "overall"
	SegTypeDepartment    SegType = "department"
	SegTypePositionLevel SegType = "position_level"
	SegTypeTenureBucket  SegType = "tenure_bucket"
)

// IsValid reports whether the segment type is recognised.
func (s SegType) IsValid() bool {
	switch s {
	case SegTypeOverall, SegTypeDepartment, SegTypePositionLevel, SegTypeTenureBucket:
		return true
	}
	return false
}

// Aggregate corresponds to a row in app.survey_aggregates.
type Aggregate struct {
	ID             uuid.UUID `db:"id" json:"id"`
	TenantID       uuid.UUID `db:"tenant_id" json:"tenant_id"`
	DistributionID uuid.UUID `db:"distribution_id" json:"distribution_id"`
	SegmentType    SegType   `db:"segment_type" json:"segment_type"`
	SegmentKey     string    `db:"segment_key" json:"segment_key"`
	Dimension      string    `db:"dimension" json:"dimension"`
	Mean           float64   `db:"mean" json:"mean"`
	StdDev         float64   `db:"stddev" json:"stddev"`
	N              int       `db:"n" json:"n"`
	ZScore         float64   `db:"z_score" json:"z_score"`
	Percentile     float64   `db:"percentile" json:"percentile"`
	ComputedAt     time.Time `db:"computed_at" json:"computed_at"`
}

// Analytics is the response payload returned for distribution analytics.
type Analytics struct {
	DistributionID uuid.UUID       `json:"distribution_id"`
	ResponseCount  int             `json:"response_count"`
	ResponseRate   float64         `json:"response_rate"`
	Overall        []AggregateStat `json:"overall"`
	Departments    []SegmentStats  `json:"departments,omitempty"`
	Levels         []SegmentStats  `json:"levels,omitempty"`
	TenureBuckets  []SegmentStats  `json:"tenure_buckets,omitempty"`
}

// SegmentStats groups aggregate stats for a named segment.
type SegmentStats struct {
	SegmentKey string          `json:"segment_key"`
	N          int             `json:"n"`
	Suppressed bool            `json:"suppressed"`
	Dimensions []AggregateStat `json:"dimensions,omitempty"`
}

// Trend is a time series of a dimension for a survey.
type Trend struct {
	SurveyCode  string       `json:"survey_code"`
	SegmentType SegType      `json:"segment_type"`
	SegmentKey  string       `json:"segment_key"`
	Dimension   string       `json:"dimension"`
	Series      []TrendPoint `json:"series"`
}

// TrendPoint is a single point in a trend series.
type TrendPoint struct {
	Period string  `json:"period"`
	Mean   float64 `json:"mean"`
	N      int     `json:"n"`
}

// Alert is a burnout risk elevation signal.
type Alert struct {
	TenantID     uuid.UUID `json:"tenant_id"`
	SegmentType  SegType   `json:"segment_type"`
	SegmentKey   string    `json:"segment_key"`
	MeanBurnout  float64   `json:"mean_burnout"`
	DeltaVsPrev  float64   `json:"delta_vs_prev"`
	N            int       `json:"n"`
}
