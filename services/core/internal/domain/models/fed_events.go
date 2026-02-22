package models

import (
	"time"

	"github.com/google/uuid"
)

// FederationOutbox — хранит события, которые нужно отправить другим узлам.
type FederationOutbox struct {
	BaseEntity
	TargetRealmID uuid.UUID `gorm:"type:uuid;not null;index"`
	EventType     string    `gorm:"type:text;not null"`
	Payload       []byte    `gorm:"type:jsonb;not null"`
	Signature     []byte    `gorm:"type:bytea;not null"` // Ed25519 подпись payload'а
	Attempts      int       `gorm:"not null;default:0"`

	// Индекс для воркера: быстро находим то, что пора отправить
	NextRetryAt time.Time `gorm:"not null;index:idx_outbox_pending,where:delivered_at IS NULL"`
	DeliveredAt *time.Time
}

// FederationInbox — предотвращает дублирование (Replay Attacks) при входящих событиях.
type FederationInbox struct {
	RealmID       uuid.UUID `gorm:"type:uuid;not null;index"`
	EventID       uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false"` // UUID приходит извне, не генерируем!
	SourceRealmID uuid.UUID `gorm:"type:uuid;not null"`
	ProcessedAt   time.Time `gorm:"not null;default:current_timestamp"`
}
