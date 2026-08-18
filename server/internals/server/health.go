package server

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func HealthCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, map[string]string{
			"server": "Rssfeed server",
			"status": "ok",
			"date":   time.Now().Format(time.DateOnly),
		})
	}
}
