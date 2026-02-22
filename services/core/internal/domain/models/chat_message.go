package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// --- Message Flags ---

type MessageFlag int64

// Флаги сообщений (заменяют пачку bool-полей)
const (
	MessageFlagEdited MessageFlag = 1 << iota
	MessageFlagSystem
	MessageFlagEphemeral
	MessageFlagHasThread
)

func (f MessageFlag) Has(flag MessageFlag) bool { return f&flag != 0 }
func (f *MessageFlag) Add(flag MessageFlag)     { *f |= flag }

type MessageContentType string

const (
	MessageContentTypeText     MessageContentType = "text"
	MessageContentTypeMarkdown MessageContentType = "markdown"
	MessageContentTypeSystem   MessageContentType = "system"
)

type Message struct {
	BaseEntity    // ID, RealmID, Version, Audit
	SoftDeletable // DeletedAt (DeletedBy и DeletionReason важны для модерации)

	ChannelID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_channel_seq,priority:1;index:idx_messages_history,priority:1"`
	AuthorID  uuid.UUID `gorm:"type:uuid;not null;index"`

	Content     string             `gorm:"type:text"`
	ContentType MessageContentType `gorm:"type:text;not null;default:'text'"`

	// --- Rich Content (JSONB) ---
	Embeds     json.RawMessage `gorm:"type:jsonb" json:"embeds,omitempty"`
	Components json.RawMessage `gorm:"type:jsonb" json:"components,omitempty"`

	// Полнотекстовый поиск (PostgreSQL specific)
	// gorm:"type:tsvector;index:idx_message_search,type:gin"
	SearchVector string `gorm:"-" json:"-"`

	// --- Threading & Replies ---
	ReplyToID *uuid.UUID `gorm:"type:uuid"`
	ThreadID  *uuid.UUID `gorm:"type:uuid;index"`

	// --- State ---
	Flags       MessageFlag `gorm:"type:bigint;not null;default:0"`
	EditVersion int         `gorm:"not null;default:0"` // Для инвалидации кэша/sync
	IsPinned    bool        `gorm:"not null;default:false"`

	// --- Ordering ---
	Seq      int64 `gorm:"not null;uniqueIndex:idx_channel_seq,priority:2"` // Sequence внутри канала
	EditedAt *time.Time

	// Ассоциации
	Author      User                `gorm:"foreignKey:AuthorID"`
	Channel     Channel             `gorm:"foreignKey:ChannelID"`
	Attachments []MessageAttachment `gorm:"foreignKey:MessageID;constraint:OnDelete:CASCADE"`
	Reactions   []MessageReaction   `gorm:"foreignKey:MessageID;constraint:OnDelete:CASCADE"`
}

type MessageAttachment struct {
	BaseEntity

	MessageID     uuid.UUID `gorm:"type:uuid;not null;index"`
	MediaObjectID uuid.UUID `gorm:"type:uuid;not null"`

	Filename    string `gorm:"not null"`
	ContentType string `gorm:"not null"`
	SizeBytes   int64  `gorm:"not null"`
	Width       *int
	Height      *int

	IsSpoiler bool `gorm:"not null;default:false"`
}

type MessageReaction struct {
	RealmID   uuid.UUID `gorm:"type:uuid;not null;index"`
	MessageID uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false;index:idx_reactions_lookup,priority:1"`
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey;autoIncrement:false"`
	Emoji     string    `gorm:"primaryKey;size:64;index:idx_reactions_lookup,priority:2"` // Unicode эмодзи или ID кастомного
	CreatedAt time.Time `gorm:"not null;default:current_timestamp"`
}
