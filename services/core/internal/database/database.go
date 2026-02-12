// Package database отвечает за инициализацию подключения к БД
// и автомиграцию схемы.
//
// Поддерживает два драйвера:
//   - "postgres" — для production-развертывания
//   - "sqlite"   — для lite-развертывания (Raspberry Pi, локальная разработка)
package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// Connect создаёт подключение к БД на основе конфигурации
// и запускает автомиграцию доменных моделей.
func Connect(cfg *config.Config, log *slog.Logger) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: newGormLogger(log, cfg.Env),
	}

	var db *gorm.DB
	var err error

	switch cfg.DBDriver {
	case "postgres":
		log.Info("connecting to PostgreSQL", "host", cfg.DBHost, "db", cfg.DBName)
		db, err = connectPostgres(cfg, gormCfg)
	case "sqlite":
		log.Info("connecting to SQLite", "path", cfg.DBSQLitePath)
		db, err = connectSQLite(cfg, gormCfg)
	default:
		return nil, fmt.Errorf("unsupported DB driver: %q", cfg.DBDriver)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Настройка пула соединений
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Автомиграция: создаёт/обновляет таблицы по доменным моделям.
	// В production рекомендуется заменить на миграции через golang-migrate.
	log.Info("running auto-migration")
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("auto-migration failed: %w", err)
	}

	log.Info("database ready")
	return db, nil
}

func connectPostgres(cfg *config.Config, gormCfg *gorm.Config) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(cfg.PostgresDSN()), gormCfg)
}

func connectSQLite(cfg *config.Config, gormCfg *gorm.Config) (*gorm.DB, error) {
	return gorm.Open(sqlite.Open(cfg.DBSQLitePath), gormCfg)
}

// migrate запускает автомиграцию для всех доменных моделей.
// Добавляй сюда новые модели по мере их появления.
func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		// TODO Phase 2: &domain.Guild{}, &domain.Channel{}, &domain.Message{}
	)
}

// --- GORM logger adapter ---

// gormSlogLogger адаптирует slog к интерфейсу gormlogger.Interface.
type gormSlogLogger struct {
	log      *slog.Logger
	logLevel gormlogger.LogLevel
}

func newGormLogger(log *slog.Logger, env string) gormlogger.Interface {
	level := gormlogger.Warn
	if env != "production" {
		level = gormlogger.Info
	}
	return &gormSlogLogger{
		log:      log.With("component", "gorm"),
		logLevel: level,
	}
}

func (l *gormSlogLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	return &gormSlogLogger{
		log:      l.log,
		logLevel: level,
	}
}

func (l *gormSlogLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Info {
		l.log.InfoContext(ctx, fmt.Sprintf(msg, data...))
	}
}

func (l *gormSlogLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Warn {
		l.log.WarnContext(ctx, fmt.Sprintf(msg, data...))
	}
}

func (l *gormSlogLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if l.logLevel >= gormlogger.Error {
		l.log.ErrorContext(ctx, fmt.Sprintf(msg, data...))
	}
}

func (l *gormSlogLogger) Trace(
	ctx context.Context,
	begin time.Time,
	fc func() (sql string, rowsAffected int64),
	err error,
) {
	if l.logLevel == gormlogger.Silent {
		return
	}

	elapsed := time.Since(begin)
	sql, rows := fc()

	attrs := []any{
		"elapsed", elapsed,
		"rows", rows,
		"sql", sql,
	}

	if err != nil {
		l.log.ErrorContext(ctx, "query error", append(attrs, "error", err)...)
		return
	}

	if l.logLevel >= gormlogger.Info {
		l.log.DebugContext(ctx, "query", attrs...)
	}
}
