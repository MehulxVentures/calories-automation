package main

import (
	"context"
	"log"

	"github.com/MehulxVentures/calories-automation/internals/config"
	"github.com/MehulxVentures/calories-automation/internals/database"
	"github.com/MehulxVentures/calories-automation/internals/server"
)

func main() {

	// Load Context
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Load config: %v", err)
	}

	// Base Context
	ctx := context.Background()

	db, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Connect Database: %v", err)
	}

	defer db.Close()

	// Create Server
	app := server.New(cfg, db)

	log.Printf("backend running on http://localhost:%s", cfg.Port)

	if err := app.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Listen: %v", err)
	}
}
