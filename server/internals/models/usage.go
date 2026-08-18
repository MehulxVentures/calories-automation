package models

import "time"

type Usage struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"userId" db:"user_id"`
	Model        string    `json:"model" db:"model"`
	InputTokens  int64     `json:"inputTokens" db:"input_tokens"`
	OutputTokens int64     `json:"outputTokens" db:"output_tokens"`
	RequestID    string    `json:"requestId,omitempty" db:"request_id"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}
