package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type RealmRepository interface {
	// GetCurrent возвращает конфиг текущего реалма.
	// Если мы в режиме Single Tenant, это первая и единственная запись.
	GetCurrent(ctx context.Context) (*models.RealmConfig, error)

	// Create инициализирует новый реалм (обычно при первом запуске).
	Create(ctx context.Context, realm *models.RealmConfig) error
}

type realmGORMRepo struct{ db *gorm.DB }

func NewRealmRepository(db *gorm.DB) RealmRepository {
	return &realmGORMRepo{db: db}
}

func (r *realmGORMRepo) GetCurrent(ctx context.Context) (*models.RealmConfig, error) {
	var realm models.RealmConfig
	// Берем первую попавшуюся запись. Для Single Tenant это корректно.
	err := database.ExtractDB(ctx, r.db).First(&realm).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.ErrNotFound
		}
		return nil, err
	}
	return &realm, nil
}

func (r *realmGORMRepo) Create(ctx context.Context, realm *models.RealmConfig) error {
	return database.ExtractDB(ctx, r.db).Create(realm).Error
}
