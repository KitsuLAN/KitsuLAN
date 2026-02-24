package service

import (
	"context"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/hub"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ChatService struct {
	messages repository.MessageRepository
	channels repository.ChannelRepository
	guilds   repository.GuildRepository
	users    *UserService
	hub      *hub.Hub
}

func NewChatService(
	messages repository.MessageRepository,
	channels repository.ChannelRepository,
	guilds repository.GuildRepository,
	users *UserService,
	hub *hub.Hub,
) *ChatService {
	return &ChatService{messages: messages, channels: channels, guilds: guilds, users: users, hub: hub}
}

func (s *ChatService) getAccessibleChannel(ctx context.Context, channelID, userID, op string) (*models.Channel, error) {
	ch, err := s.channels.FindByID(ctx, channelID)
	if err != nil {
		return nil, errors.AsAppError(err).WithOp(op).WithMsg("Channel not found")
	}

	isMember, err := s.guilds.IsMember(ctx, ch.GuildID.String(), userID)
	if err != nil {
		return nil, errors.Wrap(err, errors.ErrDBQueryFailed, op)
	}
	if !isMember {
		// FIXME: Вариативная проверка на права VIEW_CHANNEL и SEND_MESSAGES
		return nil, errors.PermissionError("VIEW_CHANNEL", ch.GuildID.String()).WithOp(op)
	}

	return ch, nil
}

func (s *ChatService) SendMessage(ctx context.Context, channelID, authorID, content string) (*models.Message, error) {
	const op = "ChatService.SendMessage"

	if len(content) == 0 {
		return nil, errors.ErrCannotSendEmpty.WithOp(op).
			WithRemedy("Please type something before sending.")
	}
	if len(content) > 4000 {
		return nil, errors.ErrMessageTooLong.WithOp(op).
			WithMeta("limit", 4000).
			WithMeta("current", len(content)).
			WithRemedy("Try splitting your message into multiple parts.")
	}

	ch, err := s.getAccessibleChannel(ctx, channelID, authorID, op)
	if err != nil {
		return nil, err
	}

	if ch.Type != models.ChannelTypeText && ch.Type != models.ChannelTypeAnnouncement {
		return nil, errors.New(errors.CodeChannelAccessDenied, "This channel does not support text messages.", 3).
			WithOp(op).
			WithMeta("channel_type", ch.Type)
	}

	msg := &models.Message{
		BaseEntity: models.BaseEntity{RealmID: middleware.MustRealmID(ctx)},
		ChannelID:  uuid.MustParse(channelID),
		AuthorID:   uuid.MustParse(authorID),
		Content:    content,
	}
	if err := s.messages.Create(ctx, msg); err != nil {
		return nil, errors.AsAppError(err).WithOp(op).
			WithMsg("Failed to persist message in database")
	}

	if authorProfile, err := s.users.GetProfile(ctx, authorID); err == nil {
		msg.Author = *authorProfile
	}

	// Публикуем в хаб (не ждём — fire and forget)
	s.hub.Publish(channelID, &pb.ChatEvent{
		Payload: &pb.ChatEvent_MessageCreated{
			MessageCreated: MessageToProto(msg),
		},
	})

	return msg, nil
}

func (s *ChatService) GetHistory(ctx context.Context, channelID, callerID string, limit int, beforeID string) ([]models.Message, bool, error) {
	const op = "ChatService.GetHistory"

	if _, err := s.getAccessibleChannel(ctx, channelID, callerID, op); err != nil {
		return nil, false, err
	}

	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		return nil, false, errors.LimitReached("messages_per_request", 100).WithOp(op)
	}

	msgs, err := s.messages.GetHistory(ctx, channelID, limit+1, beforeID)
	if err != nil {
		return nil, false, errors.Wrap(err, errors.ErrDBQueryFailed, op)
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
	_, err := s.getAccessibleChannel(ctx, channelID, userID, "ChatService.CanSubscribe")
	return err
}

// MessageToProto конвертирует domain.Message в proto.
func MessageToProto(m *models.Message) *pb.ChatMessage {
	msg := &pb.ChatMessage{
		Id:        m.ID.String(),
		ChannelId: m.ChannelID.String(),
		AuthorId:  m.AuthorID.String(),
		Content:   m.Content,
		CreatedAt: timestamppb.New(m.CreatedAt),
	}
	// Автор может быть не загружен (lazy)
	if m.Author.Username != "" {
		msg.AuthorUsername = m.Author.Username
		msg.AuthorAvatarUrl = m.Author.AvatarURL
	}
	if m.EditedAt != nil {
		msg.EditedAt = timestamppb.New(*m.EditedAt)
	}
	return msg
}
