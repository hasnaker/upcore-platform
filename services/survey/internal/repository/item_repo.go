package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// ItemRepository abstracts persistence for survey items.
type ItemRepository interface {
	BulkInsert(ctx context.Context, items []*domain.Item) error
	ListBySurvey(ctx context.Context, surveyID uuid.UUID) ([]*domain.Item, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error)
	Delete(ctx context.Context, surveyID uuid.UUID) error
}

type itemRepo struct {
	db *sqlx.DB
}

// NewItemRepository constructs an ItemRepository backed by sqlx.
func NewItemRepository(db *sqlx.DB) ItemRepository {
	return &itemRepo{db: db}
}

func (r *itemRepo) BulkInsert(ctx context.Context, items []*domain.Item) error {
	if len(items) == 0 {
		return nil
	}
	q := `INSERT INTO app.survey_items (
		id, survey_id, item_code, text_tr, text_en, dimension,
		response_type, response_options, reverse_scored, order_index
	) VALUES (
		:id, :survey_id, :item_code, :text_tr, :text_en, :dimension,
		:response_type, :response_options, :reverse_scored, :order_index
	)`
	for _, item := range items {
		if item.ID == uuid.Nil {
			item.ID = uuid.New()
		}
		if _, err := r.db.NamedExecContext(ctx, q, item); err != nil {
			return fmt.Errorf("insert item %s: %w", item.ItemCode, err)
		}
	}
	return nil
}

func (r *itemRepo) ListBySurvey(ctx context.Context, surveyID uuid.UUID) ([]*domain.Item, error) {
	var items []*domain.Item
	q := `SELECT * FROM app.survey_items WHERE survey_id = $1 ORDER BY order_index`
	if err := r.db.SelectContext(ctx, &items, q, surveyID); err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	return items, nil
}

func (r *itemRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	var item domain.Item
	q := `SELECT * FROM app.survey_items WHERE id = $1`
	if err := r.db.GetContext(ctx, &item, q, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get item: %w", err)
	}
	return &item, nil
}

func (r *itemRepo) Delete(ctx context.Context, surveyID uuid.UUID) error {
	_, _ = time.Now(), surveyID
	q := `DELETE FROM app.survey_items WHERE survey_id = $1`
	if _, err := r.db.ExecContext(ctx, q, surveyID); err != nil {
		return fmt.Errorf("delete items: %w", err)
	}
	return nil
}
