package service

import (
	"context"
	"fmt"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
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

func (s *GuildService) CreateGuild(ctx context.Context, ownerID, name, description string) (*domain.Guild, error) {
	if len(name) < 2 || len(name) > 100 {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "guild name must be 2–100 characters")
	}

	ownerUUID, err := uuid.Parse(ownerID)
	if err != nil {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "invalid owner id")
	}

	guild := &domain.Guild{
		Name:        name,
		Description: description,
		OwnerID:     ownerUUID,
	}

	err = s.tm.Do(ctx, func(txCtx context.Context) error {
		if err := s.guilds.Create(txCtx, guild); err != nil {
			return fmt.Errorf("create guild: %w", err)
		}

		// Автоматически добавить создателя в гильдию
		if err := s.guilds.AddMember(txCtx, &domain.GuildMember{
			GuildID:  guild.ID,
			UserID:   ownerUUID,
			JoinedAt: time.Now(),
		}); err != nil {
			return fmt.Errorf("add owner as member: %w", err)
		}

		// Создать дефолтный канал #general
		if err := s.channels.Create(ctx, &domain.Channel{
			GuildID:  guild.ID,
			Name:     "general",
			Type:     domain.ChannelTypeText,
			Position: 0,
		}); err != nil {
			return fmt.Errorf("create default channel: %w", err)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return guild, nil

}

func (s *GuildService) GetGuild(ctx context.Context, guildID, callerID string) (*domain.Guild, error) {
	isMember, err := s.guilds.IsMember(ctx, guildID, callerID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, domainerr.ErrPermissionDenied
	}
	return s.guilds.FindByID(ctx, guildID)
}

func (s *GuildService) ListMyGuilds(ctx context.Context, userID string) ([]domain.Guild, error) {
	return s.guilds.ListByMember(ctx, userID)
}

func (s *GuildService) DeleteGuild(ctx context.Context, guildID, callerID string) error {
	guild, err := s.guilds.FindByID(ctx, guildID)
	if err != nil {
		return err
	}
	if guild.OwnerID.String() != callerID {
		return domainerr.ErrPermissionDenied
	}
	return s.guilds.Delete(ctx, guildID)
}

func (s *GuildService) CreateInvite(ctx context.Context, guildID, callerID string, maxUses int, expiresInHours int) (*domain.GuildInvite, error) {
	isMember, err := s.guilds.IsMember(ctx, guildID, callerID)
	if err != nil || !isMember {
		return nil, domainerr.ErrPermissionDenied
	}

	guildUUID, _ := uuid.Parse(guildID)
	callerUUID, _ := uuid.Parse(callerID)

	inv := &domain.GuildInvite{
		GuildID:   guildUUID,
		CreatedBy: callerUUID,
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

func (s *GuildService) JoinByInvite(ctx context.Context, code, userID string) (*domain.Guild, error) {
	inv, err := s.guilds.FindInvite(ctx, code)
	if err != nil {
		return nil, domainerr.Wrap(domainerr.ErrNotFound, "invite not found")
	}

	// Проверки валидности инвайта
	if inv.ExpiresAt != nil && time.Now().After(*inv.ExpiresAt) {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "invite expired")
	}
	if inv.MaxUses > 0 && inv.Uses >= inv.MaxUses {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "invite max uses reached")
	}

	userUUID, _ := uuid.Parse(userID)
	err = s.tm.Do(ctx, func(txCtx context.Context) error {
		if err := s.guilds.AddMember(ctx, &domain.GuildMember{
			GuildID: inv.GuildID,
			UserID:  userUUID,
		}); err != nil {
			return fmt.Errorf("add guild member: %w", err)
		}
		if err := s.guilds.IncrementInviteUses(ctx, code); err != nil {
			return fmt.Errorf("increment invite uses: %w", err)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.guilds.FindByID(ctx, inv.GuildID.String())
}

func (s *GuildService) LeaveGuild(ctx context.Context, guildID, userID string) error {
	guild, err := s.guilds.FindByID(ctx, guildID)
	if err != nil {
		return err
	}
	if guild.OwnerID.String() == userID {
		return domainerr.Wrap(domainerr.ErrInvalidArgument, "owner cannot leave guild, delete it instead")
	}
	return s.guilds.RemoveMember(ctx, guildID, userID)
}

func (s *GuildService) CreateChannel(ctx context.Context, guildID, callerID, name string, chType domain.ChannelType) (*domain.Channel, error) {
	guild, err := s.guilds.FindByID(ctx, guildID)
	if err != nil {
		return nil, err
	}
	if guild.OwnerID.String() != callerID {
		return nil, domainerr.ErrPermissionDenied
	}
	if len(name) < 1 || len(name) > 100 {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "channel name must be 1–100 characters")
	}

	guildUUID, _ := uuid.Parse(guildID)
	ch := &domain.Channel{
		GuildID: guildUUID,
		Name:    name,
		Type:    chType,
	}
	if err := s.channels.Create(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

func (s *GuildService) DeleteChannel(ctx context.Context, channelID, callerID string) error {
	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	guild, err := s.guilds.FindByID(ctx, ch.GuildID.String())
	if err != nil {
		return err
	}
	if guild.OwnerID.String() != callerID {
		return domainerr.ErrPermissionDenied
	}
	return s.channels.Delete(ctx, channelID)
}

func (s *GuildService) ListChannels(ctx context.Context, guildID, callerID string) ([]domain.Channel, error) {
	isMember, err := s.guilds.IsMember(ctx, guildID, callerID)
	if err != nil || !isMember {
		return nil, domainerr.ErrPermissionDenied
	}
	return s.channels.ListByGuild(ctx, guildID)
}

func (s *GuildService) ListMembers(ctx context.Context, guildID, callerID string) ([]domain.GuildMember, error) {
	isMember, err := s.guilds.IsMember(ctx, guildID, callerID)
	if err != nil || !isMember {
		return nil, domainerr.ErrPermissionDenied
	}
	return s.guilds.ListMembers(ctx, guildID)
}
