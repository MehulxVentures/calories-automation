package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/MehulxVentures/calories-automation/internals/usage/repository"
	"github.com/gin-gonic/gin"
)

type Handler struct{ usage *repository.Repository }

type createRequest struct {
	Model        string `json:"model" binding:"required"`
	InputTokens  int64  `json:"inputTokens" binding:"gte=0"`
	OutputTokens int64  `json:"outputTokens" binding:"gte=0"`
	RequestID    string `json:"requestId"`
}

func NewHandler(usage *repository.Repository) *Handler { return &Handler{usage: usage} }

func (h *Handler) Create(c *gin.Context) {
	var input createRequest
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Model) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "model is required and token counts cannot be negative"})
		return
	}
	item, err := h.usage.Create(c.Request.Context(), models.Usage{
		UserID: c.GetString("userID"), Model: strings.TrimSpace(input.Model),
		InputTokens: input.InputTokens, OutputTokens: input.OutputTokens, RequestID: strings.TrimSpace(input.RequestID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not record usage"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"usage": item})
}

func (h *Handler) List(c *gin.Context) {
	limit := 100
	if value, err := strconv.Atoi(c.DefaultQuery("limit", "100")); err == nil && value > 0 && value <= 500 {
		limit = value
	}
	items, err := h.usage.List(c.Request.Context(), c.GetString("userID"), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load usage"})
		return
	}
	summary, err := h.usage.Summary(c.Request.Context(), c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not calculate usage"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"usage": items, "summary": summary})
}
