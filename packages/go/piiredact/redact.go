// Package piiredact masks sensitive data (TCKN, IBAN, email, phone, credit
// card) in free-form strings before they land in application logs.
//
// Used by services'in zerolog hook'u + audit sanitization katmanında.
// ISO 27001 A.8.11 (Data Masking) + KVKK m.12 kanıtı olarak kayıt alınır.
//
// Tasarım:
//   - Regex-tabanlı tek geçişli replace — zero allocation hot path hedefi.
//   - Dönüştürülen çıktı: orijinal uzunlukta `*` maske; ilk 2 + son 2 karakter
//     görünür (investigate için) — tamamen karıştırılmış değildir.
//   - JSON value'larda çalışabilir; key isimleri hiç değişmez.
package piiredact

import (
	"regexp"
	"strings"
)

// Sanitise masks all known PII patterns in s. Safe with empty input.
func Sanitise(s string) string {
	if s == "" {
		return s
	}
	s = tcknRe.ReplaceAllStringFunc(s, maskMiddle)
	s = ibanRe.ReplaceAllStringFunc(s, maskMiddle)
	s = emailRe.ReplaceAllStringFunc(s, maskEmail)
	s = phoneRe.ReplaceAllStringFunc(s, maskMiddle)
	s = cardRe.ReplaceAllStringFunc(s, maskCard)
	return s
}

// SanitiseMap applies Sanitise to every string value in a key-value map.
// Keys are never rewritten (log schema must stay stable).
func SanitiseMap(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	out := make(map[string]any, len(m))
	for k, v := range m {
		switch val := v.(type) {
		case string:
			out[k] = Sanitise(val)
		case map[string]any:
			out[k] = SanitiseMap(val)
		default:
			out[k] = v
		}
	}
	return out
}

// ---- Patterns -------------------------------------------------------------

// TCKN: Turkish Republic ID number — 11 digits starting 1-9.
// Not pattern-complete (checksum unvalidated) — regex yeterli.
var tcknRe = regexp.MustCompile(`\b[1-9]\d{10}\b`)

// IBAN: TRxx + 24 digits = 26 chars total. Other ISO countries da mask edilir.
var ibanRe = regexp.MustCompile(`\b[A-Z]{2}\d{2}[A-Z0-9]{8,30}\b`)

// Email: basic RFC5321-ish. Aggressive matching kabul edilir.
var emailRe = regexp.MustCompile(`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`)

// TR telefon formatları (0xxx / +90 xxx) — ayraç boşluk veya tire olabilir.
var phoneRe = regexp.MustCompile(`(?:\+?90|0)?[\s-]?\(?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}`)

// Kredi kartı (16 hane, ayrılmış veya bitişik).
var cardRe = regexp.MustCompile(`\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b`)

// ---- Mask strategies ------------------------------------------------------

func maskMiddle(s string) string {
	if len(s) <= 4 {
		return strings.Repeat("*", len(s))
	}
	return s[:2] + strings.Repeat("*", len(s)-4) + s[len(s)-2:]
}

func maskEmail(s string) string {
	at := strings.IndexByte(s, '@')
	if at <= 1 {
		return "***" + s[at:]
	}
	local := s[:at]
	domain := s[at:]
	if len(local) <= 2 {
		return strings.Repeat("*", len(local)) + domain
	}
	return local[:1] + strings.Repeat("*", len(local)-2) + local[len(local)-1:] + domain
}

func maskCard(s string) string {
	// Keep last 4 digits only — PCI-DSS 3.3 pattern.
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, s)
	if len(digits) < 4 {
		return strings.Repeat("*", len(s))
	}
	return strings.Repeat("*", len(digits)-4) + digits[len(digits)-4:]
}
