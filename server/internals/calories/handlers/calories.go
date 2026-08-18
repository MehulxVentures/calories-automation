package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/MehulxVentures/calories-automation/internals/calories/repository"
	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/gin-gonic/gin"
)

type Handler struct{ entries *repository.Repository }

type createRequest struct {
	Dish        string     `json:"dish"`
	Fat         float64    `json:"fat" binding:"gte=0"`
	Ingredients string     `json:"ingredients"`
	Calories    float64    `json:"calories" binding:"required,gt=0"`
	Source      string     `json:"source" binding:"omitempty,oneof=agent manual import"`
	ConsumedAt  *time.Time `json:"consumedAt"`
}

type updateRequest struct {
	Dish        *string    `json:"dish"`
	Fat         *float64   `json:"fat"`
	Ingredients *string    `json:"ingredients"`
	Calories    *float64   `json:"calories"`
	Source      *string    `json:"source"`
	ConsumedAt  *time.Time `json:"consumedAt"`
}

func NewHandler(entries *repository.Repository) *Handler { return &Handler{entries: entries} }

func (h *Handler) Create(c *gin.Context) {
	var input createRequest
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "calories must be greater than zero and fat cannot be negative"})
		return
	}
	userID, ok := c.Get("userID")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	dish := strings.TrimSpace(input.Dish)
	if dish == "" {
		dish = "Quick calorie entry"
	}
	source := input.Source
	if source == "" {
		source = "manual"
	}
	consumedAt := time.Now()
	if input.ConsumedAt != nil {
		consumedAt = *input.ConsumedAt
	}
	entry, err := h.entries.Create(c.Request.Context(), models.Calories{
		UserID: userID.(string), Dish: dish, Fat: input.Fat, Ingredients: input.Ingredients,
		Calories: input.Calories, Source: source, ConsumedAt: consumedAt,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save calorie entry"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"entry": entry})
}

func (h *Handler) List(c *gin.Context) {
	userID := c.GetString("userID")
	from, to, ok := dateRange(c)
	if !ok {
		return
	}
	limit := 100
	if value, err := strconv.Atoi(c.DefaultQuery("limit", "100")); err == nil && value > 0 && value <= 500 {
		limit = value
	}
	entries, err := h.entries.List(c.Request.Context(), userID, from, to, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load calorie entries"})
		return
	}
	total, err := h.entries.Total(c.Request.Context(), userID, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not calculate calorie total"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries, "totalCalories": total, "from": from, "to": to})
}

func (h *Handler) Delete(c *gin.Context) {
	err := h.entries.Delete(c.Request.Context(), c.GetString("userID"), c.Param("id"))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete calorie entry"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) Update(c *gin.Context) {
	var input updateRequest
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if input.Dish == nil && input.Fat == nil && input.Ingredients == nil && input.Calories == nil && input.Source == nil && input.ConsumedAt == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one field is required"})
		return
	}
	if input.Dish != nil {
		trimmed := strings.TrimSpace(*input.Dish)
		if trimmed == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "dish cannot be blank"})
			return
		}
		input.Dish = &trimmed
	}
	if input.Fat != nil && *input.Fat < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fat cannot be negative"})
		return
	}
	if input.Calories != nil && *input.Calories <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "calories must be greater than zero"})
		return
	}
	if input.Source != nil {
		source := strings.TrimSpace(*input.Source)
		if source != "agent" && source != "manual" && source != "import" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "source must be agent, manual, or import"})
			return
		}
		input.Source = &source
	}
	entry, err := h.entries.Update(c.Request.Context(), c.GetString("userID"), c.Param("id"), repository.UpdateParams{
		Dish: input.Dish, Fat: input.Fat, Ingredients: input.Ingredients,
		Calories: input.Calories, Source: input.Source, ConsumedAt: input.ConsumedAt,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update calorie entry"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entry": entry})
}

func dateRange(c *gin.Context) (time.Time, time.Time, bool) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -30)
	to := now.AddDate(0, 0, 1)
	var err error
	if value := c.Query("from"); value != "" {
		from, err = time.Parse(time.RFC3339, value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "from must be an RFC3339 timestamp"})
			return time.Time{}, time.Time{}, false
		}
	}
	if value := c.Query("to"); value != "" {
		to, err = time.Parse(time.RFC3339, value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "to must be an RFC3339 timestamp"})
			return time.Time{}, time.Time{}, false
		}
	}
	if !from.Before(to) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from must be before to"})
		return time.Time{}, time.Time{}, false
	}
	return from, to, true
}
