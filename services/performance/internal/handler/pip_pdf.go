// Package handler — inline PIP PDF renderer.
//
// We produce a minimal, valid PDF 1.4 document without external deps so the
// binary stays lean. The output is deterministic, single-page, text-only and
// contains the İş Kanunu 25/2 mandated content + signature blocks.
//
// This is NOT a fancy typeset — it's a court-filing-grade audit trail record
// (printable text with case metadata, goals, check-ins, outcome, signature
// placeholders). The document service can overlay a PDF/A wrapper later.
package handler

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"github.com/upcore/performance/internal/domain"
)

// RenderPipPDF produces a PDF stream for a PIP case.
func RenderPipPDF(c *domain.PipCase) (*bytes.Buffer, error) {
	if c == nil {
		return nil, fmt.Errorf("pdf: nil case")
	}
	lines := buildPipPDFLines(c)
	return writePDF(lines)
}

// buildPipPDFLines returns the ordered text lines to render.
func buildPipPDFLines(c *domain.PipCase) []string {
	out := []string{}
	out = append(out,
		"PERFORMANS IYILESTIRME PLANI (PIP)",
		"Is Kanunu 25/2 - Belge Ornegi",
		"----------------------------------------",
		fmt.Sprintf("Dosya No     : %s", c.ID.String()),
		fmt.Sprintf("Calisan ID   : %s", c.EmployeeID.String()),
		fmt.Sprintf("Baslatan     : %s", c.InitiatedBy.String()),
		fmt.Sprintf("Neden        : %s", c.ReasonCategory),
		fmt.Sprintf("Durum        : %s", c.Status),
		fmt.Sprintf("Baslangic    : %s", c.StartDate.Format("2006-01-02")),
		fmt.Sprintf("Sure         : %d gun", c.DurationDays),
		fmt.Sprintf("Legal Onay   : %s", yesNo(c.LegalReviewed)),
	)
	if c.LegalFileURL != nil && *c.LegalFileURL != "" {
		out = append(out, fmt.Sprintf("Legal Dosya  : %s", truncate(*c.LegalFileURL, 80)))
	}
	out = append(out, "")
	out = append(out, "OLGUSAL OZET")
	out = append(out, "----------------------------------------")
	for _, l := range wrap(c.ReasonSummary, 80) {
		out = append(out, l)
	}
	out = append(out, "")

	out = append(out, "IYILESTIRME HEDEFLERI")
	out = append(out, "----------------------------------------")
	if len(c.Goals) == 0 {
		out = append(out, "(hedef tanimli degil)")
	}
	for i, g := range c.Goals {
		out = append(out, fmt.Sprintf("%d. %s", i+1, truncate(g.Description, 74)))
		out = append(out, fmt.Sprintf("   Olculebilir Hedef: %s", truncate(g.MeasurableTarget, 58)))
		out = append(out, fmt.Sprintf("   Son Tarih: %s   Oncelik: %s",
			g.Deadline.Format("2006-01-02"), g.Priority))
	}
	out = append(out, "")

	out = append(out, "HAFTALIK TAKIP")
	out = append(out, "----------------------------------------")
	if len(c.Checkins) == 0 {
		out = append(out, "(henuz takip yok)")
	}
	for _, k := range c.Checkins {
		ack := "hayir"
		if k.AcknowledgedByEmployee != nil {
			ack = k.AcknowledgedByEmployee.Format("2006-01-02 15:04")
		}
		out = append(out, fmt.Sprintf("Hafta %d  |  %s  |  Calisan onay: %s",
			k.WeekNumber, k.OnTrack, ack))
		if k.ManagerNotes != nil && *k.ManagerNotes != "" {
			out = append(out, "   Yonetici notu: "+truncate(*k.ManagerNotes, 60))
		}
	}
	out = append(out, "")

	if c.Outcome != nil {
		out = append(out, "SONUC")
		out = append(out, "----------------------------------------")
		out = append(out, fmt.Sprintf("Sonuc         : %s", c.Outcome.Result))
		out = append(out, fmt.Sprintf("Kapatan       : %s", c.Outcome.ClosedBy.String()))
		out = append(out, fmt.Sprintf("Kapatma Tarihi: %s", c.Outcome.ClosedAt.Format("2006-01-02 15:04")))
		if c.Outcome.LegalFileURL != nil && *c.Outcome.LegalFileURL != "" {
			out = append(out, fmt.Sprintf("Legal Dosya   : %s", truncate(*c.Outcome.LegalFileURL, 64)))
		}
		if c.Outcome.OutcomeNotes != nil && *c.Outcome.OutcomeNotes != "" {
			out = append(out, "Notlar: "+truncate(*c.Outcome.OutcomeNotes, 72))
		}
		out = append(out, "")
	}

	out = append(out, "IMZA ALANLARI")
	out = append(out, "----------------------------------------")
	out = append(out, "Calisan           : ______________________   Tarih: ___________")
	out = append(out, "Yonetici          : ______________________   Tarih: ___________")
	out = append(out, "Insan Kaynaklari  : ______________________   Tarih: ___________")
	out = append(out, "Hukuk             : ______________________   Tarih: ___________")
	out = append(out, "")
	out = append(out, fmt.Sprintf("Belge olusturma: %s", time.Now().UTC().Format("2006-01-02 15:04 UTC")))
	out = append(out, "Bu belge 4857 sayili Is Kanunu 25/2 prosedurune dayanmaktadir.")
	out = append(out, "10 yil sure ile kurumsal arsivde saklanir.")
	return out
}

func yesNo(b bool) string {
	if b {
		return "evet"
	}
	return "hayir"
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func wrap(s string, maxLen int) []string {
	if s == "" {
		return []string{""}
	}
	var out []string
	for _, paragraph := range strings.Split(s, "\n") {
		words := strings.Fields(paragraph)
		line := ""
		for _, w := range words {
			if len(line)+len(w)+1 > maxLen {
				out = append(out, line)
				line = w
				continue
			}
			if line == "" {
				line = w
			} else {
				line += " " + w
			}
		}
		if line != "" {
			out = append(out, line)
		}
	}
	if len(out) == 0 {
		return []string{""}
	}
	return out
}

// writePDF emits a minimal PDF 1.4 document with one single-page text stream.
// Uses the standard 14 font "Courier" (no embedding required).
func writePDF(lines []string) (*bytes.Buffer, error) {
	var content bytes.Buffer
	content.WriteString("BT\n/F1 10 Tf\n12 TL\n50 790 Td\n")
	for _, l := range lines {
		content.WriteString("(")
		content.WriteString(escapePDF(l))
		content.WriteString(") Tj\nT*\n")
	}
	content.WriteString("ET\n")

	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")

	offsets := make([]int, 6)

	// 1: Catalog
	offsets[0] = buf.Len()
	buf.WriteString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

	// 2: Pages
	offsets[1] = buf.Len()
	buf.WriteString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

	// 3: Page
	offsets[2] = buf.Len()
	buf.WriteString(
		"3 0 obj\n" +
			"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
			"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")

	// 4: Contents
	offsets[3] = buf.Len()
	contentLen := content.Len()
	buf.WriteString(fmt.Sprintf("4 0 obj\n<< /Length %d >>\nstream\n", contentLen))
	buf.Write(content.Bytes())
	buf.WriteString("endstream\nendobj\n")

	// 5: Font
	offsets[4] = buf.Len()
	buf.WriteString("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n")

	// 6: Info
	offsets[5] = buf.Len()
	buf.WriteString("6 0 obj\n<< /Producer (UpCore Performance) /Title (PIP Report) >>\nendobj\n")

	// xref
	xrefStart := buf.Len()
	buf.WriteString(fmt.Sprintf("xref\n0 %d\n", len(offsets)+1))
	buf.WriteString("0000000000 65535 f \n")
	for _, off := range offsets {
		buf.WriteString(fmt.Sprintf("%010d 00000 n \n", off))
	}
	buf.WriteString(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R /Info 6 0 R >>\n", len(offsets)+1))
	buf.WriteString(fmt.Sprintf("startxref\n%d\n%%%%EOF\n", xrefStart))

	return &buf, nil
}

func escapePDF(s string) string {
	r := strings.NewReplacer(
		`\`, `\\`,
		`(`, `\(`,
		`)`, `\)`,
	)
	// PDF 1.4 strings use WinAnsi-ish; strip non-ASCII to keep it portable.
	var b strings.Builder
	for _, c := range r.Replace(s) {
		if c < 32 || c > 126 {
			b.WriteByte('?')
			continue
		}
		b.WriteRune(c)
	}
	return b.String()
}
