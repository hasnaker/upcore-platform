package domain

import "strings"

// DocType enumerates supported document types. Values correspond to the
// `category` column in `app.documents` — see migration 010_documents.up.sql
// for the allowed CHECK set.
type DocType string

const (
	DocTypeContract       DocType = "sözleşme"
	DocTypePayroll        DocType = "bordro"
	DocTypeIDPhoto        DocType = "kimlik"
	DocTypeCertificate    DocType = "sertifika"
	DocTypeDiploma        DocType = "diploma"
	DocTypeMedicalReport  DocType = "sağlık_raporu"
	DocTypeIzinBelgesi    DocType = "izin_belgesi"
	DocTypeTrainingRecord DocType = "eğitim_belgesi"
	DocTypePolicy         DocType = "policy"
	DocTypeOther          DocType = "diğer"
)

// allDocTypes lists all legal document types for validation.
var allDocTypes = []DocType{
	DocTypeContract, DocTypePayroll, DocTypeIDPhoto, DocTypeCertificate,
	DocTypeDiploma, DocTypeMedicalReport, DocTypeIzinBelgesi,
	DocTypeTrainingRecord, DocTypePolicy, DocTypeOther,
}

// aliases translates client-friendly logical labels to the DB categories.
// Accepted aliases are documented at the handler layer and in openapi.yaml.
var aliases = map[string]DocType{
	// English aliases
	"contract":          DocTypeContract,
	"payroll":           DocTypePayroll,
	"payroll_receipt":   DocTypePayroll,
	"id_photo":          DocTypeIDPhoto,
	"id_card":           DocTypeIDPhoto,
	"certificate":       DocTypeCertificate,
	"training_cert":     DocTypeCertificate,
	"diploma":           DocTypeDiploma,
	"medical_report":    DocTypeMedicalReport,
	"health_report":     DocTypeMedicalReport,
	"leave_doc":         DocTypeIzinBelgesi,
	"training_record":   DocTypeTrainingRecord,
	"policy":            DocTypePolicy,
	"kvkk_consent":      DocTypePolicy,
	"aydinlatma":        DocTypePolicy,
	"aydınlatma":        DocTypePolicy,
	"cv":                DocTypeOther,
	"performance":       DocTypeOther,
	"performance_review": DocTypeOther,
	"disciplinary":      DocTypeOther,
	"other":             DocTypeOther,
}

// IsValid returns true if the value matches a known DocType.
func (d DocType) IsValid() bool {
	for _, t := range allDocTypes {
		if t == d {
			return true
		}
	}
	return false
}

// String returns the string form.
func (d DocType) String() string { return string(d) }

// ParseDocType normalizes user input and validates. Accepts both native
// Turkish labels and English aliases (e.g. "contract" → "sözleşme").
func ParseDocType(s string) (DocType, error) {
	v := strings.ToLower(strings.TrimSpace(s))
	if v == "" {
		return "", ErrInvalidDocumentType
	}
	// Native match first.
	dt := DocType(v)
	if dt.IsValid() {
		return dt, nil
	}
	if mapped, ok := aliases[v]; ok {
		return mapped, nil
	}
	return "", ErrInvalidDocumentType
}

// DefaultRetentionDays returns the default KVKK retention period per type.
// Most records follow the 7-year rule imposed by Turkish labor regulations.
func (d DocType) DefaultRetentionDays() int {
	switch d {
	case DocTypeContract, DocTypePayroll, DocTypePolicy:
		return 7 * 365
	case DocTypeMedicalReport:
		return 10 * 365
	case DocTypeIDPhoto, DocTypeDiploma:
		return 5 * 365
	case DocTypeCertificate, DocTypeTrainingRecord, DocTypeIzinBelgesi:
		return 5 * 365
	default:
		return 5 * 365
	}
}
