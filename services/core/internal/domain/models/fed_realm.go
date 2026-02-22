package models

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FederationMode определяет, с кем этот Realm готов разговаривать.
type FederationMode string

const (
	FederationModeOpen      FederationMode = "open"      // Принимаем всех, у кого валидная подпись
	FederationModeWhitelist FederationMode = "whitelist" // Только те, кто в списке Peers
	FederationModeLanOnly   FederationMode = "lan_only"  // Только локальная сеть (mDNS)
	FederationModeDisabled  FederationMode = "disabled"  // Полная изоляция (Intranet)
)

// RealmConfig хранит метаданные и криптографические ключи этого узла.
type RealmConfig struct {
	BaseEntity

	Domain      string `gorm:"not null"`
	DisplayName string `gorm:"not null"`

	PubKeyEd25519    []byte `gorm:"type:bytea;not null"`
	PrivKeyEncrypted []byte `gorm:"type:bytea;not null"` // Зашифровано KMS / AES
	KeyVersion       int    `gorm:"not null;default:1"`  // Ротация ключей

	FederationMode FederationMode `gorm:"type:text;not null;default:'open';check:federation_mode IN ('open','whitelist','lan_only','disabled')"`

	// Разрешена ли регистрация новых пользователей локально?
	RegistrationEnabled bool `gorm:"not null;default:true" json:"registration_enabled"`

	// --- Limits & Quotas ---
	// Храним лимиты здесь, чтобы менять их на лету без редеплоя.
	// { "max_attachment_size": 104857600, "max_guilds_per_user": 100 }
	Limits json.RawMessage `gorm:"type:jsonb;default:'{}'" json:"limits"`
}

// BeforeCreate гарантирует, что RealmID ссылается сам на себя.
func (r *RealmConfig) BeforeCreate(tx *gorm.DB) (err error) {
	// Если ID не задан, генерируем
	if r.ID == uuid.Nil {
		r.ID, err = uuid.NewV7()
		if err != nil {
			return err
		}
	}

	// RealmConfig — это корень. Его RealmID всегда равен его ID.
	r.RealmID = r.ID

	return nil
}
