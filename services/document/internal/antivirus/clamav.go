// Package antivirus scans uploaded documents for malware. Uses clamd over
// TCP (or local UNIX socket). When CLAMAV_HOST is unset, NoopScanner passes
// through — dev/test safety net.
package antivirus

import (
	"context"
	"fmt"
	"io"
	"net"
	"os"
	"time"
)

// Verdict represents a scan result.
type Verdict struct {
	Infected bool
	Virus    string
	Details  string
}

// Scanner abstracts the malware scanner.
type Scanner interface {
	Scan(ctx context.Context, body io.Reader) (*Verdict, error)
}

// Clamd implements Scanner via clamd TCP protocol (INSTREAM command).
// Docs: https://docs.clamav.net/manual/Usage/Scanning.html#clamd
type Clamd struct {
	Addr    string // e.g. "clamav:3310"
	Timeout time.Duration
}

// NewClamd reads CLAMAV_HOST (default: clamav:3310).
func NewClamd() Scanner {
	host := os.Getenv("CLAMAV_HOST")
	if host == "" {
		return NoopScanner{}
	}
	return &Clamd{Addr: host, Timeout: 30 * time.Second}
}

// Scan sends the stream through the INSTREAM protocol.
func (c *Clamd) Scan(ctx context.Context, body io.Reader) (*Verdict, error) {
	d := net.Dialer{Timeout: 5 * time.Second}
	conn, err := d.DialContext(ctx, "tcp", c.Addr)
	if err != nil {
		return nil, fmt.Errorf("clamd connect: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(c.Timeout))

	// Protocol: null-byte prefix + "zINSTREAM\0"
	if _, err := conn.Write([]byte("zINSTREAM\x00")); err != nil {
		return nil, err
	}
	buf := make([]byte, 8192)
	for {
		n, err := body.Read(buf)
		if n > 0 {
			// 4-byte big-endian length + chunk
			lenBuf := []byte{byte(n >> 24), byte(n >> 16), byte(n >> 8), byte(n)}
			if _, werr := conn.Write(lenBuf); werr != nil {
				return nil, werr
			}
			if _, werr := conn.Write(buf[:n]); werr != nil {
				return nil, werr
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
	}
	// Zero-length chunk = end of stream.
	if _, err := conn.Write([]byte{0, 0, 0, 0}); err != nil {
		return nil, err
	}

	// Read response: "stream: OK\x00" or "stream: <VIRUS> FOUND\x00"
	respBuf := make([]byte, 4096)
	n, err := conn.Read(respBuf)
	if err != nil && err != io.EOF {
		return nil, err
	}
	line := string(respBuf[:n])
	line = trimNull(line)

	v := &Verdict{Details: line}
	if containsFOUND(line) {
		v.Infected = true
		v.Virus = extractVirus(line)
	}
	return v, nil
}

func trimNull(s string) string {
	for len(s) > 0 && s[len(s)-1] == 0 {
		s = s[:len(s)-1]
	}
	return s
}

func containsFOUND(s string) bool {
	return len(s) >= 5 && s[len(s)-5:] == "FOUND"
}

// extractVirus pulls the virus name out of "stream: Eicar-Test-Signature FOUND".
func extractVirus(s string) string {
	const prefix = "stream: "
	if len(s) < len(prefix) {
		return "unknown"
	}
	rest := s[len(prefix):]
	// last word before " FOUND" - simple split
	for i := len(rest) - 6; i >= 0; i-- {
		if rest[i] == ' ' {
			return rest[:i]
		}
	}
	return rest
}

// NoopScanner returns clean verdict; used when clamd not configured.
type NoopScanner struct{}

// Scan consumes the body and returns clean.
func (NoopScanner) Scan(_ context.Context, body io.Reader) (*Verdict, error) {
	_, _ = io.Copy(io.Discard, body)
	return &Verdict{Infected: false, Details: "noop"}, nil
}
