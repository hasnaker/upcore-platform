// Package pdf renders employee-facing PDFs (offer letters, onboarding docs).
package pdf

import (
	"bytes"
	"fmt"
	"time"

	"github.com/signintech/gopdf"

	"github.com/upcore/employee/internal/domain"
)

// OfferDoc bundles the fields needed to render a teklif mektubu PDF.
type OfferDoc struct {
	TenantName    string
	TenantTaxNo   string
	TenantAddress string
	Offer         *domain.OfferLetter
	CreatedBy     string // offeri hazırlayan IK yetkilisi
}

// RenderOffer produces an A4 offer letter PDF.
func RenderOffer(d OfferDoc) ([]byte, error) {
	if d.Offer == nil {
		return nil, fmt.Errorf("offer required")
	}
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	const left = 50.0
	pageW := 495.0
	y := 50.0

	// Header
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 16)
	_ = pdf.Cell(nil, asciify(d.TenantName))
	y += 20
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 9)
	if d.TenantTaxNo != "" {
		_ = pdf.Cell(nil, "VKN: "+d.TenantTaxNo)
	}
	if d.TenantAddress != "" {
		y += 12
		pdf.SetXY(left, y)
		_ = pdf.Cell(nil, asciify(d.TenantAddress))
	}

	y += 24
	pdf.Line(left, y, left+pageW, y)
	y += 20

	// Title
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 16)
	_ = pdf.Cell(nil, "TEKLIF MEKTUBU")
	y += 20

	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 9)
	_ = pdf.Cell(nil, fmt.Sprintf("Teklif Tarihi: %s",
		d.Offer.CreatedAt.Format("02.01.2006")))
	pdf.SetXY(left+pageW-180, y)
	_ = pdf.Cell(nil, fmt.Sprintf("Gecerlilik: %s", d.Offer.ExpiresAt.Format("02.01.2006")))

	y += 30

	// Body greeting
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 11)
	_ = pdf.Cell(nil, "Sayin "+asciify(d.Offer.AdSoyad)+",")
	y += 20

	// Intro paragraph
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 10)
	paragraph(&pdf, left, &y, pageW,
		asciify(fmt.Sprintf(
			"Sirketimize basvurunuz ve gerceklestirdigimiz gorusmeler neticesinde, %q pozisyonu icin asagida detaylari belirtilen teklifi sunmaktan memnuniyet duyariz.",
			d.Offer.PositionTitle)),
	)

	y += 16

	// Terms table
	rows := [][2]string{
		{"Pozisyon", d.Offer.PositionTitle},
		{"Baslangic Tarihi", d.Offer.StartDate.Format("02.01.2006")},
	}
	if d.Offer.SalaryBrut != nil {
		rows = append(rows, [2]string{
			"Brut Maas",
			fmt.Sprintf("%.2f %s", *d.Offer.SalaryBrut, d.Offer.SalaryCurrency),
		})
	}
	if d.Offer.BonusAnnual != nil {
		rows = append(rows, [2]string{
			"Yillik Prim",
			fmt.Sprintf("%.2f %s", *d.Offer.BonusAnnual, d.Offer.SalaryCurrency),
		})
	}
	rows = append(rows, [2]string{
		"Teklif Durumu",
		string(d.Offer.Status),
	})

	for _, r := range rows {
		if y > 720 {
			pdf.AddPage()
			y = 60
		}
		pdf.SetXY(left, y)
		_ = pdf.SetFont("", "", 10)
		_ = pdf.Cell(nil, asciify(r[0])+":")
		pdf.SetXY(left+160, y)
		_ = pdf.Cell(nil, asciify(r[1]))
		y += 16
	}

	y += 16

	// Closing paragraph
	paragraph(&pdf, left, &y, pageW,
		asciify("Teklifimizi kabul etmeniz halinde, birlikte calisacagimiz icin kendimizi sansli hissedecegiz. Teklif, yukarida belirtilen gecerlilik tarihine kadar baglayicidir."),
	)
	y += 16
	paragraph(&pdf, left, &y, pageW,
		asciify("Kabul beyanini online olarak elektronik imza ile iletebilir, veya bu dokumani imzalayarak iade edebilirsiniz."),
	)

	y += 40
	pdf.SetXY(left, y)
	_ = pdf.Cell(nil, "Adayin Imzasi:")
	pdf.Line(left+90, y+10, left+pageW/2-20, y+10)
	pdf.SetXY(left+pageW/2+20, y)
	_ = pdf.Cell(nil, "IK Yetkilisi:")
	pdf.Line(left+pageW/2+90, y+10, left+pageW, y+10)

	y += 30
	pdf.SetXY(left, y)
	_ = pdf.SetFont("", "", 8)
	_ = pdf.Cell(nil, fmt.Sprintf("Belge Uretim: %s · UpCore eHR",
		time.Now().Format("02.01.2006 15:04")))

	var buf bytes.Buffer
	if _, err := pdf.WriteTo(&buf); err != nil {
		return nil, fmt.Errorf("pdf write: %w", err)
	}
	return buf.Bytes(), nil
}

// paragraph writes a wrap-at-word paragraph. 80 chars per line roughly fits
// 495pt at 10pt Helvetica.
func paragraph(pdf *gopdf.GoPdf, left float64, y *float64, _ float64, text string) {
	const maxPerLine = 95
	runes := []rune(text)
	lineStart := 0
	for i := 0; i < len(runes); i++ {
		if i-lineStart >= maxPerLine {
			// back up to last space
			j := i
			for j > lineStart && runes[j] != ' ' {
				j--
			}
			if j == lineStart {
				j = i
			}
			pdf.SetXY(left, *y)
			_ = pdf.Cell(nil, string(runes[lineStart:j]))
			*y += 14
			lineStart = j + 1
		}
	}
	if lineStart < len(runes) {
		pdf.SetXY(left, *y)
		_ = pdf.Cell(nil, string(runes[lineStart:]))
		*y += 14
	}
}

// asciify strips Turkish diacritics so the default Helvetica core font can
// render without TTF assets. Same strategy as the bordro payslip renderer.
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
