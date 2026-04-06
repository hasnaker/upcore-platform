// Package cv provides PDF/DOCX text extraction for candidate CVs.
package cv

import (
	"fmt"
	"io"
	"strings"
)

// SupportedMimeTypes lists the MIME types the parser can handle.
var SupportedMimeTypes = map[string]bool{
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"text/plain": true,
}

// ExtractText reads a CV file and returns its plain text content.
// In production, this uses PDF/DOCX parsing libraries (ledongthuc/pdf, docx).
// For now, this is a placeholder that handles text/plain and returns a stub
// for PDF/DOCX.
func ExtractText(mimeType string, r io.Reader) (string, error) {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))

	if !SupportedMimeTypes[mimeType] {
		return "", fmt.Errorf("unsupported MIME type: %s", mimeType)
	}

	switch mimeType {
	case "text/plain":
		data, err := io.ReadAll(io.LimitReader(r, 10<<20)) // 10 MB limit
		if err != nil {
			return "", fmt.Errorf("read text: %w", err)
		}
		return string(data), nil
	case "application/pdf":
		return extractPDF(r)
	case "application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return extractDocx(r)
	}

	return "", fmt.Errorf("unsupported: %s", mimeType)
}

// extractPDF extracts text from a PDF reader.
// Placeholder -- production would use ledongthuc/pdf or pdfcpu.
func extractPDF(r io.Reader) (string, error) {
	data, err := io.ReadAll(io.LimitReader(r, 10<<20))
	if err != nil {
		return "", fmt.Errorf("read pdf: %w", err)
	}
	// In production, parse the PDF binary and extract text.
	// For now, return a marker indicating the size.
	return fmt.Sprintf("[PDF content: %d bytes]", len(data)), nil
}

// extractDocx extracts text from a DOCX reader.
// Placeholder -- production would use a DOCX parsing library.
func extractDocx(r io.Reader) (string, error) {
	data, err := io.ReadAll(io.LimitReader(r, 10<<20))
	if err != nil {
		return "", fmt.Errorf("read docx: %w", err)
	}
	return fmt.Sprintf("[DOCX content: %d bytes]", len(data)), nil
}
