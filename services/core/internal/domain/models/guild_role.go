package models

import (
	"github.com/google/uuid"
)

// Role — роль на уровне гильдии.
// Отступление от MD: Поле Permissions включено прямо сюда для оптимизации JOIN'ов GORM.
type Role struct {
	BaseEntity

	GuildID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_guild_role_name"`
	Name     string    `gorm:"not null;uniqueIndex:idx_guild_role_name"`
	Color    string    `gorm:"size:9"`
	Position int       `gorm:"not null;default:0"` // Выше = приоритетнее при конфликтах

	IsHoisted     bool `gorm:"not null;default:false"`
	IsMentionable bool `gorm:"not null;default:true"`
	IsDefault     bool `gorm:"not null;default:false"`
	IsManaged     bool `gorm:"not null;default:false"`

	Permissions GuildPermission `gorm:"type:bigint;not null;default:0"` // Битовая маска базовых прав
}

// MemberRole — промежуточная таблица Many-to-Many между GuildMember и Role.
// В GORM часто создается автоматически через `many2many`, но мы определяем её
// явно для контроля над внешними ключами и каскадным удалением.
type MemberRole struct {
	RealmID uuid.UUID `gorm:"type:uuid;not null;index"`
	GuildID uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false"`
	UserID  uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false"`
	RoleID  uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false"`
}
