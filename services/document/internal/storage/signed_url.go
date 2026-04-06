package storage

import (
	"fmt"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/sas"
)

// generateSASURL builds a SAS URL using the SDK helpers. When readOnly is
// true the permissions are restricted to Read; otherwise Create+Write.
func generateSASURL(
	accountName string,
	cred *azblob.SharedKeyCredential,
	endpoint, container, key, filename string,
	ttl time.Duration,
	readOnly bool,
) (string, error) {
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	expiry := time.Now().UTC().Add(ttl)

	values := sas.BlobSignatureValues{
		Protocol:      sas.ProtocolHTTPS,
		StartTime:     time.Now().UTC().Add(-5 * time.Minute),
		ExpiryTime:    expiry,
		ContainerName: container,
		BlobName:      key,
	}
	if readOnly {
		values.Permissions = (&sas.BlobPermissions{Read: true}).String()
	} else {
		values.Permissions = (&sas.BlobPermissions{Create: true, Write: true}).String()
	}
	if filename != "" {
		values.ContentDisposition = fmt.Sprintf(`attachment; filename="%s"`, sanitizeFilename(filename))
	}

	q, err := values.SignWithSharedKey(cred)
	if err != nil {
		return "", fmt.Errorf("sign sas: %w", err)
	}

	base := strings.TrimRight(endpoint, "/")
	return fmt.Sprintf("%s/%s/%s?%s", base, container, key, q.Encode()), nil
}

// sanitizeFilename strips characters that would break a Content-Disposition
// header.
func sanitizeFilename(name string) string {
	replacer := strings.NewReplacer("\"", "", "\r", "", "\n", "", ";", "_")
	return replacer.Replace(name)
}
