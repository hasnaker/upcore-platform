package domain

import (
	"time"

	"github.com/google/uuid"
)

// LeaveCategory enumerates legal categories per 4857 İş Kanunu.
type LeaveCategory string

// Leave categories (must match DB CHECK constraint on app.leave_types.category).
const (
	CategoryYillik    LeaveCategory = "yıllık"
	CategoryMazeret   LeaveCategory = "mazeret"
	CategoryHastalik  LeaveCategory = "hastalık"
	CategoryDogum     LeaveCategory = "doğum"
	CategoryBabalik   LeaveCategory = "babalık"
	CategoryEvlilik   LeaveCategory = "evlilik"
	CategoryOlum      LeaveCategory = "ölüm"
	CategorySut       LeaveCategory = "süt"
	CategoryIdari     LeaveCategory = "idari"
	CategoryUcretsiz  LeaveCategory = "ücretsiz"
	CategoryDiger     LeaveCategory = "diğer"
)

// AccrualMethod enumerates how leave is accrued.
type AccrualMethod string

// Accrual methods.
const (
	AccrualYillikSabit  AccrualMethod = "yıllık_sabit"
	AccrualKidemeBagli  AccrualMethod = "kıdeme_bağlı"
	AccrualOlayBazli    AccrualMethod = "olay_bazlı"
	AccrualAylikTahakkuk AccrualMethod = "aylık_tahakkuk"
)

// Canonical leave type codes (matches seed 007_turkish_leave_types.sql).
const (
	CodeYillik1_5Yil      = "yillik_izin_1_5_yil"
	CodeYillik5_15Yil     = "yillik_izin_5_15_yil"
	CodeYillik15PlusYil   = "yillik_izin_15_plus_yil"
	CodeEvlilik           = "evlilik_izni"
	CodeOlum              = "olum_izni"
	CodeDogumKadin        = "dogum_izni_kadin"
	CodeBabalik           = "babalik_izni"
	CodeSut               = "sut_izni"
	CodeEvlatEdinme       = "evlat_edinme_izni"
	CodeHastalik          = "hastalik_izni"
	CodeMazeret           = "mazeret_izni"
	CodeUcretsiz          = "ucretsiz_izin"
	CodeIdari             = "idari_izin"
	CodeIsArama           = "is_arama_izni"
)

// LeaveType represents a single leave category per tenant (or global when TenantID nil).
type LeaveType struct {
	ID                uuid.UUID      `db:"id" json:"id"`
	TenantID          *uuid.UUID     `db:"tenant_id" json:"tenant_id,omitempty"`
	Code              string         `db:"code" json:"code"`
	NameTR            string         `db:"name_tr" json:"name_tr"`
	NameEN            *string        `db:"name_en" json:"name_en,omitempty"`
	DescriptionTR     *string        `db:"description_tr" json:"description_tr,omitempty"`
	Category          LeaveCategory  `db:"category" json:"category"`
	IsPaid            bool           `db:"is_paid" json:"is_paid"`
	RequiresDocument  bool           `db:"requires_document" json:"requires_document"`
	AccrualMethod     *AccrualMethod `db:"accrual_method" json:"accrual_method,omitempty"`
	MaxDaysPerYear    *int           `db:"max_days_per_year" json:"max_days_per_year,omitempty"`
	MaxDaysPerEvent   *int           `db:"max_days_per_event" json:"max_days_per_event,omitempty"`
	CarryOverAllowed  bool           `db:"carry_over_allowed" json:"carry_over_allowed"`
	CarryOverMaxDays  *int           `db:"carry_over_max_days" json:"carry_over_max_days,omitempty"`
	MinTenureMonths   int            `db:"min_tenure_months" json:"min_tenure_months"`
	LegalReference    *string        `db:"legal_reference" json:"legal_reference,omitempty"`
	Active            bool           `db:"active" json:"active"`
	CreatedAt         time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time      `db:"updated_at" json:"updated_at"`
}

// IsYillik returns true when the leave type is one of the annual-leave buckets.
func (l *LeaveType) IsYillik() bool {
	return l.Category == CategoryYillik
}

// IsGlobal indicates the type is seeded globally (visible to all tenants).
func (l *LeaveType) IsGlobal() bool {
	return l.TenantID == nil
}
