package models

import (
	"github.com/google/uuid"
)

type ChannelType string

const (
	ChannelTypeText         ChannelType = "text"
	ChannelTypeVoice        ChannelType = "voice"
	ChannelTypeAnnouncement ChannelType = "announcement"
	ChannelTypeThreadParent ChannelType = "thread_parent"
)

type Channel struct {
	BaseEntity    // ID, RealmID
	SoftDeletable // DeletedAt

	GuildID     uuid.UUID   `gorm:"type:uuid;not null;index"`
	Name        string      `gorm:"not null;size:100"`
	Type        ChannelType `gorm:"type:text;not null;check:type IN ('text','voice','announcement','thread_parent')"`
	Position    int         `gorm:"not null;default:0"`
	Topic       string      `gorm:"type:text"`
	SlowmodeSec int         `gorm:"not null;default:0"`
	IsNSFW      bool        `gorm:"not null;default:false"`

	CategoryID       *uuid.UUID `gorm:"type:uuid"`             // NULL если канал в корне гильдии
	PermissionSynced bool       `gorm:"not null;default:true"` // Синхронизировано ли с категорией
	NextSeq          int64      `gorm:"not null;default:1"`    // Монотонный счетчик для доставки сообщений
}

type PermissionTargetType string

const (
	TargetTypeRole PermissionTargetType = "role"
	TargetTypeUser PermissionTargetType = "user"
)

// ChannelPermissionOverwrite — переопределение прав для конкретного канала.
// Позволяет сказать: "Роли X запрещено писать в этот канал, а Юзеру Y - разрешено".
type ChannelPermissionOverwrite struct {
	RealmID    uuid.UUID            `gorm:"type:uuid;not null;index"`
	ChannelID  uuid.UUID            `gorm:"type:uuid;primaryKey;autoIncrement:false"`
	TargetType PermissionTargetType `gorm:"type:text;primaryKey;check:target_type IN ('role','user')"`
	TargetID   uuid.UUID            `gorm:"type:uuid;primaryKey;autoIncrement:false"` // UUID роли или пользователя
	Allow      GuildPermission      `gorm:"type:bigint;not null;default:0"`
	Deny       GuildPermission      `gorm:"type:bigint;not null;default:0"`
}
