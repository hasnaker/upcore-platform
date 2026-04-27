package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// Workplace mirrors app.tenant_sgk_workplaces.
type Workplace struct {
	ID                     uuid.UUID  `db:"id" json:"id"`
	TenantID               uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	SicilNo                string     `db:"sicil_no" json:"sicil_no"`
	Unvan                  string     `db:"unvan" json:"unvan"`
	VergiDairesi           *string    `db:"vergi_dairesi" json:"vergi_dairesi,omitempty"`
	VergiNo                string     `db:"vergi_no" json:"vergi_no"`
	Il                     *string    `db:"il" json:"il,omitempty"`
	Ilce                   *string    `db:"ilce" json:"ilce,omitempty"`
	Adres                  *string    `db:"adres" json:"adres,omitempty"`
	KanunTuru              string     `db:"kanun_turu" json:"kanun_turu"`
	IsActive               bool       `db:"is_active" json:"is_active"`
	EbildirgeKullaniciAdi  *string    `db:"ebildirge_kullanici_adi" json:"ebildirge_kullanici_adi,omitempty"`
	// ebildirge_sifre_enc — BYTEA; JSON'a yazılmaz.
	CreatedAt              time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt              time.Time  `db:"updated_at" json:"updated_at"`
}

// ApplyDefaults fills DB-required defaults.
func (w *Workplace) ApplyDefaults() {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	if strings.TrimSpace(w.KanunTuru) == "" {
		w.KanunTuru = "09100"
	}
}

// Validate enforces invariants.
func (w *Workplace) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(w.SicilNo) == "" {
		fields["sicil_no"] = "required"
	}
	if strings.TrimSpace(w.Unvan) == "" {
		fields["unvan"] = "required"
	}
	if strings.TrimSpace(w.VergiNo) == "" {
		fields["vergi_no"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
