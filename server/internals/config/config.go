package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	FrontendURL        string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		Port: getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		FrontendURL: getEnv("FRONTEND_URL", ""),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("db url is required")
	}

	if cfg.Port == "" {
		return Config{}, fmt.Errorf("port is required")
	}

	return cfg, nil
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}