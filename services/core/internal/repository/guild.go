package repository

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type guildGORMRepo struct{ BaseRepo[models.Guild] }

func NewGuildRepository(db *gorm.DB) GuildRepository {
	return &guildGORMRepo{BaseRepo: NewBaseRepo[models.Guild](db, errors.ErrGuildNotFound)}
}

func (r *guildGORMRepo) ListByMember(ctx context.Context, userID string) ([]models.Guild, error) {
	var guilds []models.Guild
	err := r.DB(ctx).
		Joins("JOIN guild_members ON guild_members.guild_id = guilds.id").
		Where("guild_members.user_id = ?", userID).
		Where("guilds.deleted_at IS NULL").
		Find(&guilds).Error
	return guilds, r.MapError(err)
}

func (r *guildGORMRepo) MemberCount(ctx context.Context, guildID string) (int64, error) {
	var count int64
	err := r.DB(ctx).Model(&models.GuildMember{}).
		Where("guild_id = ?", guildID).Count(&count).Error
	return count, r.MapError(err)
}

func (r *guildGORMRepo) AddMember(ctx context.Context, m *models.GuildMember) error {
	if m.JoinedAt.IsZero() {
		m.JoinedAt = time.Now()
	}
	return r.MapError(
		r.DB(ctx).
			Where(models.GuildMember{GuildID: m.GuildID, UserID: m.UserID}).
			FirstOrCreate(m).Error)
}

func (r *guildGORMRepo) RemoveMember(ctx context.Context, guildID, userID string) error {
	return r.MapError(
		r.DB(ctx).
			Where("guild_id = ? AND user_id = ?", guildID, userID).
			Delete(&models.GuildMember{}).Error)
}

func (r *guildGORMRepo) IsMember(ctx context.Context, guildID, userID string) (bool, error) {
	var count int64
	err := r.DB(ctx).Model(&models.GuildMember{}).
		Where("guild_id = ? AND user_id = ?", guildID, userID).
		Count(&count).Error
	return count > 0, r.MapError(err)
}

func (r *guildGORMRepo) ListMembers(ctx context.Context, guildID string) ([]models.GuildMember, error) {
	var members []models.GuildMember
	err := r.DB(ctx).
		Preload("User").
		Where("guild_id = ?", guildID).
		Find(&members).Error
	return members, r.MapError(err)
}

func (r *guildGORMRepo) CreateInvite(ctx context.Context, inv *models.GuildInvite) error {
	if inv.Code == "" {
		code, err := generateInviteCode()
		if err != nil {
			return err
		}
		inv.Code = code
	}
	return r.MapError(
		r.DB(ctx).
			Create(inv).Error)
}

func (r *guildGORMRepo) FindInvite(ctx context.Context, code string) (*models.GuildInvite, error) {
	var inv models.GuildInvite
	err := r.DB(ctx).
		Where("code = ?", code).
		First(&inv).Error
	if err != nil {
		return nil, r.MapError(err)
	}
	return &inv, nil
}

func (r *guildGORMRepo) IncrementInviteUses(ctx context.Context, code string) error {
	return r.MapError(
		r.DB(ctx).Model(&models.GuildInvite{}).
			Where("code = ?", code).
			UpdateColumn("uses", gorm.Expr("uses + 1")).Error)
}

// generateInviteCode генерирует 8-символьный base32 код.
func generateInviteCode() (string, error) {
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b), nil
}

func mapNotFound(err error, fallback error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fallback
	}
	return err
}
