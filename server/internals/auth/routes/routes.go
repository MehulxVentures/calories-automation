package routes

import (
	"github.com/MehulxVentures/calories-automation/internals/auth/handlers"
	"github.com/MehulxVentures/calories-automation/internals/auth/middleware"
	"github.com/gin-gonic/gin"
)

type RouteDependencies struct {
	AuthHandler    *handlers.AuthHandler
	AuthMiddleware *middleware.AuthMiddleware
}

func Register(app *gin.Engine, deps RouteDependencies) {
	auth := app.Group("/auth")
	auth.POST("/register", deps.AuthHandler.Register)
	auth.POST("/login", deps.AuthHandler.Login)
	auth.GET("/me", deps.AuthMiddleware.RequireAuth(), deps.AuthHandler.Me)
}
