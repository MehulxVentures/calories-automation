package models

import (
	"encoding/json"
	"time"
)

type Conversation struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"userId" db:"user_id"`
	Title     string    `json:"title" db:"title"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type Message struct {
	ID             string          `json:"id" db:"id"`
	ConversationID string          `json:"conversationId" db:"conversation_id"`
	Role           string          `json:"role" db:"role"`
	Content        string          `json:"content" db:"content"`
	CalorieEntryID *string         `json:"calorieEntryId,omitempty" db:"calorie_entry_id"`
	Metadata       json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt      time.Time       `json:"createdAt" db:"created_at"`
}
