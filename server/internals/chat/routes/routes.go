package routes

import (
	"github.com/MehulxVentures/calories-automation/internals/auth/middleware"
	"github.com/MehulxVentures/calories-automation/internals/chat/handlers"
	"github.com/gin-gonic/gin"
)

type RouteDependencies struct {
	ChatHandler    *handlers.Handler
	AuthMiddleware *middleware.AuthMiddleware
}

func Register(app *gin.Engine, deps RouteDependencies) {
	group := app.Group("/chat", deps.AuthMiddleware.RequireAuth())
	group.POST("/conversations", deps.ChatHandler.CreateConversation)
	group.GET("/conversations", deps.ChatHandler.ListConversations)
	group.GET("/conversations/:id/messages", deps.ChatHandler.ListMessages)
	group.POST("/conversations/:id/messages", deps.ChatHandler.CreateMessage)
}
