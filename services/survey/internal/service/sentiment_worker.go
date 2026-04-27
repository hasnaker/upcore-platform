package service

import (
	"context"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
)

// SentimentWorker polls survey_response_sentiment for rows with NULL
// sentiment_score and fills them using a lightweight heuristic (dev) or
// the ML scoring service (production).
//
// Heuristic: Türkçe sentiment lexicon; pozitif/negatif kelime oranı.
// Production: call ml-services/psychometric-scoring sentiment endpoint.
type SentimentWorker struct {
	DB       *sqlx.DB
	Interval time.Duration
	Scorer   SentimentScorer
	Log      zerolog.Logger
}

// SentimentScorer is injected to allow swapping ML provider.
type SentimentScorer interface {
	Score(ctx context.Context, text string) (score float64, label string, themes []string, err error)
}

// NewSentimentWorker constructs the worker with default hourly cadence.
func NewSentimentWorker(db *sqlx.DB, scorer SentimentScorer, log zerolog.Logger) *SentimentWorker {
	return &SentimentWorker{DB: db, Interval: time.Hour, Scorer: scorer, Log: log}
}

// Run blocks until ctx is cancelled.
func (w *SentimentWorker) Run(ctx context.Context) {
	t := time.NewTicker(w.Interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := w.tick(ctx); err != nil {
				w.Log.Error().Err(err).Msg("sentiment tick failed")
			}
		}
	}
}

type pendingRow struct {
	ID       string `db:"id"`
	TenantID string `db:"tenant_id"`
	Text     string `db:"text_content"`
}

func (w *SentimentWorker) tick(ctx context.Context) error {
	var rows []pendingRow
	if err := w.DB.SelectContext(ctx, &rows,
		`SELECT id::text, tenant_id::text, text_content
		 FROM app.survey_response_sentiment
		 WHERE sentiment_score IS NULL
		 LIMIT 200`); err != nil {
		// Table may not exist in older deployments — ignore gracefully.
		w.Log.Debug().Err(err).Msg("sentiment select skipped")
		return nil
	}
	for _, r := range rows {
		score, label, themes, err := w.Scorer.Score(ctx, r.Text)
		if err != nil {
			continue
		}
		if _, err := w.DB.ExecContext(ctx,
			`UPDATE app.survey_response_sentiment
			 SET sentiment_score=$2, sentiment_label=$3, themes=$4, processed_at=NOW()
			 WHERE id=$1::uuid`, r.ID, score, label, themes); err != nil {
			w.Log.Warn().Err(err).Str("id", r.ID).Msg("sentiment update failed")
		}
	}
	return nil
}

// HeuristicScorer is a tiny lexicon-based scorer — dev fallback so the
// pipeline works even without the ML service running.
type HeuristicScorer struct{}

// Score implements SentimentScorer.
func (HeuristicScorer) Score(_ context.Context, text string) (float64, string, []string, error) {
	positive := []string{"iyi", "harika", "mükemmel", "güzel", "memnun", "başarılı", "keyifli"}
	negative := []string{"kötü", "berbat", "zor", "sorun", "memnun değil", "stres", "yorgun", "mutsuz"}
	lower := strings.ToLower(text)
	pos, neg := 0, 0
	for _, w := range positive {
		if strings.Contains(lower, w) {
			pos++
		}
	}
	for _, w := range negative {
		if strings.Contains(lower, w) {
			neg++
		}
	}
	if pos == 0 && neg == 0 {
		return 0, "neutral", nil, nil
	}
	score := float64(pos-neg) / float64(pos+neg)
	label := "neutral"
	if score > 0.2 {
		label = "positive"
	} else if score < -0.2 {
		label = "negative"
	}
	var themes []string
	for _, w := range []string{"yönetim", "iş yükü", "maaş", "takım", "eğitim", "kariyer", "çevre"} {
		if strings.Contains(lower, w) {
			themes = append(themes, w)
		}
	}
	return score, label, themes, nil
}
