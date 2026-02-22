package models

import (
	"time"

	"github.com/google/uuid"
)

type StorageBackend string

const (
	StorageBackendS3      StorageBackend = "s3"
	StorageBackendTorrent StorageBackend = "torrent"
	StorageBackendHybrid  StorageBackend = "hybrid"
)

// MediaObject — универсальное хранилище файлов (для вложений, аватарок, эмодзи)
type MediaObject struct {
	BaseEntity

	UploaderID      uuid.UUID      `gorm:"type:uuid;not null;index"`
	StorageBackend  StorageBackend `gorm:"type:text;not null;default:'s3'"`
	S3Key           *string        `gorm:"type:text"`
	TorrentInfohash *string        `gorm:"type:text;index"`
	TorrentMagnet   *string        `gorm:"type:text"`
	Filename        string         `gorm:"not null"`
	ContentType     string         `gorm:"not null"`
	SizeBytes       int64          `gorm:"not null"`
	ChecksumSha256  string         `gorm:"not null"` // Для дедупликации
	IsPublic        bool           `gorm:"not null;default:false"`
	ExpiresAt       *time.Time     // Опциональное автоудаление
}
