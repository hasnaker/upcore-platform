package service

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// CandidateCSV represents a row from a Kariyer.net CSV feed.
type CandidateCSV struct {
	Email     string
	FirstName string
	LastName  string
	Phone     string
}

// IngestionService handles bulk import of candidates from external sources.
type IngestionService struct {
	candidates repository.CandidateRepository
	publisher  event.Publisher
	log        zerolog.Logger
}

// NewIngestionService constructs the service.
func NewIngestionService(
	candidates repository.CandidateRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *IngestionService {
	return &IngestionService{
		candidates: candidates,
		publisher:  publisher,
		log:        log,
	}
}

// IngestCSV parses a CSV reader and creates candidate records. Deduplicates
// by email per tenant.
func (s *IngestionService) IngestCSV(ctx context.Context, tenantID uuid.UUID, r io.Reader, maxRows int) (created int, skipped int, errs []string) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	// Read header.
	header, err := reader.Read()
	if err != nil {
		errs = append(errs, fmt.Sprintf("read header: %v", err))
		return
	}
	colMap := mapColumns(header)
	if _, ok := colMap["email"]; !ok {
		errs = append(errs, "missing required column: email")
		return
	}

	rowNum := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			errs = append(errs, fmt.Sprintf("row %d: %v", rowNum, err))
			rowNum++
			continue
		}
		if maxRows > 0 && rowNum > maxRows {
			errs = append(errs, fmt.Sprintf("max rows exceeded (%d)", maxRows))
			break
		}
		rowNum++

		email := strings.ToLower(strings.TrimSpace(getCol(record, colMap, "email")))
		if email == "" {
			errs = append(errs, fmt.Sprintf("row %d: empty email", rowNum))
			continue
		}

		// Dedupe.
		existing, _ := s.candidates.Dedupe(ctx, tenantID, email)
		if existing != nil {
			skipped++
			continue
		}

		c := &domain.Candidate{
			TenantID:    tenantID,
			Email:       email,
			FirstName:   strings.TrimSpace(getCol(record, colMap, "first_name")),
			LastName:    strings.TrimSpace(getCol(record, colMap, "last_name")),
			Source:      domain.SourceKariyerNet,
			GDPRConsent: false,
		}
		if v := strings.TrimSpace(getCol(record, colMap, "phone")); v != "" {
			c.Phone = &v
		}
		if c.FirstName == "" {
			c.FirstName = "N/A"
		}
		if c.LastName == "" {
			c.LastName = "N/A"
		}

		if err := s.candidates.Create(ctx, c); err != nil {
			errs = append(errs, fmt.Sprintf("row %d (%s): %v", rowNum, email, err))
			continue
		}
		created++

		s.publishCreate(ctx, c)
	}
	return
}

// IngestLinkedInURL creates a candidate from a LinkedIn URL (placeholder).
func (s *IngestionService) IngestLinkedInURL(ctx context.Context, tenantID uuid.UUID, url string) (*domain.Candidate, error) {
	url = strings.TrimSpace(url)
	if url == "" {
		return nil, domain.NewValidationError(map[string]string{"url": "required"})
	}

	// Extract basic info from URL (placeholder -- real implementation would scrape).
	c := &domain.Candidate{
		TenantID: tenantID,
		Email:    fmt.Sprintf("linkedin_%d@placeholder.com", time.Now().UnixNano()),
		FirstName: "LinkedIn",
		LastName:  "Import",
		Source:    domain.SourceLinkedIn,
	}
	c.LinkedInURL = &url

	if err := s.candidates.Create(ctx, c); err != nil {
		return nil, err
	}
	s.publishCreate(ctx, c)
	return c, nil
}

func (s *IngestionService) publishCreate(ctx context.Context, c *domain.Candidate) {
	if err := s.publisher.Publish(ctx, event.TopicCandidateCreated, map[string]any{
		"candidate_id": c.ID,
		"tenant_id":    c.TenantID,
		"email":        c.Email,
		"source":       c.Source,
		"created_at":   c.CreatedAt,
	}); err != nil {
		s.log.Warn().Err(err).Msg("publish candidate created failed")
	}
}

func mapColumns(header []string) map[string]int {
	m := make(map[string]int, len(header))
	for i, h := range header {
		m[strings.ToLower(strings.TrimSpace(h))] = i
	}
	return m
}

func getCol(record []string, colMap map[string]int, name string) string {
	idx, ok := colMap[name]
	if !ok || idx >= len(record) {
		return ""
	}
	return record[idx]
}
