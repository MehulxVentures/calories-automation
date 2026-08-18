package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("conversation not found")

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) CreateConversation(ctx context.Context, userID, title string) (models.Conversation, error) {
	var item models.Conversation
	err := r.db.QueryRow(ctx, `
		INSERT INTO conversations (user_id, title) VALUES ($1, $2)
		RETURNING id, user_id, title, created_at, updated_at
	`, userID, title).Scan(&item.ID, &item.UserID, &item.Title, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repository) ListConversations(ctx context.Context, userID string, limit int) ([]models.Conversation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, title, created_at, updated_at
		FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("list conversations: %w", err)
	}
	defer rows.Close()
	items := make([]models.Conversation, 0)
	for rows.Next() {
		var item models.Conversation
		if err := rows.Scan(&item.ID, &item.UserID, &item.Title, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListMessages(ctx context.Context, userID, conversationID string, limit int) ([]models.Message, error) {
	rows, err := r.db.Query(ctx, `
		SELECT m.id, m.conversation_id, m.role, m.content, m.calorie_entry_id, m.metadata, m.created_at
		FROM (
			SELECT m.* FROM messages m
			JOIN conversations c ON c.id = m.conversation_id
			WHERE m.conversation_id = $1 AND c.user_id = $2
			ORDER BY m.created_at DESC LIMIT $3
		) m ORDER BY m.created_at ASC
	`, conversationID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()
	items := make([]models.Message, 0)
	for rows.Next() {
		var item models.Message
		if err := rows.Scan(&item.ID, &item.ConversationID, &item.Role, &item.Content,
			&item.CalorieEntryID, &item.Metadata, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if len(items) == 0 {
		var exists bool
		if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2)`, conversationID, userID).Scan(&exists); err != nil {
			return nil, err
		}
		if !exists {
			return nil, ErrNotFound
		}
	}
	return items, rows.Err()
}

func (r *Repository) CreateMessage(ctx context.Context, userID string, message models.Message) (models.Message, error) {
	if len(message.Metadata) == 0 {
		message.Metadata = json.RawMessage(`{}`)
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return models.Message{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	err = tx.QueryRow(ctx, `
		INSERT INTO messages (conversation_id, role, content, calorie_entry_id, metadata)
		SELECT c.id, $3, $4, $5, $6
		FROM conversations c WHERE c.id = $1 AND c.user_id = $2
		RETURNING id, conversation_id, role, content, calorie_entry_id, metadata, created_at
	`, message.ConversationID, userID, message.Role, message.Content,
		message.CalorieEntryID, message.Metadata).Scan(
		&message.ID, &message.ConversationID, &message.Role, &message.Content,
		&message.CalorieEntryID, &message.Metadata, &message.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Message{}, ErrNotFound
	}
	if err != nil {
		return models.Message{}, fmt.Errorf("create message: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE conversations SET updated_at = NOW() WHERE id = $1`, message.ConversationID); err != nil {
		return models.Message{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Message{}, err
	}
	return message, nil
}
