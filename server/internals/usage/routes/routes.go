package routes

import (
	"github.com/MehulxVentures/calories-automation/internals/auth/middleware"
	"github.com/MehulxVentures/calories-automation/internals/usage/handlers"
	"github.com/gin-gonic/gin"
)

type RouteDependencies struct {
	UsageHandler   *handlers.Handler
	AuthMiddleware *middleware.AuthMiddleware
}

func Register(app *gin.Engine, deps RouteDependencies) {
	group := app.Group("/usage", deps.AuthMiddleware.RequireAuth())
	group.POST("", deps.UsageHandler.Create)
	group.GET("", deps.UsageHandler.List)
}
