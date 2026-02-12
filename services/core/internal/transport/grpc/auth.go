// Package grpc_transport реализует gRPC handlers для AuthService.
// Ответственность слоя — только трансляция proto ↔ domain types.
// Вся бизнес-логика живёт в service-слое.
package grpc_transport

import (
	"context"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AuthServer реализует pb.AuthServiceServer.
type AuthServer struct {
	pb.UnimplementedAuthServiceServer
	authService *service.AuthService
}

// NewAuthServer — конструктор.
func NewAuthServer(authService *service.AuthService) *AuthServer {
	return &AuthServer{authService: authService}
}

// Register — создание нового аккаунта.
func (s *AuthServer) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, status.Error(codes.InvalidArgument, "username and password are required")
	}

	userID, err := s.authService.Register(ctx, req.Username, req.Password)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}

	return &pb.RegisterResponse{UserId: userID}, nil
}

// Login — аутентификация и выдача токенов.
func (s *AuthServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	if req.Username == "" || req.Password == "" {
		return nil, status.Error(codes.InvalidArgument, "username and password are required")
	}

	accessToken, refreshToken, err := s.authService.Login(ctx, req.Username, req.Password)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}

	return &pb.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    86400, // 24h в секундах
	}, nil
}

// RefreshToken — обновление пары токенов.
func (s *AuthServer) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	if req.RefreshToken == "" {
		return nil, status.Error(codes.InvalidArgument, "refresh_token is required")
	}

	newAccess, newRefresh, err := s.authService.RefreshToken(ctx, req.RefreshToken)
	if err != nil {
		return nil, domainerr.ToGRPC(err)
	}

	return &pb.RefreshTokenResponse{
		AccessToken:  newAccess,
		RefreshToken: newRefresh,
	}, nil
}
