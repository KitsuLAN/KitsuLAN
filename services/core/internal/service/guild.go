package service

import (
	"context"
	"math/rand"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/google/uuid"
)

type GuildService struct {
	guilds   repository.GuildRepository
	channels repository.ChannelRepository
	tm       database.TransactionManager
}

func NewGuildService(guilds repository.GuildRepository, channels repository.ChannelRepository, tm database.TransactionManager) *GuildService {
	return &GuildService{guilds: guilds, channels: channels, tm: tm}
}

// Палитра (Tailwind Colors 600)
var guildColors = []string{
	"#dc2626", "#ea580c", "#d97706", "#65a30d", "#16a34a",
	"#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3",
	"#db2777",
}

func (s *GuildService) checkMember(ctx context.Context, guildID, userID string) error {
	isMember, err := s.guilds.IsMember(ctx, guildID, userID)
	if err != nil {
		return errors.Wrap(err, errors.ErrDBQueryFailed, "GuildService.checkMember")
	}
	if !isMember {
		return errors.ErrForbidden.WithMeta("guild_id", guildID).WithMsg("You are not a member of this guild")
	}
	return nil
}

func (s *GuildService) getOwnedGuild(ctx context.Context, guildID, userID string) (*models.Guild, error) {
	guild, err := s.guilds.FindByID(ctx, guildID)
	if err != nil {
		return nil, errors.AsAppError(err).WithOp("GuildService.getOwnedGuild")
	}
	if !guild.IsOwner(uuid.MustParse(userID)) {
		return nil, errors.ErrForbidden.WithMeta("guild_id", guildID).WithMsg("Only the owner can perform this action")
	}
	return guild, nil
}

func (s *GuildService) CreateGuild(ctx context.Context, ownerID, name, description string) (*models.Guild, error) {
	const op = "GuildService.CreateGuild"

	if len(name) < 2 || len(name) > 100 {
		return nil, errors.ValidationError("name", "Must be 2-100 characters").WithOp(op)
	}

	ownerUUID := uuid.MustParse(ownerID)
	realmID := middleware.MustRealmID(ctx)

	// Выбираем случайный цвет для отображения на клиенте
	color := guildColors[rand.Intn(len(guildColors))]

	guild := &models.Guild{
		BaseEntity:  models.BaseEntity{RealmID: realmID},
		Name:        name,
		Description: description,
		OwnerID:     ownerUUID,
		Color:       color,
		InviteCode:  nil,
	}

	err := s.tm.Do(ctx, func(txCtx context.Context) error {
		if err := s.guilds.Create(txCtx, guild); err != nil {
			return errors.AsAppError(err).WithOp(op).WithMsg("Failed to save guild")
		}

		// Автоматически добавить создателя в гильдию
		if err := s.guilds.AddMember(txCtx, &models.GuildMember{
			RealmID:              realmID,
			GuildID:              guild.ID,
			UserID:               ownerUUID,
			JoinedAt:             time.Now(),
			EffectivePermissions: models.AllGuildPermissions,
		}); err != nil {
			return errors.AsAppError(err).WithOp(op).WithMsg("Failed to add owner member")
		}

		// Создать дефолтный канал #general
		ch := &models.Channel{
			BaseEntity: models.BaseEntity{RealmID: realmID},
			GuildID:    guild.ID,
			Name:       "general",
			Type:       models.ChannelTypeText,
		}
		return s.channels.Create(txCtx, ch)
	})

	if err != nil {
		return nil, err
	}

	return guild, nil

}

func (s *GuildService) GetGuild(ctx context.Context, guildID, callerID string) (*models.Guild, error) {
	if err := s.checkMember(ctx, guildID, callerID); err != nil {
		return nil, err
	}
	return s.guilds.FindByID(ctx, guildID)
}

func (s *GuildService) ListMyGuilds(ctx context.Context, userID string) ([]models.Guild, error) {
	return s.guilds.ListByMember(ctx, userID)
}

func (s *GuildService) DeleteGuild(ctx context.Context, guildID, callerID string) error {
	if _, err := s.getOwnedGuild(ctx, guildID, callerID); err != nil {
		return err
	}
	return s.guilds.Delete(ctx, guildID)
}

func (s *GuildService) CreateInvite(ctx context.Context, guildID, callerID string, maxUses int, expiresInHours int) (*models.GuildInvite, error) {
	if err := s.checkMember(ctx, guildID, callerID); err != nil {
		return nil, err
	}

	inv := &models.GuildInvite{
		RealmID:   middleware.MustRealmID(ctx),
		GuildID:   uuid.MustParse(guildID),
		CreatedBy: uuid.MustParse(callerID),
		MaxUses:   maxUses,
	}
	if expiresInHours > 0 {
		t := time.Now().Add(time.Duration(expiresInHours) * time.Hour)
		inv.ExpiresAt = &t
	}

	if err := s.guilds.CreateInvite(ctx, inv); err != nil {
		return nil, err
	}
	return inv, nil
}

func (s *GuildService) JoinByInvite(ctx context.Context, code, userID string) (*models.Guild, error) {
	const op = "GuildService.JoinByInvite"

	inv, err := s.guilds.FindInvite(ctx, code)
	if err != nil {
		if errors.Is(err, errors.ErrNotFound) {
			return nil, errors.InviteError(errors.CodeInviteNotFound, code).WithOp(op)
		}
		return nil, errors.Wrap(err, errors.ErrDBQueryFailed, op)
	}

	// Проверки валидности инвайта
	if inv.ExpiresAt != nil && time.Now().After(*inv.ExpiresAt) {
		return nil, errors.InviteError(errors.CodeInviteExpired, code).WithOp(op)
	}
	if inv.MaxUses > 0 && inv.Uses >= inv.MaxUses {
		return nil, errors.InviteError(errors.CodeInviteMaxUses, code).WithOp(op)
	}

	err = s.tm.Do(ctx, func(txCtx context.Context) error {
		if err := s.guilds.AddMember(txCtx, &models.GuildMember{
			RealmID: inv.RealmID,
			GuildID: inv.GuildID,
			UserID:  uuid.MustParse(userID),
		}); err != nil {
			return errors.AsAppError(err).WithOp(op)
		}
		return s.guilds.IncrementInviteUses(txCtx, code)
	})

	if err != nil {
		return nil, err
	}

	return s.guilds.FindByID(ctx, inv.GuildID.String())
}

func (s *GuildService) LeaveGuild(ctx context.Context, guildID, userID string) error {
	const op = "GuildService.LeaveGuild"

	guild, err := s.guilds.FindByID(ctx, guildID)
	if err != nil {
		return errors.AsAppError(err).WithOp(op)
	}
	if guild.IsOwner(uuid.MustParse(userID)) {
		return errors.ErrOwnerCannotLeave.WithOp(op).
			WithRemedy("Transfer ownership or delete the guild instead.")
	}

	return s.guilds.RemoveMember(ctx, guildID, userID)
}

func (s *GuildService) CreateChannel(ctx context.Context, guildID, callerID, name string, chType models.ChannelType) (*models.Channel, error) {
	const op = "GuildService.CreateChannel"

	guild, err := s.getOwnedGuild(ctx, guildID, callerID)
	if err != nil {
		return nil, err
	}
	if len(name) < 1 || len(name) > 100 {
		return nil, errors.ValidationError("name", "channel name must be 1–100 characters")
	}

	ch := &models.Channel{
		BaseEntity: models.BaseEntity{RealmID: guild.RealmID},
		GuildID:    guild.ID,
		Name:       name,
		Type:       chType,
	}
	if err := s.channels.Create(ctx, ch); err != nil {
		return nil, errors.AsAppError(err).WithOp(op)
	}
	return ch, nil
}

func (s *GuildService) DeleteChannel(ctx context.Context, channelID, callerID string) error {
	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	if _, err := s.getOwnedGuild(ctx, ch.GuildID.String(), callerID); err != nil {
		return err
	}
	return s.channels.Delete(ctx, channelID)
}

func (s *GuildService) ListChannels(ctx context.Context, guildID, callerID string) ([]models.Channel, error) {
	if err := s.checkMember(ctx, guildID, callerID); err != nil {
		return nil, err
	}
	return s.channels.ListByGuild(ctx, guildID)
}

func (s *GuildService) ListMembers(ctx context.Context, guildID, callerID string) ([]models.GuildMember, error) {
	if err := s.checkMember(ctx, guildID, callerID); err != nil {
		return nil, err
	}
	return s.guilds.ListMembers(ctx, guildID)
}
