// Package domain defines the core performance types + business rules.
package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// Shared types
// ============================================================================

// JSONB wraps raw JSON bytes for pg jsonb columns.
type JSONB []byte

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	if !json.Valid(j) {
		return nil, fmt.Errorf("jsonb: invalid")
	}
	return []byte(j), nil
}

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB("{}")
		return nil
	}
	switch v := src.(type) {
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSONB(cp)
	case string:
		*j = JSONB([]byte(v))
	default:
		return fmt.Errorf("jsonb: unsupported type %T", src)
	}
	return nil
}

// MarshalJSON returns the raw bytes.
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

// UnmarshalJSON captures raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSONB(cp)
	return nil
}

// ============================================================================
// Sentinel errors
// ============================================================================

var (
	ErrNotFound      = errors.New("not found")
	ErrValidation    = errors.New("validation failed")
	ErrConflict      = errors.New("conflict")
	ErrForbidden     = errors.New("forbidden")
	ErrInvalidStatus = errors.New("invalid status transition")
)

// ValidationError aggregates field-level errors.
type ValidationError struct{ Fields map[string]string }

// Error satisfies error.
func (e *ValidationError) Error() string { return "validation failed" }

// NewValidationError constructs the error.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}

// ============================================================================
// Performance Cycle
// ============================================================================

// CycleType enumerates the cadence of review cycles.
type CycleType string

const (
	CycleMonthly   CycleType = "monthly"
	CycleQuarterly CycleType = "quarterly"
	CycleBiannual  CycleType = "biannual"
	CycleAnnual    CycleType = "annual"
	CycleCustom    CycleType = "custom"
)

// IsValid reports whether the cycle type is known.
func (c CycleType) IsValid() bool {
	switch c {
	case CycleMonthly, CycleQuarterly, CycleBiannual, CycleAnnual, CycleCustom:
		return true
	}
	return false
}

// CycleStatus enumerates the cycle lifecycle states.
type CycleStatus string

const (
	CycleStatusPlanning    CycleStatus = "planning"
	CycleStatusGoalSetting CycleStatus = "goal_setting"
	CycleStatusActive      CycleStatus = "active"
	CycleStatusInReview    CycleStatus = "in_review"
	CycleStatusCalibration CycleStatus = "calibration"
	CycleStatusClosed      CycleStatus = "closed"
	CycleStatusArchived    CycleStatus = "archived"
)

// IsValid reports whether the status is known.
func (s CycleStatus) IsValid() bool {
	switch s {
	case CycleStatusPlanning, CycleStatusGoalSetting, CycleStatusActive,
		CycleStatusInReview, CycleStatusCalibration, CycleStatusClosed, CycleStatusArchived:
		return true
	}
	return false
}

// PerformanceCycle mirrors app.performance_cycles.
type PerformanceCycle struct {
	ID               uuid.UUID   `db:"id" json:"id"`
	TenantID         uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	NameTR           string      `db:"name_tr" json:"name_tr"`
	CycleType        CycleType   `db:"cycle_type" json:"cycle_type"`
	PeriodStart      time.Time   `db:"period_start" json:"period_start"`
	PeriodEnd        time.Time   `db:"period_end" json:"period_end"`
	GoalSettingStart *time.Time  `db:"goal_setting_start" json:"goal_setting_start,omitempty"`
	GoalSettingEnd   *time.Time  `db:"goal_setting_end" json:"goal_setting_end,omitempty"`
	ReviewStart      *time.Time  `db:"review_start" json:"review_start,omitempty"`
	ReviewEnd        *time.Time  `db:"review_end" json:"review_end,omitempty"`
	Status           CycleStatus `db:"status" json:"status"`
	Description      *string     `db:"description" json:"description,omitempty"`
	CreatedBy        *uuid.UUID  `db:"created_by" json:"created_by,omitempty"`
	CreatedAt        time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time   `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (c *PerformanceCycle) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Status == "" {
		c.Status = CycleStatusPlanning
	}
}

// Validate enforces invariants.
func (c *PerformanceCycle) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(c.NameTR) == "" {
		fields["name_tr"] = "required"
	}
	if !c.CycleType.IsValid() {
		fields["cycle_type"] = "invalid"
	}
	if c.PeriodStart.IsZero() {
		fields["period_start"] = "required"
	}
	if c.PeriodEnd.IsZero() {
		fields["period_end"] = "required"
	} else if c.PeriodEnd.Before(c.PeriodStart) {
		fields["period_end"] = "must_be_after_start"
	}
	if !c.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// AdvanceStatus reports the next logical status for this cycle.
func (c *PerformanceCycle) AdvanceStatus() CycleStatus {
	switch c.Status {
	case CycleStatusPlanning:
		return CycleStatusGoalSetting
	case CycleStatusGoalSetting:
		return CycleStatusActive
	case CycleStatusActive:
		return CycleStatusInReview
	case CycleStatusInReview:
		return CycleStatusCalibration
	case CycleStatusCalibration:
		return CycleStatusClosed
	case CycleStatusClosed:
		return CycleStatusArchived
	}
	return c.Status
}

// ============================================================================
// Goals (SMART)
// ============================================================================

// GoalCategory enumerates goal classifications.
type GoalCategory string

const (
	GoalIndividual  GoalCategory = "individual"
	GoalTeam        GoalCategory = "team"
	GoalStrategic   GoalCategory = "strategic"
	GoalDevelopment GoalCategory = "development"
	GoalBehavioral  GoalCategory = "behavioral"
)

// IsValid reports whether the category is known.
func (g GoalCategory) IsValid() bool {
	switch g {
	case GoalIndividual, GoalTeam, GoalStrategic, GoalDevelopment, GoalBehavioral:
		return true
	}
	return false
}

// GoalStatus enumerates goal lifecycle states.
type GoalStatus string

const (
	GoalDraft     GoalStatus = "draft"
	GoalActive    GoalStatus = "active"
	GoalAtRisk    GoalStatus = "at_risk"
	GoalOnTrack   GoalStatus = "on_track"
	GoalCompleted GoalStatus = "completed"
	GoalMissed    GoalStatus = "missed"
	GoalDeferred  GoalStatus = "deferred"
	GoalCancelled GoalStatus = "cancelled"
)

// IsValid reports whether the goal status is known.
func (s GoalStatus) IsValid() bool {
	switch s {
	case GoalDraft, GoalActive, GoalAtRisk, GoalOnTrack, GoalCompleted, GoalMissed, GoalDeferred, GoalCancelled:
		return true
	}
	return false
}

// MetricType enumerates how a goal is measured.
type MetricType string

const (
	MetricNumeric     MetricType = "numeric"
	MetricPercentage  MetricType = "percentage"
	MetricBoolean     MetricType = "boolean"
	MetricMilestone   MetricType = "milestone"
	MetricQualitative MetricType = "qualitative"
)

// IsValid reports whether the metric is known.
func (m MetricType) IsValid() bool {
	switch m {
	case MetricNumeric, MetricPercentage, MetricBoolean, MetricMilestone, MetricQualitative:
		return true
	}
	return false
}

// PerformanceGoal mirrors app.performance_goals.
type PerformanceGoal struct {
	ID             uuid.UUID    `db:"id" json:"id"`
	TenantID       uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	CycleID        uuid.UUID    `db:"cycle_id" json:"cycle_id"`
	EmployeeID     uuid.UUID    `db:"employee_id" json:"employee_id"`
	Category       GoalCategory `db:"category" json:"category"`
	TitleTR        string       `db:"title_tr" json:"title_tr"`
	Description    *string      `db:"description" json:"description,omitempty"`
	MetricType     MetricType   `db:"metric_type" json:"metric_type"`
	TargetValue    *float64     `db:"target_value" json:"target_value,omitempty"`
	CurrentValue   float64      `db:"current_value" json:"current_value"`
	Unit           *string      `db:"unit" json:"unit,omitempty"`
	WeightPct      int          `db:"weight_pct" json:"weight_pct"`
	DueDate        *time.Time   `db:"due_date" json:"due_date,omitempty"`
	Status         GoalStatus   `db:"status" json:"status"`
	ProgressPct    int          `db:"progress_pct" json:"progress_pct"`
	AlignedWithID  *uuid.UUID   `db:"aligned_with_id" json:"aligned_with_id,omitempty"`
	ManagerID      *uuid.UUID   `db:"manager_id" json:"manager_id,omitempty"`
	Metadata       JSONB        `db:"metadata" json:"metadata"`
	CreatedAt      time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time    `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (g *PerformanceGoal) ApplyDefaults() {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	if g.Status == "" {
		g.Status = GoalDraft
	}
	if len(g.Metadata) == 0 {
		g.Metadata = JSONB("{}")
	}
}

// Validate enforces invariants.
func (g *PerformanceGoal) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(g.TitleTR) == "" {
		fields["title_tr"] = "required"
	}
	if !g.Category.IsValid() {
		fields["category"] = "invalid"
	}
	if !g.MetricType.IsValid() {
		fields["metric_type"] = "invalid"
	}
	if !g.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if g.WeightPct < 0 || g.WeightPct > 100 {
		fields["weight_pct"] = "must_be_0_to_100"
	}
	if g.ProgressPct < 0 || g.ProgressPct > 100 {
		fields["progress_pct"] = "must_be_0_to_100"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ComputeProgress returns the progress % based on current vs target
// (clamped to 0..100). Only meaningful for numeric/percentage metrics.
func (g *PerformanceGoal) ComputeProgress() int {
	if g.TargetValue == nil || *g.TargetValue == 0 {
		return g.ProgressPct
	}
	p := (g.CurrentValue / *g.TargetValue) * 100.0
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return int(p)
}

// ============================================================================
// OKR
// ============================================================================

// OKROwnerType enumerates OKR scope levels.
type OKROwnerType string

const (
	OKROwnerCompany    OKROwnerType = "company"
	OKROwnerDepartment OKROwnerType = "department"
	OKROwnerTeam       OKROwnerType = "team"
	OKROwnerIndividual OKROwnerType = "individual"
)

// IsValid reports whether the owner type is known.
func (t OKROwnerType) IsValid() bool {
	switch t {
	case OKROwnerCompany, OKROwnerDepartment, OKROwnerTeam, OKROwnerIndividual:
		return true
	}
	return false
}

// OKRStatus enumerates OKR lifecycle states.
type OKRStatus string

const (
	OKRDraft     OKRStatus = "draft"
	OKRActive    OKRStatus = "active"
	OKROnTrack   OKRStatus = "on_track"
	OKRAtRisk    OKRStatus = "at_risk"
	OKROffTrack  OKRStatus = "off_track"
	OKRCompleted OKRStatus = "completed"
	OKRAbandoned OKRStatus = "abandoned"
)

// IsValid reports whether the OKR status is known.
func (s OKRStatus) IsValid() bool {
	switch s {
	case OKRDraft, OKRActive, OKROnTrack, OKRAtRisk, OKROffTrack, OKRCompleted, OKRAbandoned:
		return true
	}
	return false
}

// OKR mirrors app.okrs.
type OKR struct {
	ID              uuid.UUID    `db:"id" json:"id"`
	TenantID        uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	CycleID         uuid.UUID    `db:"cycle_id" json:"cycle_id"`
	OwnerType       OKROwnerType `db:"owner_type" json:"owner_type"`
	OwnerID         *uuid.UUID   `db:"owner_id" json:"owner_id,omitempty"`
	ParentOKRID     *uuid.UUID   `db:"parent_okr_id" json:"parent_okr_id,omitempty"`
	ObjectiveTR     string       `db:"objective_tr" json:"objective_tr"`
	Description     *string      `db:"description" json:"description,omitempty"`
	QuarterLabel    *string      `db:"quarter_label" json:"quarter_label,omitempty"`
	ConfidenceScore *int         `db:"confidence_score" json:"confidence_score,omitempty"`
	Status          OKRStatus    `db:"status" json:"status"`
	ProgressPct     int          `db:"progress_pct" json:"progress_pct"`
	CreatedBy       *uuid.UUID   `db:"created_by" json:"created_by,omitempty"`
	CreatedAt       time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time    `db:"updated_at" json:"updated_at"`

	KeyResults []OKRKeyResult `db:"-" json:"key_results,omitempty"`
}

// ApplyDefaults fills DB-required defaults.
func (o *OKR) ApplyDefaults() {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.Status == "" {
		o.Status = OKRDraft
	}
}

// Validate enforces invariants.
func (o *OKR) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(o.ObjectiveTR) == "" {
		fields["objective_tr"] = "required"
	}
	if !o.OwnerType.IsValid() {
		fields["owner_type"] = "invalid"
	}
	if !o.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if o.ProgressPct < 0 || o.ProgressPct > 100 {
		fields["progress_pct"] = "must_be_0_to_100"
	}
	if o.ConfidenceScore != nil && (*o.ConfidenceScore < 0 || *o.ConfidenceScore > 100) {
		fields["confidence_score"] = "must_be_0_to_100"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ComputeProgressFromKRs returns the average progress across the OKR's key results.
// Empty KR list yields 0 (not "done").
func (o *OKR) ComputeProgressFromKRs() int {
	if len(o.KeyResults) == 0 {
		return 0
	}
	sum := 0
	for _, kr := range o.KeyResults {
		sum += kr.ProgressPct
	}
	return sum / len(o.KeyResults)
}

// OKRKeyResult mirrors app.okr_key_results.
type OKRKeyResult struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	OKRID           uuid.UUID  `db:"okr_id" json:"okr_id"`
	TitleTR         string     `db:"title_tr" json:"title_tr"`
	MetricType      MetricType `db:"metric_type" json:"metric_type"`
	StartValue      float64    `db:"start_value" json:"start_value"`
	TargetValue     float64    `db:"target_value" json:"target_value"`
	CurrentValue    float64    `db:"current_value" json:"current_value"`
	Unit            *string    `db:"unit" json:"unit,omitempty"`
	OwnerID         *uuid.UUID `db:"owner_id" json:"owner_id,omitempty"`
	ProgressPct     int        `db:"progress_pct" json:"progress_pct"`
	ConfidenceScore *int       `db:"confidence_score" json:"confidence_score,omitempty"`
	Status          OKRStatus  `db:"status" json:"status"`
	OrderIndex      int        `db:"order_index" json:"order_index"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (k *OKRKeyResult) ApplyDefaults() {
	if k.ID == uuid.Nil {
		k.ID = uuid.New()
	}
	if k.Status == "" {
		k.Status = OKRActive
	}
}

// ComputeProgress returns progress % based on current vs target from start baseline.
func (k *OKRKeyResult) ComputeProgress() int {
	if k.TargetValue == k.StartValue {
		return k.ProgressPct
	}
	p := (k.CurrentValue - k.StartValue) / (k.TargetValue - k.StartValue) * 100.0
	if p < 0 {
		return 0
	}
	if p > 100 {
		return 100
	}
	return int(p)
}

// ============================================================================
// 9-Box Grid
// ============================================================================

// Band enumerates the low/medium/high buckets for performance and potential.
type Band string

const (
	BandLow    Band = "low"
	BandMedium Band = "medium"
	BandHigh   Band = "high"
)

// IsValid reports whether the band is known.
func (b Band) IsValid() bool {
	switch b {
	case BandLow, BandMedium, BandHigh:
		return true
	}
	return false
}

// TalentSegment enumerates the 9 boxes.
type TalentSegment string

const (
	SegUnderperformer      TalentSegment = "underperformer"       // low / low
	SegInconsistentPlayer  TalentSegment = "inconsistent_player"  // med / low
	SegDilemma             TalentSegment = "dilemma"              // high / low
	SegReliableContributor TalentSegment = "reliable_contributor" // low / med
	SegCorePlayer          TalentSegment = "core_player"          // med / med
	SegHighPotential       TalentSegment = "high_potential"       // high / med
	SegSolidPerformer      TalentSegment = "solid_performer"      // low / high
	SegHighPerformer       TalentSegment = "high_performer"       // med / high
	SegStar                TalentSegment = "star"                 // high / high
)

// IsValid reports whether the segment is known.
func (s TalentSegment) IsValid() bool {
	switch s {
	case SegUnderperformer, SegInconsistentPlayer, SegDilemma,
		SegReliableContributor, SegCorePlayer, SegHighPotential,
		SegSolidPerformer, SegHighPerformer, SegStar:
		return true
	}
	return false
}

// NineBoxAssignment mirrors app.nine_box_assignments.
type NineBoxAssignment struct {
	ID                uuid.UUID     `db:"id" json:"id"`
	TenantID          uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	CycleID           uuid.UUID     `db:"cycle_id" json:"cycle_id"`
	EmployeeID        uuid.UUID     `db:"employee_id" json:"employee_id"`
	PerformanceBand   Band          `db:"performance_band" json:"performance_band"`
	PotentialBand     Band          `db:"potential_band" json:"potential_band"`
	BoxLabel          string        `db:"box_label" json:"box_label"`
	TalentSegment     *TalentSegment `db:"talent_segment" json:"talent_segment,omitempty"`
	CalibrationNotes  *string       `db:"calibration_notes" json:"calibration_notes,omitempty"`
	RecommendedAction *string       `db:"recommended_action" json:"recommended_action,omitempty"`
	SetBy             *uuid.UUID    `db:"set_by" json:"set_by,omitempty"`
	CalibratedAt      *time.Time    `db:"calibrated_at" json:"calibrated_at,omitempty"`
	CreatedAt         time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time     `db:"updated_at" json:"updated_at"`
}

// SegmentFromBands returns the talent segment for the (performance, potential) pair.
func SegmentFromBands(perf, pot Band) TalentSegment {
	switch {
	case perf == BandHigh && pot == BandHigh:
		return SegStar
	case perf == BandHigh && pot == BandMedium:
		return SegHighPerformer
	case perf == BandHigh && pot == BandLow:
		return SegSolidPerformer
	case perf == BandMedium && pot == BandHigh:
		return SegHighPotential
	case perf == BandMedium && pot == BandMedium:
		return SegCorePlayer
	case perf == BandMedium && pot == BandLow:
		return SegReliableContributor
	case perf == BandLow && pot == BandHigh:
		return SegDilemma
	case perf == BandLow && pot == BandMedium:
		return SegInconsistentPlayer
	default:
		return SegUnderperformer
	}
}

// LabelForSegment returns a Turkish display label for a segment.
func LabelForSegment(s TalentSegment) string {
	switch s {
	case SegStar:
		return "Yıldız"
	case SegHighPerformer:
		return "Yüksek Performans"
	case SegSolidPerformer:
		return "Sağlam Performans"
	case SegHighPotential:
		return "Yüksek Potansiyel"
	case SegCorePlayer:
		return "Kilit Oyuncu"
	case SegReliableContributor:
		return "Güvenilir Katkıda Bulunan"
	case SegDilemma:
		return "Dilemma"
	case SegInconsistentPlayer:
		return "Tutarsız"
	case SegUnderperformer:
		return "Düşük Performans"
	}
	return string(s)
}

// BandFromRating maps a 1..5 rating to a Band using the 2.5 / 4.0 thresholds.
func BandFromRating(rating float64) Band {
	switch {
	case rating < 2.5:
		return BandLow
	case rating < 4.0:
		return BandMedium
	default:
		return BandHigh
	}
}

// ApplyDefaults fills DB-required defaults + derived segment/label.
func (a *NineBoxAssignment) ApplyDefaults() {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	if a.TalentSegment == nil || *a.TalentSegment == "" {
		seg := SegmentFromBands(a.PerformanceBand, a.PotentialBand)
		a.TalentSegment = &seg
	}
	if strings.TrimSpace(a.BoxLabel) == "" {
		a.BoxLabel = LabelForSegment(*a.TalentSegment)
	}
}

// Validate enforces invariants.
func (a *NineBoxAssignment) Validate() error {
	fields := map[string]string{}
	if !a.PerformanceBand.IsValid() {
		fields["performance_band"] = "invalid"
	}
	if !a.PotentialBand.IsValid() {
		fields["potential_band"] = "invalid"
	}
	if a.TalentSegment != nil && !a.TalentSegment.IsValid() {
		fields["talent_segment"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ============================================================================
// Review
// ============================================================================

// ReviewType enumerates review sources.
type ReviewType string

const (
	ReviewSelf        ReviewType = "self"
	ReviewManager     ReviewType = "manager"
	ReviewPeer        ReviewType = "peer"
	ReviewSubordinate ReviewType = "subordinate"
	ReviewSkipLevel   ReviewType = "skip_level"
	ReviewExternal    ReviewType = "external"
)

// IsValid reports whether the type is known.
func (r ReviewType) IsValid() bool {
	switch r {
	case ReviewSelf, ReviewManager, ReviewPeer, ReviewSubordinate, ReviewSkipLevel, ReviewExternal:
		return true
	}
	return false
}

// ReviewStatus enumerates review lifecycle states.
type ReviewStatus string

const (
	ReviewDraft        ReviewStatus = "draft"
	ReviewSubmitted    ReviewStatus = "submitted"
	ReviewAcknowledged ReviewStatus = "acknowledged"
	ReviewCalibrated   ReviewStatus = "calibrated"
	ReviewFinal        ReviewStatus = "final"
	ReviewDisputed     ReviewStatus = "disputed"
)

// IsValid reports whether the status is known.
func (s ReviewStatus) IsValid() bool {
	switch s {
	case ReviewDraft, ReviewSubmitted, ReviewAcknowledged, ReviewCalibrated, ReviewFinal, ReviewDisputed:
		return true
	}
	return false
}

// PerformanceReview mirrors app.performance_reviews.
type PerformanceReview struct {
	ID                uuid.UUID     `db:"id" json:"id"`
	TenantID          uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	CycleID           uuid.UUID     `db:"cycle_id" json:"cycle_id"`
	EmployeeID        uuid.UUID     `db:"employee_id" json:"employee_id"`
	ReviewerID        uuid.UUID     `db:"reviewer_id" json:"reviewer_id"`
	ReviewType        ReviewType    `db:"review_type" json:"review_type"`
	PerformanceRating *float64      `db:"performance_rating" json:"performance_rating,omitempty"`
	PotentialRating   *float64      `db:"potential_rating" json:"potential_rating,omitempty"`
	OverallComment    *string       `db:"overall_comment" json:"overall_comment,omitempty"`
	Strengths         *string       `db:"strengths" json:"strengths,omitempty"`
	GrowthAreas       *string       `db:"growth_areas" json:"growth_areas,omitempty"`
	GoalsAchievedPct  *int          `db:"goals_achieved_pct" json:"goals_achieved_pct,omitempty"`
	Status            ReviewStatus  `db:"status" json:"status"`
	SubmittedAt       *time.Time    `db:"submitted_at" json:"submitted_at,omitempty"`
	AcknowledgedAt    *time.Time    `db:"acknowledged_at" json:"acknowledged_at,omitempty"`
	FinalisedAt       *time.Time    `db:"finalised_at" json:"finalised_at,omitempty"`
	Metadata          JSONB         `db:"metadata" json:"metadata"`
	CreatedAt         time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time     `db:"updated_at" json:"updated_at"`

	Feedback []ReviewFeedback `db:"-" json:"feedback,omitempty"`
}

// ApplyDefaults fills DB-required defaults.
func (r *PerformanceReview) ApplyDefaults() {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	if r.Status == "" {
		r.Status = ReviewDraft
	}
	if r.ReviewType == "" {
		r.ReviewType = ReviewManager
	}
	if len(r.Metadata) == 0 {
		r.Metadata = JSONB("{}")
	}
}

// Validate enforces invariants.
func (r *PerformanceReview) Validate() error {
	fields := map[string]string{}
	if !r.ReviewType.IsValid() {
		fields["review_type"] = "invalid"
	}
	if !r.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if r.PerformanceRating != nil && (*r.PerformanceRating < 1 || *r.PerformanceRating > 5) {
		fields["performance_rating"] = "must_be_1_to_5"
	}
	if r.PotentialRating != nil && (*r.PotentialRating < 1 || *r.PotentialRating > 5) {
		fields["potential_rating"] = "must_be_1_to_5"
	}
	if r.GoalsAchievedPct != nil && (*r.GoalsAchievedPct < 0 || *r.GoalsAchievedPct > 100) {
		fields["goals_achieved_pct"] = "must_be_0_to_100"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// CanTransitionTo reports whether the review may change to the target status.
func (r *PerformanceReview) CanTransitionTo(next ReviewStatus) bool {
	if !next.IsValid() || r.Status == next {
		return false
	}
	switch r.Status {
	case ReviewDraft:
		return next == ReviewSubmitted || next == ReviewDisputed
	case ReviewSubmitted:
		return next == ReviewAcknowledged || next == ReviewCalibrated || next == ReviewDisputed
	case ReviewAcknowledged:
		return next == ReviewCalibrated || next == ReviewFinal || next == ReviewDisputed
	case ReviewCalibrated:
		return next == ReviewFinal || next == ReviewDisputed
	case ReviewDisputed:
		return next == ReviewCalibrated || next == ReviewFinal
	}
	return false
}

// ReviewFeedback mirrors app.review_feedback (per-competency detail).
type ReviewFeedback struct {
	ID              uuid.UUID `db:"id" json:"id"`
	TenantID        uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ReviewID        uuid.UUID `db:"review_id" json:"review_id"`
	CompetencyCode  string    `db:"competency_code" json:"competency_code"`
	CompetencyNameTR string   `db:"competency_name_tr" json:"competency_name_tr"`
	Rating          float64   `db:"rating" json:"rating"`
	Comment         *string   `db:"comment" json:"comment,omitempty"`
	Evidence        *string   `db:"evidence" json:"evidence,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (f *ReviewFeedback) ApplyDefaults() {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
}

// Validate enforces invariants.
func (f *ReviewFeedback) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(f.CompetencyCode) == "" {
		fields["competency_code"] = "required"
	}
	if strings.TrimSpace(f.CompetencyNameTR) == "" {
		fields["competency_name_tr"] = "required"
	}
	if f.Rating < 1 || f.Rating > 5 {
		fields["rating"] = "must_be_1_to_5"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
