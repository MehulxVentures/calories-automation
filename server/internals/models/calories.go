package models

import "time"

type Calories struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"userId" db:"user_id"`
	Dish        string    `json:"dish" db:"dish"`
	Fat         float64   `json:"fat" db:"fat"`
	Ingredients string    `json:"ingredients" db:"ingredients"`
	Calories    float64   `json:"calories" db:"calories"`
	Source      string    `json:"source" db:"source"`
	ConsumedAt  time.Time `json:"consumedAt" db:"consumed_at"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}
