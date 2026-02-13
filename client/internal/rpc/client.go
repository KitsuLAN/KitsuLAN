package rpc

import (
	"context"
	"log"
	"time"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

type Client struct {
	conn       *grpc.ClientConn
	Auth       pb.AuthServiceClient
	User       pb.UserServiceClient
	Guild      pb.GuildServiceClient
	Chat       pb.ChatServiceClient
	serverAddr string
}

func NewClient(addr string) *Client {
	return &Client{
		serverAddr: addr,
	}
}

// Connect пытается подключиться к серверу
func (c *Client) Connect() error {
	// Используем блокирующее подключение с таймаутом для первичной проверки
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, c.serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return err
	}

	c.conn = conn
	c.Auth = pb.NewAuthServiceClient(conn)
	c.User = pb.NewUserServiceClient(conn)
	c.Guild = pb.NewGuildServiceClient(conn)
	c.Chat = pb.NewChatServiceClient(conn)

	log.Printf("✅ gRPC Connected to %s", c.serverAddr)
	return nil
}

func (c *Client) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}

// IsReady проверяет состояние соединения
func (c *Client) IsReady() bool {
	if c.conn == nil {
		return false
	}
	state := c.conn.GetState()
	return state == connectivity.Ready || state == connectivity.Idle
}

// WithToken возвращает контекст с JWT-токеном в metadata.
// Используется во всех авторизованных вызовах.
func WithToken(ctx context.Context, token string) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+token)
}
