package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User - основная модель пользователя
type User struct {
	// ID - UUIDv7 (сортируется по времени).
	// gorm:"type:uuid" нужен для Postgres, для SQLite GORM сам разберется (строка/blob)
	ID uuid.UUID `gorm:"type:uuid;primary_key;" json:"id"`

	Username string  `gorm:"uniqueIndex;not null;size:32" json:"username"`
	Email    *string `gorm:"uniqueIndex;size:255" json:"email,omitempty"`

	// Хеш пароля (Argon2 или bcrypt)
	PasswordHash string `gorm:"not null" json:"-"`

	AvatarURL string `json:"avatar_url"`

	// Поле "О себе"
	Bio string `gorm:"size:255" json:"bio"`

	// HomeServerID указывает на "домашний" сервер пользователя.
	// Для локальных пользователей это значение "local".
	// Для федеративных - ID/Domain удаленного сервера.
	HomeServerID string `gorm:"default:'local';index" json:"home_server_id"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate генерирует UUIDv7 перед записью в БД
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		// Используем V7 для сортировки по времени
		u.ID, err = uuid.NewV7()
	}
	return
}
