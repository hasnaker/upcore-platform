package service

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// LocalBlobUploader is a dev/test BlobUploader implementation that writes
// the archive to the local filesystem instead of Azure. Keeps the DR drill
// working without cloud credentials.
type LocalBlobUploader struct {
	Root string
}

// NewLocalBlobUploader creates the directory if missing.
func NewLocalBlobUploader(root string) (*LocalBlobUploader, error) {
	if root == "" {
		root = filepath.Join(os.TempDir(), "upcore-audit-archive")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &LocalBlobUploader{Root: root}, nil
}

// Upload implements BlobUploader.
func (l *LocalBlobUploader) Upload(_ context.Context, key string, payload []byte, _ string) error {
	full := filepath.Join(l.Root, key)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	return os.WriteFile(full, payload, 0o644)
}

// NoopBlobUploader does nothing — used when archiving is disabled in config.
type NoopBlobUploader struct{}

// Upload implements BlobUploader with no side effects.
func (NoopBlobUploader) Upload(_ context.Context, _ string, _ []byte, _ string) error {
	return nil
}

// ResolveUploader picks an uploader based on env.
// AUDIT_ARCHIVE_BACKEND:
//   - "local" → LocalBlobUploader (AUDIT_ARCHIVE_ROOT path).
//   - "azure" → not wired here; requires azblob SDK injection.
//   - ""      → NoopBlobUploader.
func ResolveUploader() (BlobUploader, error) {
	switch os.Getenv("AUDIT_ARCHIVE_BACKEND") {
	case "local":
		return NewLocalBlobUploader(os.Getenv("AUDIT_ARCHIVE_ROOT"))
	case "azure":
		// Placeholder: real deployment wires azblob + SAS credential.
		return NoopBlobUploader{}, fmt.Errorf("azure uploader requires SDK wiring")
	}
	return NoopBlobUploader{}, nil
}
