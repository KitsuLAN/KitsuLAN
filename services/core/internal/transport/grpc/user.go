package grpc_transport

import (
	"context"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
)

type UserServer struct {
	pb.UnimplementedUserServiceServer
	svc *service.UserService
}

func NewUserServer(svc *service.UserService) *UserServer {
	return &UserServer{svc: svc}
}

func (s *UserServer) GetProfile(ctx context.Context, req *pb.GetProfileRequest) (*pb.GetProfileResponse, error) {
	targetID := req.UserId
	if targetID == "" {
		targetID = middleware.MustUserID(ctx)
	}

	user, err := s.svc.GetProfile(ctx, targetID)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}

	return &pb.GetProfileResponse{
		User: &pb.User{
			Id:        user.ID.String(),
			Username:  user.Username,
			AvatarUrl: user.AvatarURL,
			Bio:       user.Bio, // TODO: Поле может быть тяжёлым, реализовать lazyloading
			IsOnline:  false,    // TODO: Реализовать Presence систему
		},
	}, nil
}

func (s *UserServer) UpdateProfile(ctx context.Context, req *pb.UpdateProfileRequest) (*pb.UpdateProfileResponse, error) {
	callerID := middleware.MustUserID(ctx)

	user, err := s.svc.UpdateProfile(ctx, callerID, req.Nickname, req.Bio, req.AvatarUrl)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}

	return &pb.UpdateProfileResponse{
		User: &pb.User{
			Id:        user.ID.String(),
			Username:  user.Username,
			AvatarUrl: user.AvatarURL,
			Bio:       user.Bio,
		},
	}, nil
}
