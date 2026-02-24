package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type messageGORMRepo struct{ BaseRepo[models.Message] }

func NewMessageRepository(db *gorm.DB) MessageRepository {
	return &messageGORMRepo{BaseRepo: NewBaseRepo[models.Message](db, domainerr.ErrMessageNotFound)}
}

func (r *messageGORMRepo) Create(ctx context.Context, msg *models.Message) error {
	return r.DB(ctx).Transaction(func(tx *gorm.DB) error {
		// Атомарный инкремент и получение номера
		var nextSeq int64
		err := tx.Model(&models.Channel{}).
			Where("id = ?", msg.ChannelID).
			UpdateColumn("next_seq", gorm.Expr("next_seq + 1")).
			Select("next_seq").
			Scan(&nextSeq).Error

		if err != nil {
			return err
		}

		msg.Seq = nextSeq - 1 // Устанавливаем полученный номер
		return tx.Create(msg).Error
	})
}

func (r *messageGORMRepo) GetHistory(ctx context.Context, channelID string, limit int, beforeID string) ([]models.Message, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	q := r.DB(ctx).
		Preload("Author").
		Where("channel_id = ?", channelID).
		Order("created_at DESC").
		Limit(limit + 1) // +1 чтобы определить has_more

	if beforeID != "" {
		// Курсор: сообщения старше beforeID
		// UUIDv7 лексикографически сортируется по времени — сравнение по строке работает
		q = q.Where("id < ?", beforeID)
	}

	var msgs []models.Message
	if err := q.Find(&msgs).Error; err != nil {
		return nil, err
	}

	// Разворачиваем (DESC → ASC для отображения, старые сверху)
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, nil
}
