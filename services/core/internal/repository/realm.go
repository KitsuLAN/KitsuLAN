package repository

import (
	"context"

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

type realmGORMRepo struct{ BaseRepo[models.RealmConfig] }

func NewRealmRepository(db *gorm.DB) RealmRepository {
	return &realmGORMRepo{BaseRepo: NewBaseRepo[models.RealmConfig](db, errors.ErrNotFound)}
}

func (r *realmGORMRepo) GetCurrent(ctx context.Context) (*models.RealmConfig, error) {
	var realm models.RealmConfig
	// Берем первую попавшуюся запись. Для Single Tenant это корректно.
	err := r.DB(ctx).First(&realm).Error
	if err != nil {
		return nil, r.MapError(err)
	}
	return &realm, nil
}
