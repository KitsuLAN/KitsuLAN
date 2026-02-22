package models

import (
	"time"

	"github.com/google/uuid"
)

// UserDevice хранит информацию об устройствах/сессиях пользователя.
// В будущем используется для E2EE (Device PubKey).
type UserDevice struct {
	BaseEntity

	UserID        uuid.UUID `gorm:"type:uuid;not null;index"`
	DeviceName    string    `gorm:"type:text"`
	PubKeyEd25519 []byte    `gorm:"type:bytea"` // Для E2EE
	LastSeen      time.Time

	// Security: возможность отозвать сессию/устройство
	IsRevoked bool       `gorm:"not null;default:false"`
	RevokedAt *time.Time `gorm:"index"`

	// Ассоциации
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}
