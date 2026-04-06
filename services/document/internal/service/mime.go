package service

import (
	"path/filepath"
	"strings"
)

// allowedMimeTypes restricts uploads to a safe file-type allow-list.
var allowedMimeTypes = map[string]string{
	"application/pdf": ".pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
	"application/msword": ".doc",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
	"application/vnd.ms-excel": ".xls",
	"image/jpeg":               ".jpg",
	"image/jpg":                ".jpg",
	"image/png":                ".png",
	"image/tiff":               ".tiff",
}

// extensionToMime covers the reverse lookup for clients that send raw
// extensions instead of Content-Type headers.
var extensionToMime = map[string]string{
	".pdf":  "application/pdf",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".doc":  "application/msword",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".xls":  "application/vnd.ms-excel",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
}

// IsMimeAllowed reports whether the content-type is in the allow-list.
func IsMimeAllowed(mime string) bool {
	_, ok := allowedMimeTypes[strings.ToLower(mime)]
	return ok
}

// ExtensionForMime returns the default extension for a mime type, or "".
func ExtensionForMime(mime string) string {
	return allowedMimeTypes[strings.ToLower(mime)]
}

// MimeFromFilename infers a content type from the filename suffix. Returns
// empty string when the extension is not recognised.
func MimeFromFilename(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	return extensionToMime[ext]
}

// SafeBlobSuffix derives a filesystem-safe suffix for a blob path from the
// original filename, clamping length.
func SafeBlobSuffix(filename string) string {
	name := filepath.Base(strings.TrimSpace(filename))
	if name == "" || name == "." || name == "/" {
		name = "file"
	}
	// Replace spaces and unsafe separators.
	replacer := strings.NewReplacer(" ", "-", "/", "-", "\\", "-", "?", "", "#", "", "%", "")
	name = replacer.Replace(name)
	if len(name) > 80 {
		ext := filepath.Ext(name)
		base := strings.TrimSuffix(name, ext)
		if len(base) > 80-len(ext) {
			base = base[:80-len(ext)]
		}
		name = base + ext
	}
	return name
}
