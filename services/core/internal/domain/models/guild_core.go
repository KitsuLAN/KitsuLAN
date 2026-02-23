package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Guild представляет собой сообщество.
type Guild struct {
	BaseEntity
	SoftDeletable

	OwnerID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Name        string    `gorm:"not null;size:100"`
	Description string    `gorm:"size:1024"`
	IconURL     string    `json:"icon_url"`
	BannerURL   string    `json:"banner_url"`
	SplashURL   string    `json:"splash_url"`
	Color       string    `gorm:"size:9;default:'#525252'"`

	// --- Discovery & Access ---
	IsPublic          bool    `gorm:"not null;default:true"`
	IsDiscoverable    bool    `gorm:"not null;default:false"`
	InviteCode        *string `gorm:"uniqueIndex"`
	VanityURLCode     *string `gorm:"uniqueIndex"` // Красивая ссылка
	VerificationLevel int     `gorm:"not null;default:0"`

	// --- Stats (Denormalized for Read Performance) ---
	MemberCount   int32 `gorm:"not null;default:0"`
	PresenceCount int32 `gorm:"not null;default:0"` // Online users

	// --- System & Default Channels ---
	SystemChannelID *uuid.UUID `gorm:"type:uuid"`
	RulesChannelID  *uuid.UUID `gorm:"type:uuid"`
	AFKChannelID    *uuid.UUID `gorm:"type:uuid"`
	AFKTimeout      int        `gorm:"not null;default:300"`

	// Ассоциации
	Owner    User          `gorm:"foreignKey:OwnerID;constraint:OnDelete:RESTRICT"`
	Members  []GuildMember `gorm:"foreignKey:GuildID;constraint:OnDelete:CASCADE"`
	Channels []Channel     `gorm:"foreignKey:GuildID;constraint:OnDelete:CASCADE"`
	Roles    []Role        `gorm:"foreignKey:GuildID;constraint:OnDelete:CASCADE"`
}

func (g *Guild) IsOwner(userID uuid.UUID) bool {
	return g.OwnerID == userID
}

type GuildMember struct {
	RealmID uuid.UUID `gorm:"type:uuid;not null;index"`
	GuildID uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID  uuid.UUID `gorm:"type:uuid;primaryKey"`

	Nickname  string    `gorm:"size:32"`
	AvatarURL string    `json:"avatar_url"` // Per-guild avatar
	JoinedAt  time.Time `gorm:"not null;default:current_timestamp"`

	EffectivePermissions GuildPermission `gorm:"type:bigint;not null;default:0"` // Закешированные роли для упрощения расчётов

	IsMuted    bool `gorm:"not null;default:false"`
	IsDeafened bool `gorm:"not null;default:false"`

	// Ассоциации
	User  User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Guild Guild  `gorm:"foreignKey:GuildID;constraint:OnDelete:CASCADE"`
	Roles []Role `gorm:"many2many:member_roles;joinForeignKey:UserID;JoinReferences:RoleID;constraint:OnDelete:CASCADE"`
}

type AuditLog struct {
	ID        uuid.UUID       `gorm:"type:uuid;primaryKey"`
	GuildID   uuid.UUID       `gorm:"type:uuid;not null;index"`
	ActorID   uuid.UUID       `gorm:"type:uuid;not null;index"`
	Action    string          `gorm:"not null;size:64"`
	TargetID  *uuid.UUID      `gorm:"type:uuid;index"`
	Meta      json.RawMessage `gorm:"type:jsonb"`
	CreatedAt time.Time       `gorm:"not null;default:current_timestamp;index"`
}

func (l *AuditLog) BeforeCreate(tx *gorm.DB) (err error) {
	if l.ID == uuid.Nil {
		l.ID, err = uuid.NewV7()
	}
	return
}

type GuildInvite struct {
	RealmID   uuid.UUID `gorm:"type:uuid;not null;index"`
	Code      string    `gorm:"primaryKey;size:12"`
	GuildID   uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null"`
	ExpiresAt *time.Time
	MaxUses   int       `gorm:"default:0"` // 0 = unlimited
	Uses      int       `gorm:"default:0"`
	CreatedAt time.Time `gorm:"not null;default:current_timestamp"`
}
