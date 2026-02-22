// Package database отвечает за инициализацию подключения к БД
// и автомиграцию схемы.
//
// Поддерживает два драйвера:
//   - "postgres" — для production-развертывания
//   - "sqlite"   — для lite-развертывания (Raspberry Pi, локальная разработка)
package database

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
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
		// 1. Identity & Federation
		&models.RealmConfig{},
		&models.User{},
		&models.UserDevice{},

		// 2. Guilds, Channels, Roles
		&models.Guild{},
		&models.Role{},
		&models.GuildMember{},
		&models.Channel{},
		&models.ChannelPermissionOverwrite{},
		&models.GuildInvite{},
		&models.AuditLog{},

		// 3. Messages & Media
		&models.Message{},
		&models.MessageAttachment{},
		&models.MessageReaction{},
	)
}
