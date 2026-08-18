package server

import (
	"github.com/MehulxVentures/calories-automation/internals/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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
	app.GET("/health", HealthCheck());

	// Init Repository
	// userRepo := repositories.NewUserRepository(db)

	// Init Service
	// authService := services.NewAuthService(cfg)

	// Init Handler
	// authHandler := handlers.NewAuthHandler(cfg, authService, userRepo)

	// Init Middleware
	// authMiddleware := middleware.NewAuthMiddleware(cfg, authService, userRepo)

	// Register Routes
	// routes.Register(app, routes.RouteDependencies{
	// 	AuthHandler:    authHandler,
	// 	AuthMiddleware: authMiddleware,
	// })

	return app
}