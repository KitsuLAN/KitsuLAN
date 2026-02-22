package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type AccountStatus string

const (
	AccountStatusActive      AccountStatus = "active"
	AccountStatusSuspended   AccountStatus = "suspended"
	AccountStatusDeactivated AccountStatus = "deactivated"
)

// User - основная модель пользователя
type User struct {
	BaseEntity    // Включает ID, RealmID, Version, Audit
	SoftDeletable // Включает DeletedAt, DeletedBy

	// --- Federation ---
	IsFederated  bool       `gorm:"not null;default:false;check:fed_consistency, (is_federated = false AND home_realm_id IS NULL AND home_user_id IS NULL) OR (is_federated = true AND home_realm_id IS NOT NULL AND home_user_id IS NOT NULL)" json:"is_federated"`
	HomeRealmID  *uuid.UUID `gorm:"type:uuid;index:idx_users_home" json:"home_realm_id,omitempty"`
	HomeUserID   *uuid.UUID `gorm:"type:uuid;index:idx_users_home" json:"home_user_id,omitempty"`
	FedToken     *string    `gorm:"type:text" json:"-"`
	FedTokenExp  *time.Time `json:"fed_token_exp,omitempty"`
	FedRevokedAt *time.Time `json:"fed_revoked_at,omitempty"`

	// --- Profile ---
	Username      string  `gorm:"uniqueIndex:idx_username_realm,where:deleted_at IS NULL;not null;size:32" json:"username"`
	Discriminator int16   `gorm:"not null;default:0" json:"discriminator"`
	DisplayName   *string `gorm:"size:64" json:"display_name,omitempty"`
	AvatarURL     string  `json:"avatar_url"`
	BannerURL     string  `json:"banner_url"`
	Bio           string  `gorm:"size:256" json:"bio"`

	// --- Security & Auth ---
	Email        *string `gorm:"uniqueIndex:idx_email,where:deleted_at IS NULL;size:255" json:"email,omitempty"`
	PasswordHash *string `json:"-"`
	MFAEnabled   bool    `gorm:"not null;default:false" json:"mfa_enabled"`

	// Храним настройки клиента (JSON), чтобы не делать ALTER TABLE для "compact mode"
	ClientSettings json.RawMessage `gorm:"type:jsonb;default:'{}'" json:"client_settings"`

	// Флаги участника платформы (битмаска, отдельная от GuildPerms)
	PlatformFlags int64 `gorm:"not null;default:0" json:"platform_flags"`

	AccountStatus AccountStatus `gorm:"type:text;not null;default:'active'" json:"account_status"`
}
