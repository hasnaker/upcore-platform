package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"hash"
	"io"
)

// HashingReader wraps an io.Reader while computing SHA-256 and counting bytes
// read. This avoids buffering the entire file in memory during upload.
type HashingReader struct {
	r     io.Reader
	h     hash.Hash
	count int64
}

// NewHashingReader wraps r.
func NewHashingReader(r io.Reader) *HashingReader {
	return &HashingReader{r: r, h: sha256.New()}
}

// Read implements io.Reader.
func (hr *HashingReader) Read(p []byte) (int, error) {
	n, err := hr.r.Read(p)
	if n > 0 {
		hr.h.Write(p[:n])
		hr.count += int64(n)
	}
	return n, err
}

// Sum returns the hex-encoded SHA-256 digest for all bytes read so far.
func (hr *HashingReader) Sum() string {
	return hex.EncodeToString(hr.h.Sum(nil))
}

// BytesRead returns total bytes that have passed through the reader.
func (hr *HashingReader) BytesRead() int64 {
	return hr.count
}

// LimitedHashingReader wraps HashingReader with a max-byte guard. Read returns
// io.ErrShortBuffer when the limit is exceeded.
type LimitedHashingReader struct {
	*HashingReader
	limit int64
}

// NewLimitedHashingReader enforces maxBytes on the underlying reader.
func NewLimitedHashingReader(r io.Reader, maxBytes int64) *LimitedHashingReader {
	return &LimitedHashingReader{HashingReader: NewHashingReader(r), limit: maxBytes}
}

// Read implements io.Reader with a hard size cap.
func (l *LimitedHashingReader) Read(p []byte) (int, error) {
	if l.limit > 0 && l.HashingReader.count >= l.limit {
		return 0, ErrSizeExceeded
	}
	if l.limit > 0 {
		remaining := l.limit - l.HashingReader.count + 1 // +1 to detect overflow
		if int64(len(p)) > remaining {
			p = p[:remaining]
		}
	}
	n, err := l.HashingReader.Read(p)
	if l.limit > 0 && l.HashingReader.count > l.limit {
		return n, ErrSizeExceeded
	}
	return n, err
}
