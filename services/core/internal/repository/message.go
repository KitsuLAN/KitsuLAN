package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"gorm.io/gorm"
)

type messageGORMRepo struct{ db *gorm.DB }

func NewMessageRepository(db *gorm.DB) MessageRepository {
	return &messageGORMRepo{db: db}
}

func (r *messageGORMRepo) Create(ctx context.Context, msg *domain.Message) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *messageGORMRepo) GetHistory(ctx context.Context, channelID string, limit int, beforeID string) ([]domain.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	q := r.db.WithContext(ctx).
		Preload("Author").
		Where("channel_id = ?", channelID).
		Order("created_at DESC").
		Limit(limit + 1) // +1 чтобы определить has_more

	if beforeID != "" {
		// Курсор: сообщения старше beforeID
		// UUIDv7 лексикографически сортируется по времени — сравнение по строке работает
		q = q.Where("id < ?", beforeID)
	}

	var msgs []domain.Message
	if err := q.Find(&msgs).Error; err != nil {
		return nil, err
	}

	// Разворачиваем (DESC → ASC для отображения)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}

func (r *messageGORMRepo) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Message{}).Error
}
