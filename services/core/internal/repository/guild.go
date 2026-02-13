package repository

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"gorm.io/gorm"
)

type guildGORMRepo struct{ db *gorm.DB }

func NewGuildRepository(db *gorm.DB) GuildRepository {
	return &guildGORMRepo{db: db}
}

func (r *guildGORMRepo) Create(ctx context.Context, g *domain.Guild) error {
	return r.db.WithContext(ctx).Create(g).Error
}

func (r *guildGORMRepo) FindByID(ctx context.Context, id string) (*domain.Guild, error) {
	var g domain.Guild
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&g).Error
	if err != nil {
		return nil, mapNotFound(err, domainerr.ErrNotFound)
	}
	return &g, nil
}

func (r *guildGORMRepo) ListByMember(ctx context.Context, userID string) ([]domain.Guild, error) {
	var guilds []domain.Guild
	err := r.db.WithContext(ctx).
		Joins("JOIN guild_members ON guild_members.guild_id = guilds.id").
		Where("guild_members.user_id = ?", userID).
		Where("guilds.deleted_at IS NULL").
		Find(&guilds).Error
	return guilds, err
}

func (r *guildGORMRepo) Delete(ctx context.Context, id string) error {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&domain.Guild{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *guildGORMRepo) MemberCount(ctx context.Context, guildID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.GuildMember{}).
		Where("guild_id = ?", guildID).Count(&count).Error
	return count, err
}

func (r *guildGORMRepo) AddMember(ctx context.Context, m *domain.GuildMember) error {
	if m.JoinedAt.IsZero() {
		m.JoinedAt = time.Now()
	}
	return r.db.WithContext(ctx).
		Where(domain.GuildMember{GuildID: m.GuildID, UserID: m.UserID}).
		FirstOrCreate(m).Error
}

func (r *guildGORMRepo) RemoveMember(ctx context.Context, guildID, userID string) error {
	res := r.db.WithContext(ctx).
		Where("guild_id = ? AND user_id = ?", guildID, userID).
		Delete(&domain.GuildMember{})
	return res.Error
}

func (r *guildGORMRepo) IsMember(ctx context.Context, guildID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.GuildMember{}).
		Where("guild_id = ? AND user_id = ?", guildID, userID).
		Count(&count).Error
	return count > 0, err
}

func (r *guildGORMRepo) ListMembers(ctx context.Context, guildID string) ([]domain.GuildMember, error) {
	var members []domain.GuildMember
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("guild_id = ?", guildID).
		Find(&members).Error
	return members, err
}

func (r *guildGORMRepo) CreateInvite(ctx context.Context, inv *domain.GuildInvite) error {
	if inv.Code == "" {
		code, err := generateInviteCode()
		if err != nil {
			return err
		}
		inv.Code = code
	}
	return r.db.WithContext(ctx).Create(inv).Error
}

func (r *guildGORMRepo) FindInvite(ctx context.Context, code string) (*domain.GuildInvite, error) {
	var inv domain.GuildInvite
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&inv).Error
	if err != nil {
		return nil, mapNotFound(err, domainerr.ErrNotFound)
	}
	return &inv, nil
}

func (r *guildGORMRepo) IncrementInviteUses(ctx context.Context, code string) error {
	return r.db.WithContext(ctx).Model(&domain.GuildInvite{}).
		Where("code = ?", code).
		UpdateColumn("uses", gorm.Expr("uses + 1")).Error
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
	if domainerr.Is(err, gorm.ErrRecordNotFound) {
		return fallback
	}
	return err
}
