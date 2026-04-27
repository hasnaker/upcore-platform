package bordro

import (
	"strings"
	"testing"
	"time"
)

func sampleCfg(format BankTransferFormat) BankTransferConfig {
	return BankTransferConfig{
		Format:       format,
		SenderTitle:  "UpCore AŞ",
		SenderIBAN:   "TR330006100519786457841326",
		ValueDate:    time.Date(2026, 5, 3, 0, 0, 0, 0, time.UTC),
		Period:       "2026-04",
		CompanyTaxNo: "1234567890",
	}
}

func sampleRows() []BankTransferRow {
	return []BankTransferRow{
		{EmployeeNo: "E001", FullName: "Ahmet Yılmaz", TCKN: "12345678901",
			IBAN: "TR100006100519786457841327", Amount: 25000.75, Reference: "2026-04 Maaş"},
		{EmployeeNo: "E002", FullName: "Ayşe, Demir", TCKN: "98765432109",
			IBAN: "TR100006100519786457841328", Amount: 42500.50, Reference: "2026-04 Maaş"},
	}
}

func TestBankTransferFormats_AllValid(t *testing.T) {
	formats := []BankTransferFormat{
		BankFormatING, BankFormatGaranti, BankFormatIsbank,
		BankFormatTEB, BankFormatYapikredi, BankFormatGeneric,
	}
	for _, f := range formats {
		cfg := sampleCfg(f)
		body, fn, mime := BuildBankTransferFile(cfg, sampleRows())
		if len(body) == 0 {
			t.Errorf("%s: empty output", f)
		}
		if fn == "" {
			t.Errorf("%s: empty filename", f)
		}
		if mime == "" {
			t.Errorf("%s: empty mime", f)
		}
	}
}

func TestING_HeaderAndRows(t *testing.T) {
	body, _, _ := BuildBankTransferFile(sampleCfg(BankFormatING), sampleRows())
	s := string(body)
	if !strings.HasPrefix(s, "SENDER_IBAN") {
		t.Errorf("ING header missing: %q", s[:40])
	}
	if !strings.Contains(s, "TR100006100519786457841327") {
		t.Errorf("ING missing IBAN")
	}
	if !strings.Contains(s, "25000.75") {
		t.Errorf("ING amount format wrong")
	}
}

func TestGaranti_FixedWidth(t *testing.T) {
	body, _, _ := BuildBankTransferFile(sampleCfg(BankFormatGaranti), sampleRows())
	lines := strings.Split(string(body), "\r\n")
	// Header line
	if !strings.HasPrefix(lines[0], "GARANTI_MAAS_V2") {
		t.Errorf("Garanti header mismatch: %q", lines[0])
	}
	// Row line: 26 (IBAN) + 4 (pad) + 30 (name) + 11 (tckn) + 10 (amount) = 81 chars
	if len(lines[1]) != 81 {
		t.Errorf("Garanti row width = %d, want 81", len(lines[1]))
	}
}

func TestCSVEscape_Comma(t *testing.T) {
	body, _, _ := BuildBankTransferFile(sampleCfg(BankFormatGeneric), sampleRows())
	s := string(body)
	// "Ayşe, Demir" has a comma → should be quoted
	if !strings.Contains(s, `"Ayşe, Demir"`) {
		t.Errorf("csvEscape failed to quote comma-containing name: %s", s)
	}
}

func TestIsValid(t *testing.T) {
	if !BankFormatING.IsValid() {
		t.Errorf("ING should be valid")
	}
	if BankTransferFormat("bogus").IsValid() {
		t.Errorf("bogus should be invalid")
	}
}

func TestEmptyRows_NoOutput(t *testing.T) {
	body, _, _ := BuildBankTransferFile(sampleCfg(BankFormatING), nil)
	if len(body) != 0 {
		t.Errorf("empty rows should produce no output")
	}
}
