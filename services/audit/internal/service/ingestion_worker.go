package service

import (
	"context"
	"sync"
	"time"

	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/repository"
)

// IngestionWorker subscribes to audit.event.raw.v1, buffers events,
// and flushes them in batches for high-throughput ingestion (10K events/sec target).
type IngestionWorker struct {
	repo          repository.EventRepository
	batchSize     int
	flushInterval time.Duration
	maxPending    int
	log           zerolog.Logger

	mu      sync.Mutex
	buffer  []*domain.Event
	ingest  chan *domain.Event
}

// NewIngestionWorker constructs an IngestionWorker.
func NewIngestionWorker(
	repo repository.EventRepository,
	batchSize int,
	flushInterval time.Duration,
	maxPending int,
	log zerolog.Logger,
) *IngestionWorker {
	if batchSize <= 0 {
		batchSize = 500
	}
	if flushInterval <= 0 {
		flushInterval = 1 * time.Second
	}
	if maxPending <= 0 {
		maxPending = 10000
	}

	return &IngestionWorker{
		repo:          repo,
		batchSize:     batchSize,
		flushInterval: flushInterval,
		maxPending:    maxPending,
		log:           log,
		buffer:        make([]*domain.Event, 0, batchSize),
		ingest:        make(chan *domain.Event, maxPending),
	}
}

// Enqueue adds an event to the ingestion buffer. Returns ErrBackpressure
// if the buffer is full.
func (w *IngestionWorker) Enqueue(e *domain.Event) error {
	select {
	case w.ingest <- e:
		return nil
	default:
		w.log.Warn().Msg("ingestion backpressure: channel full")
		return domain.ErrBackpressure
	}
}

// Run starts the ingestion loop. It batches incoming events and flushes
// them either when the batch reaches batchSize or flushInterval elapses.
// Blocks until ctx is cancelled.
func (w *IngestionWorker) Run(ctx context.Context) error {
	w.log.Info().
		Int("batch_size", w.batchSize).
		Dur("flush_interval", w.flushInterval).
		Int("max_pending", w.maxPending).
		Msg("ingestion worker started")

	ticker := time.NewTicker(w.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			// Final flush.
			w.drainChannel()
			w.flushBatch(context.Background())
			w.log.Info().Msg("ingestion worker stopped")
			return ctx.Err()

		case e := <-w.ingest:
			w.mu.Lock()
			w.buffer = append(w.buffer, e)
			shouldFlush := len(w.buffer) >= w.batchSize
			w.mu.Unlock()

			if shouldFlush {
				w.flushBatch(ctx)
			}

		case <-ticker.C:
			w.flushBatch(ctx)
		}
	}
}

// drainChannel reads any remaining events from the channel into the buffer.
func (w *IngestionWorker) drainChannel() {
	for {
		select {
		case e := <-w.ingest:
			w.mu.Lock()
			w.buffer = append(w.buffer, e)
			w.mu.Unlock()
		default:
			return
		}
	}
}

// flushBatch writes all buffered events to the database in a single bulk insert.
func (w *IngestionWorker) flushBatch(ctx context.Context) {
	w.mu.Lock()
	if len(w.buffer) == 0 {
		w.mu.Unlock()
		return
	}
	batch := w.buffer
	w.buffer = make([]*domain.Event, 0, w.batchSize)
	w.mu.Unlock()

	start := time.Now()
	n, err := w.repo.BulkInsert(ctx, batch)
	dur := time.Since(start)

	if err != nil {
		w.log.Error().
			Err(err).
			Int("batch_size", len(batch)).
			Msg("flush batch failed")
		// Re-enqueue failed events (best effort, drop on backpressure).
		for _, e := range batch {
			select {
			case w.ingest <- e:
			default:
			}
		}
		return
	}

	w.log.Debug().
		Int("flushed", n).
		Dur("duration", dur).
		Msg("batch flushed")
}

// Pending returns the number of events waiting in the channel.
func (w *IngestionWorker) Pending() int {
	return len(w.ingest)
}
