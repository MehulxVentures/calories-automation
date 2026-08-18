package middleware

import (
	"net/http"
	"strings"

	"github.com/MehulxVentures/calories-automation/internals/auth/repository"
	"github.com/MehulxVentures/calories-automation/internals/auth/services"
	"github.com/MehulxVentures/calories-automation/internals/config"
	"github.com/gin-gonic/gin"
)

type AuthMiddleware struct {
	auth  *services.AuthService
	users *repository.UserRepository
}

func NewAuthMiddleware(_ config.Config, auth *services.AuthService, users *repository.UserRepository) *AuthMiddleware {
	return &AuthMiddleware{auth: auth, users: users}
}

func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		userID, err := m.auth.ParseToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		user, err := m.users.FindByID(c.Request.Context(), userID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user no longer exists"})
			return
		}
		c.Set("userID", user.ID)
		c.Set("user", user)
		c.Next()
	}
}
