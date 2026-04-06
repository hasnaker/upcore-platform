package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/blob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/bloberror"
)

// BlobClient is the minimal interface required by the service layer.
// Implementations: AzureBlobClient (production), MemoryBlobClient (tests).
type BlobClient interface {
	Upload(ctx context.Context, container, key string, r io.Reader, contentType string) error
	Download(ctx context.Context, container, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, container, key string) error
	Exists(ctx context.Context, container, key string) (bool, error)
	SignedReadURL(ctx context.Context, container, key, filename string, ttl time.Duration) (string, error)
	SignedWriteURL(ctx context.Context, container, key string, ttl time.Duration) (string, error)
}

// Sentinel errors for storage operations.
var (
	ErrSizeExceeded      = errors.New("upload size limit exceeded")
	ErrBlobNotFound      = errors.New("blob not found")
	ErrUnsupportedDriver = errors.New("unsupported storage driver")
	ErrNotConfigured     = errors.New("storage driver not configured")
)

// AzureBlobClient implements BlobClient against real Azure Blob Storage.
type AzureBlobClient struct {
	accountName string
	accountKey  string
	endpoint    string
	svc         *azblob.Client
	cred        *azblob.SharedKeyCredential
}

// NewAzureBlobClient builds a client from account credentials. The endpoint
// is optional — when empty, the default `https://{account}.blob.core.windows.net`
// is used.
func NewAzureBlobClient(accountName, accountKey, endpoint string) (*AzureBlobClient, error) {
	if accountName == "" || accountKey == "" {
		return nil, ErrNotConfigured
	}
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.blob.core.windows.net/", accountName)
	}
	cred, err := azblob.NewSharedKeyCredential(accountName, accountKey)
	if err != nil {
		return nil, fmt.Errorf("azblob credential: %w", err)
	}
	svc, err := azblob.NewClientWithSharedKeyCredential(endpoint, cred, nil)
	if err != nil {
		return nil, fmt.Errorf("azblob client: %w", err)
	}
	return &AzureBlobClient{
		accountName: accountName,
		accountKey:  accountKey,
		endpoint:    endpoint,
		svc:         svc,
		cred:        cred,
	}, nil
}

// EnsureContainer creates the container if it does not yet exist.
func (c *AzureBlobClient) EnsureContainer(ctx context.Context, container string) error {
	_, err := c.svc.CreateContainer(ctx, container, nil)
	if err != nil && !bloberror.HasCode(err, bloberror.ContainerAlreadyExists) {
		return fmt.Errorf("create container: %w", err)
	}
	return nil
}

// Upload streams r into the given container/key.
func (c *AzureBlobClient) Upload(ctx context.Context, container, key string, r io.Reader, contentType string) error {
	opts := &azblob.UploadStreamOptions{
		BlockSize:   4 * 1024 * 1024,
		Concurrency: 4,
		HTTPHeaders: &blob.HTTPHeaders{BlobContentType: strPtr(contentType)},
	}
	if _, err := c.svc.UploadStream(ctx, container, key, r, opts); err != nil {
		return fmt.Errorf("upload stream: %w", err)
	}
	return nil
}

// Download returns a ReadCloser over the remote blob body.
func (c *AzureBlobClient) Download(ctx context.Context, container, key string) (io.ReadCloser, error) {
	resp, err := c.svc.DownloadStream(ctx, container, key, nil)
	if err != nil {
		if bloberror.HasCode(err, bloberror.BlobNotFound) {
			return nil, ErrBlobNotFound
		}
		return nil, fmt.Errorf("download stream: %w", err)
	}
	return resp.Body, nil
}

// Delete removes a blob.
func (c *AzureBlobClient) Delete(ctx context.Context, container, key string) error {
	_, err := c.svc.DeleteBlob(ctx, container, key, nil)
	if err != nil {
		if bloberror.HasCode(err, bloberror.BlobNotFound) {
			return ErrBlobNotFound
		}
		return fmt.Errorf("delete blob: %w", err)
	}
	return nil
}

// Exists performs a conditional HEAD to determine existence.
func (c *AzureBlobClient) Exists(ctx context.Context, container, key string) (bool, error) {
	_, err := c.svc.ServiceClient().NewContainerClient(container).NewBlobClient(key).GetProperties(ctx, nil)
	if err != nil {
		if bloberror.HasCode(err, bloberror.BlobNotFound) {
			return false, nil
		}
		var rerr *azcore.ResponseError
		if errors.As(err, &rerr) && rerr.StatusCode == 404 {
			return false, nil
		}
		return false, fmt.Errorf("get properties: %w", err)
	}
	return true, nil
}

// SignedReadURL generates a time-limited SAS URL for reads.
func (c *AzureBlobClient) SignedReadURL(ctx context.Context, container, key, filename string, ttl time.Duration) (string, error) {
	return generateSASURL(c.accountName, c.cred, c.endpoint, container, key, filename, ttl, true)
}

// SignedWriteURL generates a time-limited SAS URL for writes.
func (c *AzureBlobClient) SignedWriteURL(ctx context.Context, container, key string, ttl time.Duration) (string, error) {
	return generateSASURL(c.accountName, c.cred, c.endpoint, container, key, "", ttl, false)
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
