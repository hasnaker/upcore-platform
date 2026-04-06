package service

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"

	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

func TestIngestionService_IngestCSV(t *testing.T) {
	candRepo := repository.NewFakeCandidateRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	svc := NewIngestionService(candRepo, pub, log)

	tenantID := uuid.New()
	csvData := `email,first_name,last_name,phone
ayse@example.com,Ayse,Yilmaz,+905551234567
mehmet@example.com,Mehmet,Demir,
ayse@example.com,Ayse,Yilmaz,+905551234567
invalid-email,,,,
`
	reader := strings.NewReader(csvData)
	created, skipped, errs := svc.IngestCSV(context.Background(), tenantID, reader, 0)

	assert.Equal(t, 2, created)
	assert.Equal(t, 1, skipped) // duplicate
	assert.True(t, len(errs) >= 1) // invalid row
}

func TestIngestionService_IngestCSV_MaxRows(t *testing.T) {
	candRepo := repository.NewFakeCandidateRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	svc := NewIngestionService(candRepo, pub, log)

	tenantID := uuid.New()
	csvData := `email,first_name,last_name
a@example.com,A,B
b@example.com,B,C
c@example.com,C,D
`
	reader := strings.NewReader(csvData)
	created, _, errs := svc.IngestCSV(context.Background(), tenantID, reader, 2)

	assert.Equal(t, 2, created)
	assert.True(t, len(errs) >= 1) // max rows exceeded
}

func TestIngestionService_IngestCSV_MissingHeader(t *testing.T) {
	candRepo := repository.NewFakeCandidateRepo()
	pub := event.NewInMemoryPublisher()
	log := zerolog.Nop()
	svc := NewIngestionService(candRepo, pub, log)

	tenantID := uuid.New()
	csvData := `name,phone
A,123
`
	reader := strings.NewReader(csvData)
	_, _, errs := svc.IngestCSV(context.Background(), tenantID, reader, 0)
	assert.True(t, len(errs) >= 1)
	assert.Contains(t, errs[0], "missing required column")
}
