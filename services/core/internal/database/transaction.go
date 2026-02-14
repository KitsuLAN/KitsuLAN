package database

import (
	"context"

	"gorm.io/gorm"
)

type txKey struct{}

// WithTransaction добавляет транзакцию в контекст
func WithTransaction(ctx context.Context, tx *gorm.DB) context.Context {
	return context.WithValue(ctx, txKey{}, tx)
}

// ExtractDB проверяет, есть ли в контексте активная транзакция.
// Если есть — возвращает её. Если нет — возвращает fallback (основное соединение).
func ExtractDB(ctx context.Context, fallback *gorm.DB) *gorm.DB {
	if tx, ok := ctx.Value(txKey{}).(*gorm.DB); ok {
		return tx
	}
	return fallback
}

// TransactionManager — интерфейс для управления транзакциями в сервисах
type TransactionManager interface {
	Do(ctx context.Context, fn func(ctx context.Context) error) error
}

// GormTransactionManager — реализация
type GormTransactionManager struct {
	db *gorm.DB
}

func NewTransactionManager(db *gorm.DB) TransactionManager {
	return &GormTransactionManager{db: db}
}

func (tm *GormTransactionManager) Do(ctx context.Context, fn func(ctx context.Context) error) error {
	return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Инжектим транзакцию в контекст и передаем его дальше
		txCtx := WithTransaction(ctx, tx)
		return fn(txCtx)
	})
}
