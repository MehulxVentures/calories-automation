package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("calorie entry not found")

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, entry models.Calories) (models.Calories, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO calories (user_id, dish, fat, ingredients, calories, source, consumed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, dish, fat, ingredients, calories, source,
		          consumed_at, created_at, updated_at
	`, entry.UserID, entry.Dish, entry.Fat, entry.Ingredients, entry.Calories,
		entry.Source, entry.ConsumedAt).Scan(
		&entry.ID, &entry.UserID, &entry.Dish, &entry.Fat, &entry.Ingredients,
		&entry.Calories, &entry.Source, &entry.ConsumedAt, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if err != nil {
		return models.Calories{}, fmt.Errorf("create calorie entry: %w", err)
	}
	return entry, nil
}

func (r *Repository) List(ctx context.Context, userID string, from, to time.Time, limit int) ([]models.Calories, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, dish, fat, ingredients, calories, source,
		       consumed_at, created_at, updated_at
		FROM calories
		WHERE user_id = $1 AND consumed_at >= $2 AND consumed_at < $3
		ORDER BY consumed_at DESC
		LIMIT $4
	`, userID, from, to, limit)
	if err != nil {
		return nil, fmt.Errorf("list calorie entries: %w", err)
	}
	defer rows.Close()

	entries := make([]models.Calories, 0)
	for rows.Next() {
		var entry models.Calories
		if err := rows.Scan(&entry.ID, &entry.UserID, &entry.Dish, &entry.Fat, &entry.Ingredients,
			&entry.Calories, &entry.Source, &entry.ConsumedAt, &entry.CreatedAt, &entry.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan calorie entry: %w", err)
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

func (r *Repository) Delete(ctx context.Context, userID, id string) error {
	result, err := r.db.Exec(ctx, `DELETE FROM calories WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete calorie entry: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type UpdateParams struct {
	Dish        *string
	Fat         *float64
	Ingredients *string
	Calories    *float64
	Source      *string
	ConsumedAt  *time.Time
}

func (r *Repository) Update(ctx context.Context, userID, id string, params UpdateParams) (models.Calories, error) {
	var entry models.Calories
	err := r.db.QueryRow(ctx, `
		UPDATE calories
		SET dish = COALESCE($3, dish),
		    fat = COALESCE($4, fat),
		    ingredients = COALESCE($5, ingredients),
		    calories = COALESCE($6, calories),
		    source = COALESCE($7, source),
		    consumed_at = COALESCE($8, consumed_at),
		    updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, dish, fat, ingredients, calories, source,
		          consumed_at, created_at, updated_at
	`, id, userID, params.Dish, params.Fat, params.Ingredients, params.Calories,
		params.Source, params.ConsumedAt).Scan(
		&entry.ID, &entry.UserID, &entry.Dish, &entry.Fat, &entry.Ingredients,
		&entry.Calories, &entry.Source, &entry.ConsumedAt, &entry.CreatedAt, &entry.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Calories{}, ErrNotFound
	}
	if err != nil {
		return models.Calories{}, fmt.Errorf("update calorie entry: %w", err)
	}
	return entry, nil
}

func (r *Repository) Total(ctx context.Context, userID string, from, to time.Time) (float64, error) {
	var total float64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(calories), 0) FROM calories
		WHERE user_id = $1 AND consumed_at >= $2 AND consumed_at < $3
	`, userID, from, to).Scan(&total)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return total, err
}
