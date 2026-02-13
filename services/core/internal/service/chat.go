package service

import (
	"context"
	"fmt"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/hub"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ChatService struct {
	messages repository.MessageRepository
	channels repository.ChannelRepository
	guilds   repository.GuildRepository
	hub      *hub.Hub
}

func NewChatService(
	messages repository.MessageRepository,
	channels repository.ChannelRepository,
	guilds repository.GuildRepository,
	hub *hub.Hub,
) *ChatService {
	return &ChatService{messages: messages, channels: channels, guilds: guilds, hub: hub}
}

func (s *ChatService) SendMessage(ctx context.Context, channelID, authorID, content string) (*domain.Message, error) {
	if len(content) == 0 || len(content) > 4000 {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "message content must be 1–4000 characters")
	}

	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return nil, err
	}
	if ch.Type != domain.ChannelTypeText {
		return nil, domainerr.Wrap(domainerr.ErrInvalidArgument, "cannot send text message to voice channel")
	}

	// Проверяем что отправитель — член гильдии
	isMember, err := s.guilds.IsMember(ctx, ch.GuildID.String(), authorID)
	if err != nil || !isMember {
		return nil, domainerr.ErrPermissionDenied
	}

	chUUID, _ := uuid.Parse(channelID)
	authorUUID, _ := uuid.Parse(authorID)
	msg := &domain.Message{
		ChannelID: chUUID,
		AuthorID:  authorUUID,
		Content:   content,
	}
	if err := s.messages.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("save message: %w", err)
	}

	// Публикуем в хаб (не ждём — fire and forget)
	s.hub.Publish(channelID, &pb.ChatEvent{
		Payload: &pb.ChatEvent_MessageCreated{
			MessageCreated: MessageToProto(msg),
		},
	})

	return msg, nil
}

func (s *ChatService) GetHistory(ctx context.Context, channelID, callerID string, limit int, beforeID string) ([]domain.Message, bool, error) {
	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return nil, false, err
	}

	isMember, err := s.guilds.IsMember(ctx, ch.GuildID.String(), callerID)
	if err != nil || !isMember {
		return nil, false, domainerr.ErrPermissionDenied
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}

	msgs, err := s.messages.GetHistory(ctx, channelID, limit+1, beforeID)
	if err != nil {
		return nil, false, err
	}

	hasMore := len(msgs) > limit
	if hasMore {
		msgs = msgs[:limit]
	}
	return msgs, hasMore, nil
}

// Hub возвращает hub для использования в transport слое.
func (s *ChatService) Hub() *hub.Hub {
	return s.hub
}

// CanSubscribe проверяет права на подписку.
func (s *ChatService) CanSubscribe(ctx context.Context, channelID, userID string) error {
	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return err
	}
	isMember, err := s.guilds.IsMember(ctx, ch.GuildID.String(), userID)
	if err != nil || !isMember {
		return domainerr.ErrPermissionDenied
	}
	return nil
}

// MessageToProto конвертирует domain.Message в proto.
func MessageToProto(m *domain.Message) *pb.ChatMessage {
	msg := &pb.ChatMessage{
		Id:        m.ID.String(),
		ChannelId: m.ChannelID.String(),
		AuthorId:  m.AuthorID.String(),
		Content:   m.Content,
		CreatedAt: timestamppb.New(m.CreatedAt),
	}
	// Автор может быть не загружен (lazy)
	if m.Author.ID != uuid.Nil {
		msg.AuthorUsername = m.Author.Username
		msg.AuthorAvatarUrl = m.Author.AvatarURL
	}
	if m.EditedAt != nil {
		msg.EditedAt = timestamppb.New(*m.EditedAt)
	}
	return msg
}
