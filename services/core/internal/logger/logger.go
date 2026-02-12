// Package logger предоставляет инициализацию структурированного логгера
// на базе стандартного пакета log/slog (Go 1.21+).
//
// В development-режиме — человекочитаемый цветной вывод (text).
// В production-режиме — JSON-вывод для систем сбора логов (Loki, ELK, etc).
package logger

import (
	"context"
	"log/slog"
	"os"
)

// Key-типы для контекста — предотвращают коллизии.
type contextKey string

const loggerKey contextKey = "logger"

// New создаёт и настраивает глобальный slog.Logger.
// Уровень логирования:
//   - development: Debug
//   - production:  Info
func New(env string) *slog.Logger {
	var handler slog.Handler

	opts := &slog.HandlerOptions{
		AddSource: env == "production",
	}

	if env == "production" {
		opts.Level = slog.LevelInfo
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		opts.Level = slog.LevelDebug
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	logger := slog.New(handler)

	// Устанавливаем как глобальный логгер — удобно для библиотек
	// которые вызывают slog.Info/Error напрямую.
	slog.SetDefault(logger)

	return logger
}

// WithContext добавляет логгер в context.
func WithContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, logger)
}

// FromContext извлекает логгер из context.
// Если логгер не был добавлен — возвращает slog.Default().
func FromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(loggerKey).(*slog.Logger); ok && logger != nil {
		return logger
	}
	return slog.Default()
}

// WithAttrs добавляет статичные атрибуты к логгеру.
// Используется для создания «дочерних» логгеров с контекстом (например, request_id, user_id).
//
// Пример:
//
//	reqLogger := logger.WithAttrs(log, slog.String("request_id", reqID))
func WithAttrs(logger *slog.Logger, attrs ...slog.Attr) *slog.Logger {
	return logger.With(attrsToArgs(attrs)...)
}

func attrsToArgs(attrs []slog.Attr) []any {
	args := make([]any, len(attrs))
	for i, a := range attrs {
		args[i] = a
	}
	return args
}
