package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type channelGORMRepo struct{ BaseRepo[models.Channel] }

func NewChannelRepository(db *gorm.DB) ChannelRepository {
	return &channelGORMRepo{BaseRepo: NewBaseRepo[models.Channel](db, errors.ErrChannelNotFound)}
}

func (r *channelGORMRepo) ListByGuild(ctx context.Context, guildID string) ([]models.Channel, error) {
	var channels []models.Channel
	err := r.DB(ctx).
		Where("guild_id = ?", guildID).
		Order("position ASC, created_at ASC").
		Find(&channels).Error
	return channels, r.MapError(err)
}
