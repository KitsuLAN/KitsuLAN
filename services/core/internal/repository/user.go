package repository

import (
	"context"
	"strings"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

// userGORMRepo — GORM-реализация UserRepository.
// Экспортируется через конструктор NewUserRepository, тип намеренно приватный:
// снаружи работают только через интерфейс.
type userGORMRepo struct {
	db *gorm.DB
}

// NewUserRepository создаёт GORM-реализацию UserRepository.
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userGORMRepo{db: db}
}

// Create сохраняет нового пользователя.
// UUIDv7 генерируется в domain.User.BeforeCreate.
func (r *userGORMRepo) Create(ctx context.Context, user *domain.User) error {
	result := r.db.WithContext(ctx).Create(user)
	if result.Error != nil {
		if isUniqueViolation(result.Error) {
			return classifyUniqueViolation(result.Error)
		}
		return result.Error
	}
	return nil
}

// FindByID возвращает пользователя по строковому UUID.
func (r *userGORMRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&user).Error
	if err != nil {
		return nil, mapGORMError(err)
	}
	return &user, nil
}

// FindByUsername ищет пользователя по точному совпадению username.
// Username нечувствителен к регистру (LOWER).
func (r *userGORMRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).
		Where("LOWER(username) = LOWER(?)", username).
		First(&user).Error
	if err != nil {
		return nil, mapGORMError(err)
	}
	return &user, nil
}

// FindByEmail ищет пользователя по email (case-insensitive).
func (r *userGORMRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	err := r.db.WithContext(ctx).
		Where("LOWER(email) = LOWER(?)", email).
		First(&user).Error
	if err != nil {
		return nil, mapGORMError(err)
	}
	return &user, nil
}

// Update обновляет только переданные поля через map.
// Это безопаснее GORM Save (не затирает нулевые значения).
//
// Пример:
//
//	repo.Update(ctx, id, map[string]any{"username": "newname", "avatar_url": "..."})
func (r *userGORMRepo) Update(ctx context.Context, id string, fields map[string]any) error {
	// Запрещаем обновление служебных полей через этот метод
	delete(fields, "id")
	delete(fields, "password_hash")
	delete(fields, "created_at")

	result := r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("id = ?", id).
		Updates(fields)

	if result.Error != nil {
		if isUniqueViolation(result.Error) {
			return classifyUniqueViolation(result.Error)
		}
		return result.Error
	}

	// Проверяем что запись существовала
	if result.RowsAffected == 0 {
		return domainerr.ErrUserNotFound
	}

	return nil
}

// Delete выполняет soft-delete (заполняет DeletedAt, запись остаётся в БД).
// Это позволяет сохранить историю сообщений от удалённых пользователей.
func (r *userGORMRepo) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&domain.User{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domainerr.ErrUserNotFound
	}
	return nil
}

// Search ищет пользователей по подстроке username.
// Возвращает не более limit записей, отсортированных по username.
// limit <= 0 заменяется на дефолтный (20).
func (r *userGORMRepo) Search(ctx context.Context, query string, limit int) ([]domain.User, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var users []domain.User
	err := r.db.WithContext(ctx).
		Where("LOWER(username) LIKE LOWER(?)", "%"+escapeLike(query)+"%").
		Order("username ASC").
		Limit(limit).
		Find(&users).Error

	if err != nil {
		return nil, err
	}
	return users, nil
}

// ExistsByUsername проверяет занятость username без загрузки всей записи.
// Используется при регистрации для раннего возврата ошибки.
func (r *userGORMRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domain.User{}).
		Where("LOWER(username) = LOWER(?)", username).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// --- helpers ---

// mapGORMError конвертирует GORM-ошибки в доменные.
func mapGORMError(err error) error {
	if domainerr.Is(err, gorm.ErrRecordNotFound) {
		return domainerr.ErrUserNotFound
	}
	return err
}

// isUniqueViolation определяет ошибки нарушения уникальности
// для Postgres и SQLite.
func isUniqueViolation(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "duplicate key value") || // Postgres
		strings.Contains(msg, "UNIQUE constraint failed") || // SQLite
		strings.Contains(msg, "unique constraint")
}

// classifyUniqueViolation уточняет какое именно поле дублируется.
func classifyUniqueViolation(err error) error {
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "email") {
		return domainerr.ErrEmailConflict
	}
	// По умолчанию — username (наиболее частый случай)
	return domainerr.ErrUsernameConflict
}

// escapeLike экранирует спецсимволы SQL LIKE-запроса.
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}
