package domain

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ConsentType enumerates KVKK çalışan rıza tipleri (versiyon 1).
type ConsentType string

const (
	ConsentDataProcessing        ConsentType = "data_processing"
	ConsentPerformanceEvaluation ConsentType = "performance_evaluation"
	ConsentBurnoutMonitoring     ConsentType = "burnout_monitoring"
	ConsentAnalytics             ConsentType = "analytics"
	ConsentAIRecommendations     ConsentType = "ai_recommendations"
)

// ValidConsentTypes returns the catalog order.
func ValidConsentTypes() []ConsentType {
	return []ConsentType{
		ConsentDataProcessing,
		ConsentPerformanceEvaluation,
		ConsentBurnoutMonitoring,
		ConsentAnalytics,
		ConsentAIRecommendations,
	}
}

// Valid returns nil if the consent type is known.
func (c ConsentType) Valid() error {
	for _, v := range ValidConsentTypes() {
		if v == c {
			return nil
		}
	}
	return fmt.Errorf("%w: consent_type=%q", ErrInvalidInput, string(c))
}

// ConsentStatus enumerates the lifecycle states of a consent decision.
type ConsentStatus string

const (
	ConsentStatusGranted  ConsentStatus = "granted"
	ConsentStatusDeclined ConsentStatus = "declined"
	ConsentStatusRevoked  ConsentStatus = "revoked"
)

// ValidConsentStatuses returns valid status values.
func ValidConsentStatuses() []ConsentStatus {
	return []ConsentStatus{
		ConsentStatusGranted, ConsentStatusDeclined, ConsentStatusRevoked,
	}
}

// Valid returns nil if the status is known.
func (s ConsentStatus) Valid() error {
	for _, v := range ValidConsentStatuses() {
		if v == s {
			return nil
		}
	}
	return fmt.Errorf("%w: status=%q", ErrInvalidInput, string(s))
}

// ConsentVersion is the current text version for each consent type.
// Bump this when the legal text meaningfully changes — existing users will be
// re-prompted and a new row (granted/declined) is written for the new version.
const ConsentVersion int = 1

// DataConsent mirrors a single row of app.data_consents (latest decision per
// (tenant, user, consent_type, version)).
type DataConsent struct {
	ID          uuid.UUID     `db:"id" json:"id"`
	TenantID    uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	UserID      uuid.UUID     `db:"user_id" json:"user_id"`
	ConsentType ConsentType   `db:"consent_type" json:"consent_type"`
	Version     int           `db:"version" json:"version"`
	Status      ConsentStatus `db:"status" json:"status"`
	AcceptedAt  *time.Time    `db:"accepted_at" json:"accepted_at,omitempty"`
	IPAddr      *string       `db:"ip_addr" json:"ip_addr,omitempty"`
	UserAgent   *string       `db:"user_agent" json:"user_agent,omitempty"`
	Metadata    JSONMap       `db:"metadata" json:"metadata"`
	CreatedAt   time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `db:"updated_at" json:"updated_at"`
}

// ConsentHistoryEntry mirrors a single row of app.consent_history (append-only).
type ConsentHistoryEntry struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	TenantID       uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	ConsentID      uuid.UUID      `db:"consent_id" json:"consent_id"`
	UserID         uuid.UUID      `db:"user_id" json:"user_id"`
	ConsentType    ConsentType    `db:"consent_type" json:"consent_type"`
	Version        int            `db:"version" json:"version"`
	PreviousStatus *ConsentStatus `db:"previous_status" json:"previous_status,omitempty"`
	NewStatus      ConsentStatus  `db:"new_status" json:"new_status"`
	ChangeReason   string         `db:"change_reason" json:"change_reason"`
	IPAddr         *string        `db:"ip_addr" json:"ip_addr,omitempty"`
	UserAgent      *string        `db:"user_agent" json:"user_agent,omitempty"`
	Metadata       JSONMap        `db:"metadata" json:"metadata"`
	ChangedAt      time.Time      `db:"changed_at" json:"changed_at"`
}

// JSONMap is a generic JSON-backed map that implements sql.Scanner/driver.Valuer.
type JSONMap map[string]any

// Scan implements sql.Scanner for JSONB columns.
func (m *JSONMap) Scan(src any) error {
	if src == nil {
		*m = JSONMap{}
		return nil
	}
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("JSONMap.Scan: unsupported type %T", src)
	}
	if len(data) == 0 {
		*m = JSONMap{}
		return nil
	}
	out := JSONMap{}
	if err := json.Unmarshal(data, &out); err != nil {
		return fmt.Errorf("JSONMap.Scan: %w", err)
	}
	*m = out
	return nil
}

// Value implements driver.Valuer for JSONB columns.
func (m JSONMap) Value() (driverValue, error) {
	if m == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(m)
}

// driverValue is the local alias for database/sql/driver.Value to avoid the
// extra import in a domain-layer file; JSON bytes satisfy the interface.
type driverValue = any

// ConsentCatalogEntry is the human-readable descriptor for a consent type.
type ConsentCatalogEntry struct {
	Type        ConsentType `json:"type"`
	Version     int         `json:"version"`
	TitleTR     string      `json:"title_tr"`
	SummaryTR   string      `json:"summary_tr"`
	LegalBasis  string      `json:"legal_basis"`
	Article     string      `json:"article"`
	Required    bool        `json:"required"`
	// BlocksAI, when true, means a declined/revoked state on this consent
	// causes the user to be skipped by AI prediction / recommendation flows.
	BlocksAI bool `json:"blocks_ai"`
}

// ConsentCatalog returns the 5 consent types (v1) with Turkish legal text.
// Kept in code (not DB) so schema changes and text edits ship together and
// every caller sees a consistent catalog.
func ConsentCatalog() []ConsentCatalogEntry {
	return []ConsentCatalogEntry{
		{
			Type:       ConsentDataProcessing,
			Version:    ConsentVersion,
			TitleTR:    "Kişisel Veri İşleme",
			SummaryTR:  "Ad-soyad, TCKN, e-posta, iletişim ve özlük bilgilerinin UpCore platformu üzerinden İK süreçlerinde işlenmesi.",
			LegalBasis: "KVKK Madde 5/1 — açık rıza; Madde 5/2-c — sözleşmenin kurulması / ifası için zorunlu olması.",
			Article:    "KVKK md.5",
			Required:   true,
			BlocksAI:   false,
		},
		{
			Type:       ConsentPerformanceEvaluation,
			Version:    ConsentVersion,
			TitleTR:    "Performans Değerlendirme",
			SummaryTR:  "OKR, 360° geri bildirim, 9-kutu, PIP süreçlerinde performans verilerinizin toplanması ve analiz edilmesi.",
			LegalBasis: "KVKK Madde 5/1 — açık rıza; Madde 5/2-f — meşru menfaat (İşveren yetkilendirmesi).",
			Article:    "KVKK md.5, md.6",
			Required:   false,
			BlocksAI:   false,
		},
		{
			Type:       ConsentBurnoutMonitoring,
			Version:    ConsentVersion,
			TitleTR:    "Tükenmişlik İzleme (BAT-TR)",
			SummaryTR:  "BAT-TR ve COPSOQ-III-TR ölçekleri ile düzenli tükenmişlik pulse'larının toplanması ve departman bazında agregasyonu.",
			LegalBasis: "KVKK Madde 6 — özel nitelikli sağlık verisi; açık rıza zorunludur.",
			Article:    "KVKK md.6",
			Required:   false,
			BlocksAI:   false,
		},
		{
			Type:       ConsentAnalytics,
			Version:    ConsentVersion,
			TitleTR:    "Anonimleştirilmiş Analitik",
			SummaryTR:  "Kimlik bilgilerinizden arındırılmış agregat verilerin ürün iyileştirme ve bilimsel çalışmalar için kullanılması.",
			LegalBasis: "KVKK Madde 5/2-f — meşru menfaat; veriler kimliksizleştirilmiş olarak saklanır.",
			Article:    "KVKK md.5, md.28",
			Required:   false,
			BlocksAI:   false,
		},
		{
			Type:       ConsentAIRecommendations,
			Version:    ConsentVersion,
			TitleTR:    "AI Tabanlı Öneri ve Tahminler",
			SummaryTR:  "Tükenmişlik tahmini, kariyer yolu önerileri, iç mobilite eşleşmeleri gibi otomatik karar algoritmalarına dahil edilme.",
			LegalBasis: "KVKK Madde 22 — otomatik karar alma süreçlerine itiraz hakkı; açık rıza gereklidir.",
			Article:    "KVKK md.22",
			Required:   false,
			BlocksAI:   true,
		},
	}
}

// LookupCatalog returns the catalog entry for a consent type.
func LookupCatalog(t ConsentType) (ConsentCatalogEntry, bool) {
	for _, e := range ConsentCatalog() {
		if e.Type == t {
			return e, true
		}
	}
	return ConsentCatalogEntry{}, false
}

// IsBlocking reports whether a decision should block AI/ML pipelines for the user.
// Rule: only `ai_recommendations` consent gates ML. declined or revoked → blocked.
func (c *DataConsent) IsBlocking() bool {
	if c == nil {
		return false
	}
	if c.ConsentType != ConsentAIRecommendations {
		return false
	}
	return c.Status != ConsentStatusGranted
}
