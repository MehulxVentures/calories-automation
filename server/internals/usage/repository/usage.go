package repository

import (
	"context"
	"fmt"

	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

type Summary struct {
	InputTokens  int64 `json:"inputTokens"`
	OutputTokens int64 `json:"outputTokens"`
	Requests     int64 `json:"requests"`
}

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, usage models.Usage) (models.Usage, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO usage (user_id, model, input_tokens, output_tokens, request_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, model, input_tokens, output_tokens, request_id, created_at, updated_at
	`, usage.UserID, usage.Model, usage.InputTokens, usage.OutputTokens, usage.RequestID).Scan(
		&usage.ID, &usage.UserID, &usage.Model, &usage.InputTokens, &usage.OutputTokens,
		&usage.RequestID, &usage.CreatedAt, &usage.UpdatedAt,
	)
	if err != nil {
		return models.Usage{}, fmt.Errorf("create usage: %w", err)
	}
	return usage, nil
}

func (r *Repository) List(ctx context.Context, userID string, limit int) ([]models.Usage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, model, input_tokens, output_tokens, request_id, created_at, updated_at
		FROM usage WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("list usage: %w", err)
	}
	defer rows.Close()
	items := make([]models.Usage, 0)
	for rows.Next() {
		var item models.Usage
		if err := rows.Scan(&item.ID, &item.UserID, &item.Model, &item.InputTokens,
			&item.OutputTokens, &item.RequestID, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan usage: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) Summary(ctx context.Context, userID string) (Summary, error) {
	var summary Summary
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0), COUNT(*)
		FROM usage WHERE user_id = $1
	`, userID).Scan(&summary.InputTokens, &summary.OutputTokens, &summary.Requests)
	return summary, err
}
