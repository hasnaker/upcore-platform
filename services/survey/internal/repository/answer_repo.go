package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// AnswerRepository abstracts persistence for individual survey answers.
type AnswerRepository interface {
	BulkInsert(ctx context.Context, responseID uuid.UUID, answers []domain.Answer) error
	ListByResponse(ctx context.Context, responseID uuid.UUID) ([]domain.Answer, error)
	GetAllForDistribution(ctx context.Context, distributionID uuid.UUID) ([]domain.Answer, error)
}

type answerRepo struct {
	db *sqlx.DB
}

// NewAnswerRepository constructs an AnswerRepository backed by sqlx.
func NewAnswerRepository(db *sqlx.DB) AnswerRepository {
	return &answerRepo{db: db}
}

func (r *answerRepo) BulkInsert(ctx context.Context, responseID uuid.UUID, answers []domain.Answer) error {
	if len(answers) == 0 {
		return nil
	}
	q := `INSERT INTO app.survey_answers (
		id, response_id, item_code, item_id, value_int, value_text, answered_at
	) VALUES ($1, $2, $3, $4, $5, $6, NOW())`
	for _, a := range answers {
		id := uuid.New()
		_, err := r.db.ExecContext(ctx, q, id, responseID, a.ItemCode, a.ItemID, a.ValueInt, a.ValueText)
		if err != nil {
			return fmt.Errorf("insert answer %s: %w", a.ItemCode, err)
		}
	}
	return nil
}

func (r *answerRepo) ListByResponse(ctx context.Context, responseID uuid.UUID) ([]domain.Answer, error) {
	var rows []struct {
		ItemCode  string  `db:"item_code"`
		ItemID    *string `db:"item_id"`
		ValueInt  *int    `db:"value_int"`
		ValueText *string `db:"value_text"`
	}
	q := `SELECT item_code, item_id, value_int, value_text FROM app.survey_answers WHERE response_id = $1 ORDER BY answered_at`
	if err := r.db.SelectContext(ctx, &rows, q, responseID); err != nil {
		return nil, fmt.Errorf("list answers: %w", err)
	}
	answers := make([]domain.Answer, len(rows))
	for i, row := range rows {
		answers[i] = domain.Answer{
			ItemCode:  row.ItemCode,
			ItemID:    row.ItemID,
			ValueInt:  row.ValueInt,
			ValueText: row.ValueText,
		}
	}
	return answers, nil
}

func (r *answerRepo) GetAllForDistribution(ctx context.Context, distributionID uuid.UUID) ([]domain.Answer, error) {
	var rows []struct {
		ItemCode  string  `db:"item_code"`
		ItemID    *string `db:"item_id"`
		ValueInt  *int    `db:"value_int"`
		ValueText *string `db:"value_text"`
	}
	q := `SELECT a.item_code, a.item_id, a.value_int, a.value_text
		FROM app.survey_answers a
		JOIN app.survey_responses r ON a.response_id = r.id
		WHERE r.survey_id = $1
		ORDER BY a.answered_at`
	if err := r.db.SelectContext(ctx, &rows, q, distributionID); err != nil {
		return nil, fmt.Errorf("get all answers for distribution: %w", err)
	}
	answers := make([]domain.Answer, len(rows))
	for i, row := range rows {
		answers[i] = domain.Answer{
			ItemCode:  row.ItemCode,
			ItemID:    row.ItemID,
			ValueInt:  row.ValueInt,
			ValueText: row.ValueText,
		}
	}
	return answers, nil
}
