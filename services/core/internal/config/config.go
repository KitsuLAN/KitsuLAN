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

	// --- Cache ---
	CacheEnabled   bool // Вкл/выкл кэш глобально
	CacheNamespace string
	CacheVersion   string

	// TTL
	CacheTTL       time.Duration // Базовый TTL
	CacheTTLJitter float64

	// Redis (L2)
	RedisAddr          string
	RedisPassword      string
	RedisDB            int
	RedisCacheFailover bool

	RedisDialTimeout  time.Duration
	RedisReadTimeout  time.Duration
	RedisWriteTimeout time.Duration
	RedisPoolSize     int

	// Ristretto Config (L1 Memory)
	CacheL1Enabled     bool
	CacheL1MaxCost     int64 // Макс размер в байтах (напр. 100MB)
	CacheL1NumCounters int64 // Ожидаемое кол-во ключей * 10 (для Bloom filter)
	CacheL1TTL         time.Duration
	CacheL1Metrics     bool

	// --- Observability ---
	HealthPort  string
	MetricsPort string
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

		// Cache
		CacheEnabled:       getBoolEnv("CACHE_ENABLED", true),
		CacheNamespace:     getEnv("CACHE_NAMESPACE", "kitsulan-core"),
		CacheVersion:       getEnv("CACHE_VERSION", "v1"),
		CacheTTL:           getDurationEnv("CACHE_TTL", 10*time.Minute),
		CacheTTLJitter:     getFloat64Env("CACHE_TTL_JITTER", 0.15),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		RedisDB:            getIntEnv("REDIS_DB", 0),
		RedisCacheFailover: getBoolEnv("REDIS_CACHE_FAILOVER", false),
		RedisDialTimeout:   getDurationEnv("REDIS_DIAL_TIMEOUT", 2*time.Second),
		RedisReadTimeout:   getDurationEnv("REDIS_READ_TIMEOUT", 500*time.Millisecond),
		RedisWriteTimeout:  getDurationEnv("REDIS_WRITE_TIMEOUT", 500*time.Millisecond),
		CacheL1Enabled:     getBoolEnv("CACHE_L1_ENABLED", getBoolEnv("CACHE_ENABLED", true)),
		CacheL1MaxCost:     getInt64Env("CACHE_L1_MAX_COST", 100*1024*1024), // 100MB
		CacheL1NumCounters: getInt64Env("CACHE_L1_NUM_COUNTERS", 1_000_000),
		CacheL1TTL:         getDurationEnv("CACHE_L1_TTL", 5*time.Minute),
		CacheL1Metrics:     getBoolEnv("CACHE_L1_METRICS", false),

		HealthPort:  getEnv("HEALTH_PORT", "8091"),
		MetricsPort: getEnv("METRICS_PORT", "8092"),
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

	if c.CacheEnabled {
		if c.RedisAddr == "" {
			return fmt.Errorf("redis addr required when cache enabled")
		}

		if c.CacheTTL <= 0 {
			return fmt.Errorf("cache ttl must be > 0")
		}
	}

	if c.CacheTTLJitter < 0 || c.CacheTTLJitter > 1 {
		return fmt.Errorf("CACHE_TTL_JITTER must be 0..1")
	}

	if c.CacheEnabled && c.CacheNamespace == "" {
		return fmt.Errorf("CACHE_NAMESPACE required when cache enabled")
	}

	if c.CacheL1Enabled {
		if c.CacheL1MaxCost <= 0 {
			return fmt.Errorf("CACHE_L1_MAX_COST must be > 0")
		}
		if c.CacheL1NumCounters <= 0 {
			return fmt.Errorf("CACHE_L1_NUM_COUNTERS must be > 0")
		}
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

func getIntEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

func getInt64Env(key string, fallback int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return fallback
	}
	return i
}

func getFloat64Env(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}
