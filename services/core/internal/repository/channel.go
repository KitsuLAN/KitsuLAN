package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type channelGORMRepo struct{ db *gorm.DB }

func NewChannelRepository(db *gorm.DB) ChannelRepository {
	return &channelGORMRepo{db: db}
}

func (r *channelGORMRepo) Create(ctx context.Context, ch *domain.Channel) error {
	return r.db.WithContext(ctx).Create(ch).Error
}

func (r *channelGORMRepo) FindByID(ctx context.Context, id string) (*domain.Channel, error) {
	var ch domain.Channel
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&ch).Error
	if err != nil {
		return nil, mapNotFound(err, domainerr.ErrNotFound)
	}
	return &ch, nil
}

func (r *channelGORMRepo) ListByGuild(ctx context.Context, guildID string) ([]domain.Channel, error) {
	var channels []domain.Channel
	err := r.db.WithContext(ctx).
		Where("guild_id = ?", guildID).
		Order("position ASC, created_at ASC").
		Find(&channels).Error
	return channels, err
}

func (r *channelGORMRepo) Delete(ctx context.Context, id string) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Channel{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}
