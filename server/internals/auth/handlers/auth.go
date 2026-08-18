package handlers

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"

	"github.com/MehulxVentures/calories-automation/internals/auth/repository"
	"github.com/MehulxVentures/calories-automation/internals/auth/services"
	"github.com/MehulxVentures/calories-automation/internals/config"
	"github.com/MehulxVentures/calories-automation/internals/models"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	auth  *services.AuthService
	users *repository.UserRepository
}

type credentials struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func NewAuthHandler(_ config.Config, auth *services.AuthService, users *repository.UserRepository) *AuthHandler {
	return &AuthHandler{auth: auth, users: users}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input credentials
	if c.ShouldBindJSON(&input) != nil || !validEmail(input.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid email and password of 8-72 characters are required"})
		return
	}
	hash, err := h.auth.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
		return
	}
	user, err := h.users.Create(c.Request.Context(), input.Email, hash)
	if errors.Is(err, repository.ErrEmailTaken) {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
		return
	}
	h.respond(c, http.StatusCreated, user)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input credentials
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
		return
	}
	user, err := h.users.FindByEmail(c.Request.Context(), input.Email)
	if err != nil || !h.auth.VerifyPassword(user.PasswordHash, input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}
	h.respond(c, http.StatusOK, user)
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func (h *AuthHandler) respond(c *gin.Context, status int, user models.User) {
	token, err := h.auth.CreateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}
	c.JSON(status, authResponse{Token: token, User: user})
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(strings.TrimSpace(value))
	return err == nil && strings.EqualFold(address.Address, strings.TrimSpace(value))
}
