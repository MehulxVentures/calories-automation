package server

import (
	"github.com/MehulxVentures/calories-automation/internals/auth/handlers"
	"github.com/MehulxVentures/calories-automation/internals/auth/middleware"
	"github.com/MehulxVentures/calories-automation/internals/auth/repository"
	authroutes "github.com/MehulxVentures/calories-automation/internals/auth/routes"
	"github.com/MehulxVentures/calories-automation/internals/auth/services"
	caloriehandlers "github.com/MehulxVentures/calories-automation/internals/calories/handlers"
	calorierepository "github.com/MehulxVentures/calories-automation/internals/calories/repository"
	calorieroutes "github.com/MehulxVentures/calories-automation/internals/calories/routes"
	chathandlers "github.com/MehulxVentures/calories-automation/internals/chat/handlers"
	chatrepository "github.com/MehulxVentures/calories-automation/internals/chat/repository"
	chatroutes "github.com/MehulxVentures/calories-automation/internals/chat/routes"
	"github.com/MehulxVentures/calories-automation/internals/config"
	usagehandlers "github.com/MehulxVentures/calories-automation/internals/usage/handlers"
	usagerepository "github.com/MehulxVentures/calories-automation/internals/usage/repository"
	usageroutes "github.com/MehulxVentures/calories-automation/internals/usage/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func New(cfg config.Config, db *pgxpool.Pool) *gin.Engine {

	// New Gin App
	app := gin.New()

	// New Logger Mw
	app.Use(gin.Logger())

	// Catches if lag or failure happens
	app.Use(gin.Recovery())

	// New Cors Mw
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL},
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
	}))

	// Health Route
	app.GET("/health", HealthCheck())

	// Init Repository
	authRepo := repository.NewUserRepository(db)
	calorieRepo := calorierepository.NewRepository(db)
	usageRepo := usagerepository.NewRepository(db)
	chatRepo := chatrepository.NewRepository(db)

	// Init Service
	authService := services.NewAuthService(cfg)

	// Init Handler
	authHandler := handlers.NewAuthHandler(cfg, authService, authRepo)
	calorieHandler := caloriehandlers.NewHandler(calorieRepo)
	usageHandler := usagehandlers.NewHandler(usageRepo)
	chatHandler := chathandlers.NewHandler(chatRepo)

	// Init Middleware
	authMiddleware := middleware.NewAuthMiddleware(cfg, authService, authRepo)

	// Register Routes
	authroutes.Register(app, authroutes.RouteDependencies{
		AuthHandler:    authHandler,
		AuthMiddleware: authMiddleware,
	})
	calorieroutes.Register(app, calorieroutes.RouteDependencies{
		CaloriesHandler: calorieHandler,
		AuthMiddleware:  authMiddleware,
	})
	usageroutes.Register(app, usageroutes.RouteDependencies{
		UsageHandler:   usageHandler,
		AuthMiddleware: authMiddleware,
	})
	chatroutes.Register(app, chatroutes.RouteDependencies{
		ChatHandler:    chatHandler,
		AuthMiddleware: authMiddleware,
	})

	return app
}
