package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrEmailTaken   = errors.New("email is already registered")
	ErrUserNotFound = errors.New("user not found")
)

type UserRepository struct{ db *pgxpool.Pool }

func NewUserRepository(db *pgxpool.Pool) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(ctx context.Context, email string, passwordHash string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, role, timezone, created_at, updated_at
	`, strings.ToLower(strings.TrimSpace(email)), passwordHash).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Timezone,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return models.User{}, ErrEmailTaken
		}
		return models.User{}, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (models.User, error) {
	return r.find(ctx, `
		SELECT id, email, password_hash, role, timezone, created_at, updated_at
		FROM users WHERE LOWER(email) = LOWER($1)
	`, strings.TrimSpace(email))
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (models.User, error) {
	return r.find(ctx, `
		SELECT id, email, password_hash, role, timezone, created_at, updated_at
		FROM users WHERE id = $1
	`, id)
}

func (r *UserRepository) find(ctx context.Context, query string, value any) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, query, value).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Timezone,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, ErrUserNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("find user: %w", err)
	}
	return user, nil
}
