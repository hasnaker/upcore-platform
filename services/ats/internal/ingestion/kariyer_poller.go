// Package ingestion provides the Kariyer.net CSV feed poller.
package ingestion

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// CandidateCSV represents a row from the Kariyer.net CSV feed.
type CandidateCSV struct {
	Email     string
	FirstName string
	LastName  string
	Phone     string
}

// KariyerPoller polls Kariyer.net for new candidate CSVs.
type KariyerPoller struct {
	feedURL    string
	feedAuth   string
	tenantID   uuid.UUID
	candidates repository.CandidateRepository
	publisher  event.Publisher
	client     *http.Client
	log        zerolog.Logger
}

// NewKariyerPoller constructs a poller.
func NewKariyerPoller(
	feedURL, feedAuth string,
	tenantID uuid.UUID,
	candidates repository.CandidateRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *KariyerPoller {
	return &KariyerPoller{
		feedURL:    feedURL,
		feedAuth:   feedAuth,
		tenantID:   tenantID,
		candidates: candidates,
		publisher:  publisher,
		client:     &http.Client{Timeout: 30 * time.Second},
		log:        log,
	}
}

// Run starts the polling loop. Blocks until ctx is cancelled.
func (p *KariyerPoller) Run(ctx context.Context, interval time.Duration) {
	if p.feedURL == "" {
		p.log.Info().Msg("kariyer poller: no feed URL configured, skipping")
		return
	}
	p.log.Info().
		Str("url", p.feedURL).
		Dur("interval", interval).
		Msg("kariyer poller: starting")

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			p.log.Info().Msg("kariyer poller: stopped")
			return
		case <-ticker.C:
			if err := p.poll(ctx); err != nil {
				p.log.Error().Err(err).Msg("kariyer poller: poll failed")
			}
		}
	}
}

func (p *KariyerPoller) poll(ctx context.Context) error {
	records, err := p.fetchFeed(ctx, p.feedURL, p.feedAuth)
	if err != nil {
		return fmt.Errorf("fetch feed: %w", err)
	}
	if len(records) == 0 {
		p.log.Info().Msg("kariyer poller: no records")
		return nil
	}
	return p.ingestBatch(ctx, p.tenantID, records)
}

func (p *KariyerPoller) fetchFeed(ctx context.Context, url, auth string) ([]CandidateCSV, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("feed returned status %d", resp.StatusCode)
	}

	reader := csv.NewReader(resp.Body)
	reader.TrimLeadingSpace = true

	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}
	colMap := mapColumns(header)

	var records []CandidateCSV
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		records = append(records, CandidateCSV{
			Email:     strings.TrimSpace(getCol(row, colMap, "email")),
			FirstName: strings.TrimSpace(getCol(row, colMap, "first_name")),
			LastName:  strings.TrimSpace(getCol(row, colMap, "last_name")),
			Phone:     strings.TrimSpace(getCol(row, colMap, "phone")),
		})
	}
	return records, nil
}

func (p *KariyerPoller) ingestBatch(ctx context.Context, tenantID uuid.UUID, records []CandidateCSV) error {
	created, skipped := 0, 0
	for _, rec := range records {
		email := strings.ToLower(strings.TrimSpace(rec.Email))
		if email == "" {
			continue
		}
		// Dedupe.
		existing, _ := p.candidates.Dedupe(ctx, tenantID, email)
		if existing != nil {
			skipped++
			continue
		}

		c := &domain.Candidate{
			TenantID:  tenantID,
			Email:     email,
			FirstName: rec.FirstName,
			LastName:  rec.LastName,
			Source:    domain.SourceKariyerNet,
		}
		if rec.Phone != "" {
			c.Phone = &rec.Phone
		}
		if c.FirstName == "" {
			c.FirstName = "N/A"
		}
		if c.LastName == "" {
			c.LastName = "N/A"
		}

		if err := p.candidates.Create(ctx, c); err != nil {
			p.log.Warn().Err(err).Str("email", email).Msg("kariyer poller: create failed")
			continue
		}
		created++

		_ = p.publisher.Publish(ctx, event.TopicCandidateCreated, map[string]any{
			"candidate_id": c.ID,
			"tenant_id":    tenantID,
			"email":        c.Email,
			"source":       domain.SourceKariyerNet,
		})
	}
	p.log.Info().
		Int("created", created).
		Int("skipped", skipped).
		Int("total", len(records)).
		Msg("kariyer poller: batch complete")
	return nil
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
