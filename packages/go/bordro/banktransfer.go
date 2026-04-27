package bordro

import (
	"fmt"
	"strings"
	"time"
)

// BankTransferFormat enumerates the Turkish bank-specific file formats used
// for salary batch payments. Each bank publishes its own template; we support
// the most common ones for SaaS payroll.
type BankTransferFormat string

const (
	// BankFormatING — ING Bank toplu maaş transferi CSV.
	BankFormatING BankTransferFormat = "ing"
	// BankFormatGaranti — Garanti BBVA fixed-width format.
	BankFormatGaranti BankTransferFormat = "garanti"
	// BankFormatIsbank — İş Bankası CSV format.
	BankFormatIsbank BankTransferFormat = "isbank"
	// BankFormatTEB — TEB toplu ödeme CSV.
	BankFormatTEB BankTransferFormat = "teb"
	// BankFormatYapikredi — Yapı Kredi CSV.
	BankFormatYapikredi BankTransferFormat = "yapikredi"
	// BankFormatGeneric — tenant-agnostic CSV: IBAN,AdSoyad,Tutar,Açıklama.
	BankFormatGeneric BankTransferFormat = "generic"
)

// IsValid reports whether the format is known.
func (f BankTransferFormat) IsValid() bool {
	switch f {
	case BankFormatING, BankFormatGaranti, BankFormatIsbank,
		BankFormatTEB, BankFormatYapikredi, BankFormatGeneric:
		return true
	}
	return false
}

// BankTransferRow is one payee entry in the output file.
type BankTransferRow struct {
	EmployeeNo string
	FullName   string // AdSoyad
	TCKN       string // optional; bazı bankalar zorunlu tutar
	IBAN       string
	Amount     float64 // net maaş TL
	Currency   string  // "TRY" default
	Reference  string  // açıklama — "YYYY-MM Maaş"
}

// BankTransferConfig bundles the metadata the formats need.
type BankTransferConfig struct {
	Format       BankTransferFormat
	SenderTitle  string // gönderen hesap sahibi (şirket unvanı)
	SenderIBAN   string // gönderen IBAN
	ValueDate    time.Time // valör tarihi (aynı gün veya sonraki iş günü)
	Period       string    // "2026-04"
	CompanyTaxNo string    // VKN (bazı bankalar header'da ister)
}

// BuildBankTransferFile renders the given rows in the target bank format.
// Returns (fileBytes, fileName, mimeType).
func BuildBankTransferFile(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	if len(rows) == 0 {
		return nil, "", ""
	}
	switch cfg.Format {
	case BankFormatING:
		return buildING(cfg, rows)
	case BankFormatGaranti:
		return buildGaranti(cfg, rows)
	case BankFormatIsbank:
		return buildIsbank(cfg, rows)
	case BankFormatTEB:
		return buildTEB(cfg, rows)
	case BankFormatYapikredi:
		return buildYapikredi(cfg, rows)
	default:
		return buildGeneric(cfg, rows)
	}
}

// ----------------------------------------------------------------------------
// ING Bank — CSV: HeaderRow + her çalışan için 1 satır
// SENDER_IBAN;SENDER_TITLE;VALUE_DATE;RECEIVER_IBAN;RECEIVER_NAME;TCKN;AMOUNT;DESCRIPTION
// ----------------------------------------------------------------------------
func buildING(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	sb.WriteString("SENDER_IBAN;SENDER_TITLE;VALUE_DATE;RECEIVER_IBAN;RECEIVER_NAME;TCKN;AMOUNT;DESCRIPTION\r\n")
	valueDate := cfg.ValueDate.Format("02.01.2006")
	for _, rrow := range rows {
		sb.WriteString(fmt.Sprintf("%s;%s;%s;%s;%s;%s;%s;%s\r\n",
			cfg.SenderIBAN, csvEscape(cfg.SenderTitle), valueDate,
			rrow.IBAN, csvEscape(rrow.FullName), rrow.TCKN,
			fmtAmount(rrow.Amount), csvEscape(rrow.Reference),
		))
	}
	return []byte(sb.String()), fmt.Sprintf("ing_maas_%s.csv", cfg.Period), "text/csv"
}

// ----------------------------------------------------------------------------
// Garanti BBVA — Fixed-width (eski dosya formatı hâlâ kullanılıyor)
// Header: "GARANTI_MAAS_V2 <VKN> <DATE> <COUNT> <TOTAL>"
// Row: pos 1-10 IBAN(26) pos 27-30 fill pos 31-60 name(30) pos 61-71 tckn(11) pos 72-81 amount(kuruş, 10)
// ----------------------------------------------------------------------------
func buildGaranti(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	totalKurus := int64(0)
	for _, r := range rows {
		totalKurus += int64(r.Amount * 100)
	}
	// Fixed-width — direct byte-level concatenation (avoid fmt %-Ns which
	// counts runes). Garanti dosyaları ASCII bekler; Türkçe karakterler
	// turkishToASCII ile dönüştürülür.
	sb.WriteString("GARANTI_MAAS_V2 ")
	sb.WriteString(safeStr(cfg.CompanyTaxNo, 10))
	sb.WriteString(" ")
	sb.WriteString(cfg.ValueDate.Format("20060102"))
	sb.WriteString(" ")
	sb.WriteString(fmt.Sprintf("%04d", len(rows)))
	sb.WriteString(" ")
	sb.WriteString(fmt.Sprintf("%015d", totalKurus))
	sb.WriteString("\r\n")
	for _, rrow := range rows {
		sb.WriteString(safeStr(rrow.IBAN, 26))
		sb.WriteString("    ")
		sb.WriteString(safeStr(turkishToASCII(rrow.FullName), 30))
		sb.WriteString(safeStr(rrow.TCKN, 11))
		sb.WriteString(fmt.Sprintf("%010d", int64(rrow.Amount*100)))
		sb.WriteString("\r\n")
	}
	return []byte(sb.String()), fmt.Sprintf("garanti_maas_%s.txt", cfg.Period), "text/plain"
}

// turkishToASCII converts Turkish diacritics to ASCII (banka formatları genelde
// 7-bit ASCII bekler; Ü → U, ı → i).
func turkishToASCII(s string) string {
	r := strings.NewReplacer(
		"ç", "c", "Ç", "C",
		"ğ", "g", "Ğ", "G",
		"ı", "i", "İ", "I",
		"ö", "o", "Ö", "O",
		"ş", "s", "Ş", "S",
		"ü", "u", "Ü", "U",
	)
	return r.Replace(s)
}

// ----------------------------------------------------------------------------
// İş Bankası — CSV (semicolon)
// VERSION;SENDER_IBAN;RECEIVER_IBAN;NAME;TCKN;AMOUNT;CURRENCY;DESC;DATE
// ----------------------------------------------------------------------------
func buildIsbank(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	sb.WriteString("ISBANK_V3;SENDER_IBAN;RECEIVER_IBAN;NAME;TCKN;AMOUNT;CURRENCY;DESC;DATE\r\n")
	d := cfg.ValueDate.Format("02/01/2006")
	for _, rrow := range rows {
		sb.WriteString(fmt.Sprintf("2;%s;%s;%s;%s;%s;%s;%s;%s\r\n",
			cfg.SenderIBAN, rrow.IBAN, csvEscape(rrow.FullName), rrow.TCKN,
			fmtAmount(rrow.Amount), currencyOrDefault(rrow.Currency),
			csvEscape(rrow.Reference), d,
		))
	}
	return []byte(sb.String()), fmt.Sprintf("isbank_maas_%s.csv", cfg.Period), "text/csv"
}

// ----------------------------------------------------------------------------
// TEB — CSV (comma)
// ----------------------------------------------------------------------------
func buildTEB(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	sb.WriteString("IBAN,Ad Soyad,TCKN,Tutar,Aciklama\r\n")
	for _, rrow := range rows {
		sb.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s\r\n",
			rrow.IBAN, csvEscape(rrow.FullName), rrow.TCKN,
			fmtAmount(rrow.Amount), csvEscape(rrow.Reference),
		))
	}
	return []byte(sb.String()), fmt.Sprintf("teb_maas_%s.csv", cfg.Period), "text/csv"
}

// ----------------------------------------------------------------------------
// Yapı Kredi — CSV (pipe separated)
// ----------------------------------------------------------------------------
func buildYapikredi(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	sb.WriteString("IBAN|AdSoyad|Tutar|ParaBirimi|Aciklama|TCKN\r\n")
	for _, rrow := range rows {
		sb.WriteString(fmt.Sprintf("%s|%s|%s|%s|%s|%s\r\n",
			rrow.IBAN, csvEscape(rrow.FullName), fmtAmount(rrow.Amount),
			currencyOrDefault(rrow.Currency), csvEscape(rrow.Reference), rrow.TCKN,
		))
	}
	return []byte(sb.String()), fmt.Sprintf("yapikredi_maas_%s.csv", cfg.Period), "text/csv"
}

// ----------------------------------------------------------------------------
// Generic — banka-agnostik CSV (hangi bankaya gönderirseniz gönderin)
// ----------------------------------------------------------------------------
func buildGeneric(cfg BankTransferConfig, rows []BankTransferRow) ([]byte, string, string) {
	var sb strings.Builder
	sb.WriteString("EmployeeNo,FullName,TCKN,IBAN,Amount,Currency,Reference\r\n")
	for _, rrow := range rows {
		sb.WriteString(fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s\r\n",
			csvEscape(rrow.EmployeeNo), csvEscape(rrow.FullName), rrow.TCKN,
			rrow.IBAN, fmtAmount(rrow.Amount),
			currencyOrDefault(rrow.Currency), csvEscape(rrow.Reference),
		))
	}
	return []byte(sb.String()), fmt.Sprintf("maas_transfer_%s.csv", cfg.Period), "text/csv"
}

// ----------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------
func fmtAmount(v float64) string {
	return fmt.Sprintf("%.2f", v)
}

func currencyOrDefault(c string) string {
	if strings.TrimSpace(c) == "" {
		return "TRY"
	}
	return c
}

// csvEscape strips CR/LF and wraps in quotes when the value contains a
// separator character. Minimal RFC 4180 compliant.
func csvEscape(s string) string {
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	needsQuote := strings.ContainsAny(s, ",;|\"")
	s = strings.ReplaceAll(s, "\"", "\"\"")
	if needsQuote {
		return "\"" + s + "\""
	}
	return s
}

// safeStr truncates or right-pads a string to exactly n characters.
func safeStr(s string, n int) string {
	if len(s) >= n {
		return s[:n]
	}
	return s + strings.Repeat(" ", n-len(s))
}
