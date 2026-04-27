// Package pdf renders bordro slip PDFs.
// Uses signintech/gopdf (pure Go, TTF embedding) — no external binaries.
package pdf

import (
	"bytes"
	"fmt"
	"time"

	"github.com/signintech/gopdf"

	"github.com/upcore/bordrosvc/internal/domain"
)

// Payslip bundles everything needed to render a single bordro PDF.
type Payslip struct {
	TenantName     string
	TenantTaxNo    string
	TenantAddress  string
	EmployeeNo     string
	EmployeeName   string
	EmployeeTCKN   string
	DepartmentName string
	Position       string
	PeriodLabel    string // "Nisan 2026"
	PayDate        time.Time
	Workplace      string // SGK işyeri unvanı (varsa)
	Slip           *domain.Slip
	Items          []domain.SlipItem
}

// Render produces a byte slice containing the PDF.
func Render(p Payslip) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	// Default built-in font only supports Latin-1; Turkish characters need a
	// TTF. We fallback to ASCII transliteration to keep the stdlib working
	// anywhere without external font assets.
	const fontFace = "default"
	if err := pdf.SetFont("", "", 10); err != nil {
		// built-in "Helvetica" is the default when SetFont called with empty name
	}
	_ = fontFace

	line := 20.0
	left := 40.0
	pageWidth := 595.28 - 80.0

	// Header
	pdf.SetXY(left, 30)
	pdf.SetFont("", "", 16)
	_ = pdf.Cell(nil, asciify(p.TenantName))
	pdf.SetXY(left, 50)
	pdf.SetFont("", "", 9)
	_ = pdf.Cell(nil, "VKN: "+p.TenantTaxNo)
	if p.TenantAddress != "" {
		pdf.SetXY(left, 62)
		_ = pdf.Cell(nil, asciify(p.TenantAddress))
	}

	pdf.SetXY(left+pageWidth-180, 30)
	pdf.SetFont("", "", 14)
	_ = pdf.Cell(nil, "UCRET BORDROSU")
	pdf.SetXY(left+pageWidth-180, 50)
	pdf.SetFont("", "", 9)
	_ = pdf.Cell(nil, "Donem: "+asciify(p.PeriodLabel))
	if !p.PayDate.IsZero() {
		pdf.SetXY(left+pageWidth-180, 62)
		_ = pdf.Cell(nil, "Odeme: "+p.PayDate.Format("02.01.2006"))
	}

	// Separator
	pdf.SetLineWidth(0.5)
	pdf.Line(left, 82, left+pageWidth, 82)

	// Employee block
	y := 95.0
	pdf.SetXY(left, y)
	pdf.SetFont("", "", 11)
	_ = pdf.Cell(nil, "Calisan Bilgileri")
	y += line
	pdf.SetFont("", "", 9)
	kv := [][2]string{
		{"Ad Soyad", asciify(p.EmployeeName)},
		{"Sicil No", p.EmployeeNo},
		{"TCKN", p.EmployeeTCKN},
		{"Departman", asciify(p.DepartmentName)},
		{"Pozisyon", asciify(p.Position)},
		{"SGK Isyeri", asciify(p.Workplace)},
	}
	for _, row := range kv {
		pdf.SetXY(left, y)
		_ = pdf.Cell(nil, row[0]+":")
		pdf.SetXY(left+120, y)
		_ = pdf.Cell(nil, row[1])
		y += 14
	}

	y += 10
	pdf.Line(left, y, left+pageWidth, y)
	y += 10

	// Items section header
	pdf.SetXY(left, y)
	pdf.SetFont("", "", 11)
	_ = pdf.Cell(nil, "Bordro Kalemleri")
	y += line

	// Table header
	pdf.SetFont("", "", 9)
	pdf.SetFillColor(240, 240, 240)
	pdf.RectFromUpperLeftWithStyle(left, y-4, pageWidth, 18, "F")
	pdf.SetXY(left+5, y+2)
	_ = pdf.Cell(nil, "Tur")
	pdf.SetXY(left+80, y+2)
	_ = pdf.Cell(nil, "Kod")
	pdf.SetXY(left+180, y+2)
	_ = pdf.Cell(nil, "Aciklama")
	pdf.SetXY(left+pageWidth-80, y+2)
	_ = pdf.Cell(nil, "Tutar")
	y += 20

	// Table rows
	for _, it := range p.Items {
		if y > 720 {
			pdf.AddPage()
			y = 60
		}
		pdf.SetXY(left+5, y)
		_ = pdf.Cell(nil, itemTypeLabel(it.ItemType))
		pdf.SetXY(left+80, y)
		_ = pdf.Cell(nil, clip(it.Code, 14))
		pdf.SetXY(left+180, y)
		_ = pdf.Cell(nil, asciify(clip(it.Description, 45)))
		pdf.SetXY(left+pageWidth-80, y)
		_ = pdf.Cell(nil, fmtAmount(it.Amount))
		y += 14
	}

	y += 10
	pdf.Line(left, y, left+pageWidth, y)
	y += 14

	// Totals
	pdf.SetFont("", "", 10)
	totals := [][2]string{
		{"Brut Toplam", fmtAmount(p.Slip.TotalGross)},
		{"SGK Isci", "-" + fmtAmount(p.Slip.SGKEmployee)},
		{"Issizlik Isci", "-" + fmtAmount(p.Slip.SGKUnemploymentEmp)},
		{"Gelir Vergisi", "-" + fmtAmount(p.Slip.IncomeTax)},
		{"Damga Vergisi", "-" + fmtAmount(p.Slip.StampTax)},
		{"NET ODENECEK", fmtAmount(p.Slip.TotalNet)},
		{"Isveren Maliyeti", fmtAmount(p.Slip.TotalGross + p.Slip.SGKEmployer + p.Slip.UnemploymentEmployer)},
	}
	for _, t := range totals {
		pdf.SetXY(left+pageWidth-260, y)
		_ = pdf.Cell(nil, t[0])
		pdf.SetXY(left+pageWidth-100, y)
		_ = pdf.Cell(nil, t[1])
		y += 14
	}

	y += 20
	pdf.SetFont("", "", 8)
	pdf.SetXY(left, y)
	_ = pdf.Cell(nil, "Imza (Calisan):")
	pdf.Line(left+80, y+10, left+260, y+10)
	pdf.SetXY(left+pageWidth-200, y)
	_ = pdf.Cell(nil, "Imza (Isveren):")
	pdf.Line(left+pageWidth-130, y+10, left+pageWidth, y+10)

	y += 40
	pdf.SetXY(left, y)
	_ = pdf.Cell(nil, fmt.Sprintf("Uretim: %s · UpCore eHR",
		time.Now().Format("02.01.2006 15:04")))

	var buf bytes.Buffer
	if _, err := pdf.WriteTo(&buf); err != nil {
		return nil, fmt.Errorf("pdf write: %w", err)
	}
	return buf.Bytes(), nil
}

func fmtAmount(v float64) string {
	return fmt.Sprintf("%.2f TL", v)
}

func clip(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func itemTypeLabel(t domain.SlipItemType) string {
	switch t {
	case domain.ItemEarning:
		return "Kazanc"
	case domain.ItemDeduction:
		return "Kesinti"
	case domain.ItemEmployerContribution:
		return "Isveren"
	case domain.ItemInfo:
		return "Bilgi"
	}
	return string(t)
}

// asciify removes Turkish diacritics so the default Helvetica font (no TTF)
// can render them without garbled characters. Once we ship tenant-uploadable
// TTF fonts this layer will no-op.
func asciify(s string) string {
	var out []rune
	for _, r := range s {
		switch r {
		case 'ç':
			out = append(out, 'c')
		case 'Ç':
			out = append(out, 'C')
		case 'ğ':
			out = append(out, 'g')
		case 'Ğ':
			out = append(out, 'G')
		case 'ı':
			out = append(out, 'i')
		case 'İ':
			out = append(out, 'I')
		case 'ö':
			out = append(out, 'o')
		case 'Ö':
			out = append(out, 'O')
		case 'ş':
			out = append(out, 's')
		case 'Ş':
			out = append(out, 'S')
		case 'ü':
			out = append(out, 'u')
		case 'Ü':
			out = append(out, 'U')
		default:
			out = append(out, r)
		}
	}
	return string(out)
}
