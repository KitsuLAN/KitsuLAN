package grpc_transport

import (
	"context"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ChatServer struct {
	pb.UnimplementedChatServiceServer
	svc *service.ChatService
}

func NewChatServer(svc *service.ChatService) *ChatServer {
	return &ChatServer{svc: svc}
}

func (s *ChatServer) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.SendMessageResponse, error) {
	callerID, ok := middleware.UserIDFromContext(ctx)
	if !ok {
		return nil, domainerr.ToGRPC(domainerr.ErrUnauthorized)
	}
	msg, err := s.svc.SendMessage(ctx, req.ChannelId, callerID, req.Content)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	return &pb.SendMessageResponse{Message: service.MessageToProto(msg)}, nil
}

func (s *ChatServer) GetHistory(ctx context.Context, req *pb.GetHistoryRequest) (*pb.GetHistoryResponse, error) {
	callerID, ok := middleware.UserIDFromContext(ctx)
	if !ok {
		return nil, domainerr.ToGRPC(domainerr.ErrUnauthorized)
	}
	msgs, hasMore, err := s.svc.GetHistory(ctx, req.ChannelId, callerID, int(req.Limit), req.BeforeMessageId)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}
	resp := &pb.GetHistoryResponse{HasMore: hasMore}
	for i := range msgs {
		resp.Messages = append(resp.Messages, service.MessageToProto(&msgs[i]))
	}
	return resp, nil
}

func (s *ChatServer) SubscribeChannel(req *pb.SubscribeChannelRequest, stream pb.ChatService_SubscribeChannelServer) error {
	callerID, ok := middleware.UserIDFromContext(stream.Context())
	if !ok {
		return status.Error(codes.Unauthenticated, "unauthorized")
	}

	if err := s.svc.CanSubscribe(stream.Context(), req.ChannelId, callerID); err != nil {
		return domainerr.ToGRPC(err)
	}

	events, unsubscribe := s.svc.Hub().Subscribe(req.ChannelId)
	defer unsubscribe()

	for {
		select {
		case event, ok := <-events:
			if !ok {
				return nil // канал закрыт
			}
			if err := stream.Send(event); err != nil {
				return err // клиент отключился
			}
		case <-stream.Context().Done():
			return nil // клиент закрыл соединение
		}
	}
}
