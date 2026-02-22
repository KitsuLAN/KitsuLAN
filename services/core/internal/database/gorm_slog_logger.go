package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	gormlogger "gorm.io/gorm/logger"
)

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

	//if l.logLevel >= gormlogger.Info {
	//	l.log.DebugContext(ctx, "query", attrs...)
	//}
}
