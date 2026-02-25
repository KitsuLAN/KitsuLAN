package rpc

import (
	"context"
	"crypto/tls"
	"fmt"
	"time"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"
)

// Client — обертка над gRPC соединением
type Client struct {
	conn *grpc.ClientConn

	// Сервисы
	Auth  pb.AuthServiceClient
	User  pb.UserServiceClient
	Guild pb.GuildServiceClient
	Chat  pb.ChatServiceClient
	Realm pb.RealmServiceClient

	serverAddr string
}

func NewClient(addr string) *Client {
	return &Client{
		serverAddr: addr,
	}
}

// Connect устанавливает соединение с настройками для нестабильных сетей
func (c *Client) Connect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Параметры Keepalive (чтобы соединение жило вечно)
	kacp := keepalive.ClientParameters{
		Time:                60 * time.Second, // Пинговать сервер каждые 60 сек, если нет активности
		Timeout:             time.Second,      // Ждать ответа на пинг 1 сек
		PermitWithoutStream: true,             // Пинговать даже если нет активных стримов
	}

	opts := []grpc.DialOption{
		grpc.WithBlock(),
		grpc.WithKeepaliveParams(kacp),
		// Увеличиваем лимит входящего сообщения до 16МБ (на будущее для картинок)
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(16 * 1024 * 1024)),
	}

	// Простая проверка на SSL (если порт 443, используем TLS)
	// В продакшене логика может быть сложнее
	if c.isSecure() {
		opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{InsecureSkipVerify: true})))
	} else {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	}

	conn, err := grpc.DialContext(ctx, c.serverAddr, opts...)
	if err != nil {
		return fmt.Errorf("failed to dial %s: %w", c.serverAddr, err)
	}

	c.conn = conn
	c.initServices(conn)

	return nil
}

func (c *Client) initServices(conn *grpc.ClientConn) {
	c.Auth = pb.NewAuthServiceClient(conn)
	c.User = pb.NewUserServiceClient(conn)
	c.Guild = pb.NewGuildServiceClient(conn)
	c.Chat = pb.NewChatServiceClient(conn)
	c.Realm = pb.NewRealmServiceClient(conn)
}

func (c *Client) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// IsReady возвращает true, если соединение активно
func (c *Client) IsReady() bool {
	if c.conn == nil {
		return false
	}
	state := c.conn.GetState()
	return state == connectivity.Ready || state == connectivity.Idle
}

func (c *Client) isSecure() bool {
	// Пока простая эвристика, можно расширить
	return false
}

// WithToken добавляет JWT в контекст
func WithToken(ctx context.Context, token string) context.Context {
	if token == "" {
		return ctx
	}
	return metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+token)
}
