package service

import (
	"context"
	"io"
)

// VirusScanner is a hook invoked on upload. V1 ships with NopScanner; V2 is
// expected to wire in Azure Defender for Storage or a ClamAV sidecar.
type VirusScanner interface {
	Scan(ctx context.Context, blobKey string, r io.Reader) error
}

// NopScanner is a pass-through scanner.
type NopScanner struct{}

// Scan performs no actual scanning but drains the reader so callers can
// compose it in a tee-chain without surprises.
func (NopScanner) Scan(_ context.Context, _ string, r io.Reader) error {
	if r == nil {
		return nil
	}
	_, _ = io.Copy(io.Discard, r)
	return nil
}
