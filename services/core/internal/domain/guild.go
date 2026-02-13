package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Guild struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name        string    `gorm:"not null;size:100"`
	Description string    `gorm:"size:500"`
	IconURL     string
	OwnerID     uuid.UUID     `gorm:"type:uuid;not null;index"`
	Owner       User          `gorm:"foreignKey:OwnerID"`
	Members     []GuildMember `gorm:"foreignKey:GuildID"`
	Channels    []Channel     `gorm:"foreignKey:GuildID"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

func (g *Guild) BeforeCreate(tx *gorm.DB) (err error) {
	if g.ID == uuid.Nil {
		g.ID, err = uuid.NewV7()
	}
	return
}

type Channel struct {
	ID        uuid.UUID   `gorm:"type:uuid;primaryKey"`
	GuildID   uuid.UUID   `gorm:"type:uuid;not null;index"`
	Name      string      `gorm:"not null;size:100"`
	Type      ChannelType `gorm:"not null;default:'text'"`
	Position  int         `gorm:"default:0"`
	CreatedAt time.Time
}

type ChannelType string

const (
	ChannelTypeText  ChannelType = "text"
	ChannelTypeVoice ChannelType = "voice"
)

func (c *Channel) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID, err = uuid.NewV7()
	}
	return
}

type GuildMember struct {
	GuildID  uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID   uuid.UUID `gorm:"type:uuid;primaryKey"`
	Nickname string    `gorm:"size:32"`
	JoinedAt time.Time
	// Associations (не хранятся в БД напрямую)
	User  User  `gorm:"foreignKey:UserID"`
	Guild Guild `gorm:"foreignKey:GuildID"`
}

type GuildInvite struct {
	Code      string    `gorm:"primaryKey;size:12"`
	GuildID   uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null"`
	ExpiresAt *time.Time
	MaxUses   int `gorm:"default:0"` // 0 = unlimited
	Uses      int `gorm:"default:0"`
	CreatedAt time.Time
}
