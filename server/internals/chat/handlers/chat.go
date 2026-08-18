package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/MehulxVentures/calories-automation/internals/chat/repository"
	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/gin-gonic/gin"
)

type Handler struct{ chat *repository.Repository }

func NewHandler(chat *repository.Repository) *Handler { return &Handler{chat: chat} }

func (h *Handler) CreateConversation(c *gin.Context) {
	var input struct {
		Title string `json:"title"`
	}
	_ = c.ShouldBindJSON(&input)
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "New conversation"
	}
	if len(title) > 120 {
		title = title[:120]
	}
	item, err := h.chat.CreateConversation(c.Request.Context(), c.GetString("userID"), title)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create conversation"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"conversation": item})
}

func (h *Handler) ListConversations(c *gin.Context) {
	items, err := h.chat.ListConversations(c.Request.Context(), c.GetString("userID"), boundedLimit(c, 50))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load conversations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"conversations": items})
}

func (h *Handler) ListMessages(c *gin.Context) {
	items, err := h.chat.ListMessages(c.Request.Context(), c.GetString("userID"), c.Param("id"), boundedLimit(c, 30))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load messages"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"messages": items})
}

func (h *Handler) CreateMessage(c *gin.Context) {
	var input struct {
		Role           string          `json:"role" binding:"required,oneof=user assistant tool"`
		Content        string          `json:"content" binding:"required"`
		CalorieEntryID *string         `json:"calorieEntryId"`
		Metadata       json.RawMessage `json:"metadata"`
	}
	if c.ShouldBindJSON(&input) != nil || strings.TrimSpace(input.Content) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid role and content are required"})
		return
	}
	item, err := h.chat.CreateMessage(c.Request.Context(), c.GetString("userID"), models.Message{
		ConversationID: c.Param("id"), Role: input.Role, Content: strings.TrimSpace(input.Content),
		CalorieEntryID: input.CalorieEntryID, Metadata: input.Metadata,
	})
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save message"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": item})
}

func boundedLimit(c *gin.Context, fallback int) int {
	value, err := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(fallback)))
	if err != nil || value < 1 || value > 100 {
		return fallback
	}
	return value
}
