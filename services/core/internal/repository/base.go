package repository

import (
	"context"
	"strings"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

// BaseRepo предоставляет обобщённые CRUD-операции для GORM.
// T — это доменная модель (например, models.User).
type BaseRepo[T any] struct {
	db          *gorm.DB
	notFoundErr error // Специфичная ошибка для модели (например, ErrUserNotFound)
}

// NewBaseRepo создаёт базовый репозиторий.
func NewBaseRepo[T any](db *gorm.DB, notFoundErr error) BaseRepo[T] {
	if notFoundErr == nil {
		notFoundErr = errors.ErrNotFound
	}
	return BaseRepo[T]{db: db, notFoundErr: notFoundErr}
}

// DB возвращает инстанс с учетом активной транзакции в контексте.
func (r *BaseRepo[T]) DB(ctx context.Context) *gorm.DB {
	return database.ExtractDB(ctx, r.db).WithContext(ctx)
}

func (r *BaseRepo[T]) Create(ctx context.Context, entity *T) error {
	return r.MapError(r.DB(ctx).Create(entity).Error)
}

func (r *BaseRepo[T]) FindByID(ctx context.Context, id string) (*T, error) {
	var entity T
	err := r.DB(ctx).Where("id = ?", id).First(&entity).Error
	if err != nil {
		return nil, r.MapError(err)
	}
	return &entity, nil
}

func (r *BaseRepo[T]) Delete(ctx context.Context, id string) error {
	var entity T
	res := r.DB(ctx).Where("id = ?", id).Delete(&entity)
	if res.Error != nil {
		return r.MapError(res.Error)
	}
	if res.RowsAffected == 0 {
		return r.notFoundErr
	}
	return nil
}

// MapError переводит ошибки драйвера БД в доменные ошибки.
// TODO: Вынести в core/pkg/errors
func (r *BaseRepo[T]) MapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.notFoundErr
	}
	if IsUniqueViolation(err) {
		return errors.ErrConflict
	}
	return err
}

// IsUniqueViolation глобальный хелпер для проверки дубликатов
func IsUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key value") ||
		strings.Contains(msg, "unique constraint")
}
