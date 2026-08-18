package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	FrontendURL string
	JWTSecret   string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		FrontendURL: getEnv("FRONTEND_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", ""),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("db url is required")
	}

	if cfg.Port == "" {
		return Config{}, fmt.Errorf("port is required")
	}

	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("jwt secret is required")
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
