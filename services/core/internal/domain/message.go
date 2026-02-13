package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	ChannelID uuid.UUID `gorm:"type:uuid;not null;index:idx_channel_created"`
	AuthorID  uuid.UUID `gorm:"type:uuid;not null"`
	Content   string    `gorm:"not null;type:text"`
	EditedAt  *time.Time
	CreatedAt time.Time `gorm:"index:idx_channel_created"`
	// Associations
	Author  User    `gorm:"foreignKey:AuthorID"`
	Channel Channel `gorm:"foreignKey:ChannelID"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID, err = uuid.NewV7()
	}
	return
}
