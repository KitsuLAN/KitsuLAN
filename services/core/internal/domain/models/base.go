package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseEntity — фундаментальная модель.
// Включает в себя всё необходимое.
type BaseEntity struct {
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// --- Sharding & Tenancy ---
	// RealmID присутствует ВЕЗДЕ. Это позволяет делать "Co-located JOINS"
	// и в будущем шардировать базу по RealmID.
	RealmID uuid.UUID `gorm:"type:uuid;not null;index" json:"realm_id"`

	// --- Concurrency Control ---
	// Optimistic Locking: GORM автоматически инкрементит это поле при апдейтах.
	// Если версия в БД изменилась с момента чтения — транзакция упадет.
	Version uint `gorm:"not null;default:1" json:"version"`

	// --- Traceability ---
	// Мы знаем не только когда но и кто.
	CreatedAt time.Time  `gorm:"not null;default:current_timestamp;index:idx_created_at" json:"created_at"`
	CreatedBy *uuid.UUID `gorm:"type:uuid" json:"created_by,omitempty"`

	UpdatedAt time.Time  `gorm:"not null;default:current_timestamp" json:"updated_at"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid" json:"updated_by,omitempty"`
}

// SoftDeletable — примесь для сущностей, которые можно "удалять".
type SoftDeletable struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	DeletedBy *uuid.UUID     `gorm:"type:uuid" json:"deleted_by,omitempty"`
	// Reason позволяет админам указывать причину удаления (модерация, спам и т.д.)
	DeletionReason *string `gorm:"type:varchar(255)" json:"deletion_reason,omitempty"`
}

func (b *BaseEntity) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		if id, err := uuid.NewV7(); err == nil {
			b.ID = id
		} else {
			return err // Возвращаем ошибку генерации UUID, если что-то пошло не так
		}
	}
	return nil
}
