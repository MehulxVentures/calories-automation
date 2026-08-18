package routes

import (
	"github.com/MehulxVentures/calories-automation/internals/auth/middleware"
	"github.com/MehulxVentures/calories-automation/internals/calories/handlers"
	"github.com/gin-gonic/gin"
)

type RouteDependencies struct {
	CaloriesHandler *handlers.Handler
	AuthMiddleware  *middleware.AuthMiddleware
}

func Register(app *gin.Engine, deps RouteDependencies) {
	group := app.Group("/calories", deps.AuthMiddleware.RequireAuth())
	group.POST("", deps.CaloriesHandler.CreateManual)
	group.GET("", deps.CaloriesHandler.List)
	group.PATCH("/:id", deps.CaloriesHandler.Update)
	group.DELETE("/:id", deps.CaloriesHandler.Delete)

	agent := app.Group("/agent", deps.AuthMiddleware.RequireAuth())
	agent.POST("/calories", deps.CaloriesHandler.CreateFromAgent)
}
