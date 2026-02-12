package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config — полная конфигурация сервиса.
// Значения считываются из переменных окружения (или .env файла).
// Все поля с `required:"true"` обязательны при запуске в production.
type Config struct {
	// --- Server ---
	Env          string        // "development" | "production"
	GRPCAddr     string        // ":8090"
	ReadTimeout  time.Duration // таймаут чтения gRPC запроса
	WriteTimeout time.Duration // таймаут записи gRPC ответа

	// --- Database ---
	DBDriver string // "postgres" | "sqlite"
	// Postgres
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	// SQLite (для lite-режима)
	DBSQLitePath string

	// --- JWT ---
	JWTSecret          string
	JWTAccessTokenTTL  time.Duration
	JWTRefreshTokenTTL time.Duration

	// --- LiveKit (Phase 3) ---
	LiveKitURL    string
	LiveKitKey    string
	LiveKitSecret string

	// --- S3 / MinIO (Phase 4) ---
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string
	S3Bucket    string
	S3UseSSL    bool
}

// Load загружает конфигурацию. Сначала пытается прочитать .env файл
// (игнорирует ошибку если файл отсутствует), затем читает переменные окружения.
func Load() (*Config, error) {
	// Загружаем .env если он есть (ошибка - не критична)
	_ = godotenv.Load()

	cfg := &Config{
		Env:      getEnv("APP_ENV", "development"),
		GRPCAddr: getEnv("GRPC_ADDR", ":8090"),

		ReadTimeout:  getDurationEnv("READ_TIMEOUT", 30*time.Second),
		WriteTimeout: getDurationEnv("WRITE_TIMEOUT", 30*time.Second),

		DBDriver:     getEnv("DB_DRIVER", "postgres"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBUser:       getEnv("DB_USER", "kitsu"),
		DBPassword:   getEnv("DB_PASSWORD", ""),
		DBName:       getEnv("DB_NAME", "kitsulan"),
		DBSSLMode:    getEnv("DB_SSL_MODE", "disable"),
		DBSQLitePath: getEnv("DB_SQLITE_PATH", "kitsulan.db"),

		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTAccessTokenTTL:  getDurationEnv("JWT_ACCESS_TTL", 24*time.Hour),
		JWTRefreshTokenTTL: getDurationEnv("JWT_REFRESH_TTL", 7*24*time.Hour),

		LiveKitURL:    getEnv("LIVEKIT_URL", ""),
		LiveKitKey:    getEnv("LIVEKIT_KEY", ""),
		LiveKitSecret: getEnv("LIVEKIT_SECRET", ""),

		S3Endpoint:  getEnv("S3_ENDPOINT", ""),
		S3AccessKey: getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey: getEnv("S3_SECRET_KEY", ""),
		S3Bucket:    getEnv("S3_BUCKET", "kitsulan"),
		S3UseSSL:    getBoolEnv("S3_USE_SSL", false),
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// validate проверяет обязательные поля для production-среды.
func (c *Config) validate() error {
	if c.IsProduction() {
		if c.JWTSecret == "" {
			return fmt.Errorf("JWT_SECRET must be set in production")
		}
		if len(c.JWTSecret) < 32 {
			return fmt.Errorf("JWT_SECRET must be at least 32 characters long")
		}
	}

	if c.DBDriver != "postgres" && c.DBDriver != "sqlite" {
		return fmt.Errorf("DB_DRIVER must be 'postgres' or 'sqlite', got: %q", c.DBDriver)
	}

	return nil
}

// IsProduction возвращает true если сервис запущен в production-режиме.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

// PostgresDSN формирует строку подключения для PostgreSQL.
func (c *Config) PostgresDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}

// --- helpers ---

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getBoolEnv(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
