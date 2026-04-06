package esignature

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestStubProvider_FullFlow(t *testing.T) {
	t.Parallel()
	p := NewStubProvider("eimzala")
	ctx := context.Background()

	sess, err := p.InitiateSignature(ctx, SignatureRequest{
		DocumentID:   uuid.New(),
		VersionID:    uuid.New(),
		SignerName:   "Ali Veli",
		SignerTCKN:   "11111111110",
		Document:     []byte("PDF"),
		DocumentName: "contract.pdf",
		TTL:          1 * time.Hour,
	})
	if err != nil {
		t.Fatalf("initiate: %v", err)
	}
	if sess.SessionID == "" || sess.SignURL == "" {
		t.Fatalf("empty session fields: %+v", sess)
	}

	status, err := p.GetStatus(ctx, sess.SessionID)
	if err != nil || status.Status != "pending" {
		t.Fatalf("status: %v %q", err, status.Status)
	}

	// Simulate webhook completion.
	if err := p.MarkSigned(sess.SessionID, []byte("SIGNED"), "CERT-123"); err != nil {
		t.Fatalf("mark signed: %v", err)
	}
	status, err = p.GetStatus(ctx, sess.SessionID)
	if err != nil || status.Status != "signed" || status.CertificateSerial != "CERT-123" {
		t.Fatalf("status after sign: %+v err=%v", status, err)
	}

	pdf, err := p.DownloadSignedDocument(ctx, sess.SessionID)
	if err != nil || string(pdf) != "SIGNED" {
		t.Fatalf("download signed: %q err=%v", pdf, err)
	}
}

func TestStubProvider_Cancel(t *testing.T) {
	t.Parallel()
	p := NewStubProvider("kamu_sm")
	ctx := context.Background()
	sess, _ := p.InitiateSignature(ctx, SignatureRequest{DocumentID: uuid.New(), VersionID: uuid.New()})
	if err := p.Cancel(ctx, sess.SessionID); err != nil {
		t.Fatalf("cancel: %v", err)
	}
	st, err := p.GetStatus(ctx, sess.SessionID)
	if err != nil {
		t.Fatalf("status: %v", err)
	}
	if st.Status != "cancelled" {
		t.Fatalf("want cancelled, got %q", st.Status)
	}
}

func TestStubProvider_Expiry(t *testing.T) {
	t.Parallel()
	p := NewStubProvider("edevlet")
	ctx := context.Background()
	sess, _ := p.InitiateSignature(ctx, SignatureRequest{DocumentID: uuid.New(), VersionID: uuid.New(), TTL: 1 * time.Millisecond})
	time.Sleep(10 * time.Millisecond)
	st, _ := p.GetStatus(ctx, sess.SessionID)
	if st.Status != "expired" {
		t.Fatalf("expected expired, got %q", st.Status)
	}
}

func TestStubProvider_UnknownSession(t *testing.T) {
	t.Parallel()
	p := NewStubProvider("mobile")
	if _, err := p.GetStatus(context.Background(), "nope"); err != ErrSessionNotFound {
		t.Fatalf("want ErrSessionNotFound, got %v", err)
	}
}
