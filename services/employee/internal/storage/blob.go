// Package storage provides object storage adapters for employee uploads
// (avatars, attachments). Two implementations:
//   - LocalFS: dev-only; writes under ./tmp/upcore-uploads + serves via /static.
//   - AzureBlob: production Azure Blob SAS uploader (stub — wire SDK in real prod).
package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Uploader matches the signature expected by the avatar handler.
type Uploader interface {
	Upload(ctx context.Context, key string, body io.Reader, contentType string) (string, error)
}

// LocalFS writes to the local filesystem. URL returned is absolute,
// served by the service via /static/<key>.
type LocalFS struct {
	Root      string // e.g. /var/upcore/uploads
	PublicURL string // e.g. https://app.upcore.app/static
}

// NewLocalFS creates and prepares the upload directory.
func NewLocalFS(root, publicURL string) (*LocalFS, error) {
	if root == "" {
		root = filepath.Join(os.TempDir(), "upcore-uploads")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, err
	}
	return &LocalFS{Root: root, PublicURL: strings.TrimRight(publicURL, "/")}, nil
}

// Upload implements Uploader.
func (l *LocalFS) Upload(_ context.Context, key string, body io.Reader, _ string) (string, error) {
	full := filepath.Join(l.Root, key)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(full)
	if err != nil {
		return "", err
	}
	defer f.Close()
	if _, err := io.Copy(f, body); err != nil {
		return "", err
	}
	if l.PublicURL == "" {
		return "file://" + full, nil
	}
	return l.PublicURL + "/" + strings.TrimLeft(key, "/"), nil
}

// AzureBlob stub — production deployment wires the real azblob SDK here.
// Left as a thin shell so unit tests and dev mode don't need Azure creds.
type AzureBlob struct {
	AccountName   string
	ContainerName string
	// client *azblob.Client in real prod
}

// NewAzureBlob constructs the stub.
func NewAzureBlob(account, container string) *AzureBlob {
	return &AzureBlob{AccountName: account, ContainerName: container}
}

// Upload returns the computed blob URL. Real SDK wiring is intentionally
// left to deploy-time to keep the go.mod lean.
func (a *AzureBlob) Upload(_ context.Context, key string, _ io.Reader, _ string) (string, error) {
	if a.AccountName == "" {
		return "", fmt.Errorf("azure blob not configured")
	}
	return fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s",
		a.AccountName, a.ContainerName, key), nil
}
