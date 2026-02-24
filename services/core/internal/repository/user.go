package repository

import (
	"context"
	"strings"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

// userGORMRepo — GORM-реализация UserRepository.
// Экспортируется через конструктор NewUserRepository, тип намеренно приватный:
// снаружи работают только через интерфейс.
type userGORMRepo struct {
	BaseRepo[models.User]
}

// NewUserRepository создаёт GORM-реализацию UserRepository.
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userGORMRepo{BaseRepo: NewBaseRepo[models.User](db, domainerr.ErrUserNotFound)}
}

// Create сохраняет нового пользователя.
// UUIDv7 генерируется в domain.User.BeforeCreate.
func (r *userGORMRepo) Create(ctx context.Context, user *models.User) error {
	err := r.DB(ctx).Create(user).Error
	if IsUniqueViolation(err) {
		return classifyUniqueViolation(err)
	}
	return r.MapError(err)
}

// FindByUsername ищет пользователя по точному совпадению username.
// Username нечувствителен к регистру (LOWER).
func (r *userGORMRepo) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	err := r.DB(ctx).Where("LOWER(username) = LOWER(?)", username).First(&user).Error
	if err != nil {
		return nil, r.MapError(err)
	}
	return &user, nil
}

// FindByEmail ищет пользователя по email (case-insensitive).
func (r *userGORMRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.DB(ctx).Where("LOWER(email) = LOWER(?)", email).First(&user).Error
	if err != nil {
		return nil, r.MapError(err)
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

	result := r.DB(ctx).Model(&models.User{}).Where("id = ?", id).Updates(fields)

	if result.Error != nil {
		if IsUniqueViolation(result.Error) {
			return classifyUniqueViolation(result.Error)
		}
		return r.MapError(result.Error)
	}

	// Проверяем что запись существовала
	if result.RowsAffected == 0 {
		return domainerr.ErrUserNotFound
	}

	return nil
}

// Search ищет пользователей по подстроке username.
// Возвращает не более limit записей, отсортированных по username.
// limit <= 0 заменяется на дефолтный (20).
func (r *userGORMRepo) Search(ctx context.Context, query string, limit int) ([]models.User, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var users []models.User
	err := r.DB(ctx).
		Where("LOWER(username) LIKE LOWER(?)", "%"+escapeLike(query)+"%").
		Order("username ASC").
		Limit(limit).
		Find(&users).Error

	return users, r.MapError(err)
}

// ExistsByUsername проверяет занятость username без загрузки всей записи.
// Используется при регистрации для раннего возврата ошибки.
func (r *userGORMRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.DB(ctx).Model(&models.User{}).
		Where("LOWER(username) = LOWER(?)", username).
		Count(&count).Error
	return count > 0, r.MapError(err)
}

// --- helpers ---

// classifyUniqueViolation уточняет какое именно поле дублируется.
func classifyUniqueViolation(err error) error {
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "email") {
		return domainerr.ErrEmailTaken
	}
	// По умолчанию — username (наиболее частый случай)
	return domainerr.ErrUsernameTaken
}

// escapeLike экранирует спецсимволы SQL LIKE-запроса.
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}
