package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// AzureBlobReal is a lightweight Azure Blob REST client.
// No SDK dependency — uses Storage Shared Key auth (Auth v2).
// Docs: https://learn.microsoft.com/rest/api/storageservices/
//
// Required env:
//   AZURE_BLOB_ACCOUNT
//   AZURE_BLOB_KEY (base64-encoded shared key)
//   AZURE_BLOB_CONTAINER
type AzureBlobReal struct {
	AccountName   string
	AccountKey    []byte
	ContainerName string
	client        *http.Client
}

// NewAzureBlobReal constructs the real uploader. Returns nil-safe fallback
// on missing env so callers can switch to LocalFS.
func NewAzureBlobReal(account, base64Key, container string) (*AzureBlobReal, error) {
	if account == "" || base64Key == "" {
		return nil, fmt.Errorf("azure blob not configured")
	}
	key, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return nil, fmt.Errorf("azure blob key decode: %w", err)
	}
	if container == "" {
		container = "uploads"
	}
	return &AzureBlobReal{
		AccountName:   account,
		AccountKey:    key,
		ContainerName: container,
		client:        &http.Client{Timeout: 60 * time.Second},
	}, nil
}

// Upload writes the blob via PUT and returns its public URL.
func (a *AzureBlobReal) Upload(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	buf, err := io.ReadAll(body)
	if err != nil {
		return "", err
	}
	now := time.Now().UTC().Format(http.TimeFormat)
	path := fmt.Sprintf("/%s/%s", a.ContainerName, strings.TrimLeft(key, "/"))
	u := fmt.Sprintf("https://%s.blob.core.windows.net%s", a.AccountName, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, u, bytes.NewReader(buf))
	if err != nil {
		return "", err
	}
	req.Header.Set("x-ms-version", "2021-12-02")
	req.Header.Set("x-ms-date", now)
	req.Header.Set("x-ms-blob-type", "BlockBlob")
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(buf)))
	req.Header.Set("Authorization", a.signRequest("PUT", path, req.Header, len(buf), contentType))

	resp, err := a.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		msg, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("azure put blob %d: %s", resp.StatusCode, string(msg))
	}
	return u, nil
}

// SignedReadURL generates a SAS (Shared Access Signature) read URL.
// TTL: 10 minutes by default. Used for secure downloads.
func (a *AzureBlobReal) SignedReadURL(key string, ttl time.Duration) string {
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}
	expiry := time.Now().UTC().Add(ttl).Format("2006-01-02T15:04:05Z")
	start := time.Now().UTC().Add(-5 * time.Minute).Format("2006-01-02T15:04:05Z")

	// StringToSign for service SAS v2021-12-02
	stringToSign := strings.Join([]string{
		"r",                     // signedPermissions
		start,                   // signedStart
		expiry,                  // signedExpiry
		fmt.Sprintf("/blob/%s/%s/%s", a.AccountName, a.ContainerName, key), // canonicalizedResource
		"",                      // signedIdentifier
		"",                      // signedIP
		"https",                 // signedProtocol
		"2021-12-02",            // signedVersion
		"b",                     // signedResource (blob)
		"",                      // signedSnapshotTime
		"",                      // signedEncryptionScope
		"",                      // rscc
		"",                      // rscd
		"",                      // rsce
		"",                      // rscl
		"",                      // rsct
	}, "\n")
	mac := hmac.New(sha256.New, a.AccountKey)
	mac.Write([]byte(stringToSign))
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	params := url.Values{}
	params.Set("sv", "2021-12-02")
	params.Set("sr", "b")
	params.Set("sp", "r")
	params.Set("st", start)
	params.Set("se", expiry)
	params.Set("spr", "https")
	params.Set("sig", sig)

	return fmt.Sprintf("https://%s.blob.core.windows.net/%s/%s?%s",
		a.AccountName, a.ContainerName, key, params.Encode())
}

// signRequest implements Azure Storage Shared Key auth header.
func (a *AzureBlobReal) signRequest(method, path string, headers http.Header, contentLength int, contentType string) string {
	stringToSign := strings.Join([]string{
		method,
		"",  // Content-Encoding
		"",  // Content-Language
		fmt.Sprintf("%d", contentLength),
		"",  // Content-MD5
		contentType,
		"",  // Date (empty because we use x-ms-date)
		"",  // If-Modified-Since
		"",  // If-Match
		"",  // If-None-Match
		"",  // If-Unmodified-Since
		"",  // Range
		a.canonicalizedHeaders(headers),
		a.canonicalizedResource(path),
	}, "\n")

	mac := hmac.New(sha256.New, a.AccountKey)
	mac.Write([]byte(stringToSign))
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("SharedKey %s:%s", a.AccountName, sig)
}

func (a *AzureBlobReal) canonicalizedHeaders(h http.Header) string {
	keys := []string{}
	for k := range h {
		lk := strings.ToLower(k)
		if strings.HasPrefix(lk, "x-ms-") {
			keys = append(keys, lk)
		}
	}
	// Sort manually with simple bubble — small list.
	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if keys[i] > keys[j] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
	var sb strings.Builder
	for i, k := range keys {
		if i > 0 {
			sb.WriteString("\n")
		}
		sb.WriteString(k)
		sb.WriteString(":")
		sb.WriteString(strings.TrimSpace(h.Get(k)))
	}
	return sb.String()
}

func (a *AzureBlobReal) canonicalizedResource(path string) string {
	return fmt.Sprintf("/%s%s", a.AccountName, path)
}
