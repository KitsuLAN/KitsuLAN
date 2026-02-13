package main

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/KitsuLAN/KitsuLAN/client/internal/rpc"
	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx    context.Context
	client *rpc.Client

	// Токен хранится здесь для всех Go-вызовов.
	// Фронтенд дублирует его в zustand — это нормально.
	mu          sync.RWMutex
	accessToken string

	// Управление активной подпиской на канал.
	// При смене канала старая подписка отменяется.
	subMu     sync.Mutex
	subCancel context.CancelFunc
}

func NewApp() *App {
	// Адрес хардкодим пока, потом вынесем в конфиг
	return &App{
		client: rpc.NewClient("localhost:8090"),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Пытаемся подключиться в отдельной горутине, чтобы не блочить UI
	go func() {
		if err := a.client.Connect(); err != nil {
			log.Printf("❌ Failed to connect on startup: %v", err)
			// Тут можно послать событие фронтенду: EventsEmit(ctx, "server_error", err.Error())
		}
	}()
}

func (a *App) shutdown(ctx context.Context) {
	a.cancelSubscription()
	a.client.Close()
}

// --- helpers ---

func (a *App) authCtx() (context.Context, context.CancelFunc) {
	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	return rpc.WithToken(ctx, token), cancel
}

func (a *App) setToken(token string) {
	a.mu.Lock()
	a.accessToken = token
	a.mu.Unlock()
}

func (a *App) cancelSubscription() {
	a.subMu.Lock()
	defer a.subMu.Unlock()
	if a.subCancel != nil {
		a.subCancel()
		a.subCancel = nil
	}
}

func (a *App) requireReady() error {
	if !a.client.IsReady() {
		return errors.New("server unavailable")
	}
	return nil
}

// --- API Methods for Frontend ---

// CheckServerStatus - простой пинг для UI
func (a *App) CheckServerStatus() bool {
	return a.client.IsReady()
}

func (a *App) ConnectToServer(addr string) (bool, error) {
	newClient := rpc.NewClient(addr)
	if err := newClient.Connect(); err != nil {
		return false, err
	}
	// Закрываем старое соединение
	a.cancelSubscription()
	a.client.Close()
	a.client = newClient
	return true, nil
}

func (a *App) Register(username, password string) (string, error) {
	if err := a.requireReady(); err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := a.client.Auth.Register(ctx, &pb.RegisterRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		return "", err // Wails прокинет текст ошибки в JS
	}
	return resp.UserId, nil
}

func (a *App) Login(username, password string) (string, error) {
	if !a.client.IsReady() {
		return "", errors.New("server unavailable")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := a.client.Auth.Login(ctx, &pb.LoginRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		return "", err
	}

	// Сохраняем токен на Go-стороне для всех последующих вызовов.
	a.setToken(resp.AccessToken)
	return resp.AccessToken, nil
}

// SetToken вызывается фронтендом при восстановлении сессии из localStorage.
func (a *App) SetToken(token string) {
	a.setToken(token)
}

// ============================================================
// Guild
// ============================================================

func (a *App) CreateGuild(name, description string) (*pb.Guild, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.CreateGuild(ctx, &pb.CreateGuildRequest{
		Name:        name,
		Description: description,
	})
	if err != nil {
		return nil, err
	}
	return resp.Guild, nil
}

func (a *App) ListMyGuilds() ([]*pb.Guild, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.ListMyGuilds(ctx, &pb.ListMyGuildsRequest{})
	if err != nil {
		return nil, err
	}
	return resp.Guilds, nil
}

func (a *App) CreateInvite(guildID string, maxUses, expiresInHours int32) (string, error) {
	if err := a.requireReady(); err != nil {
		return "", err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.CreateInvite(ctx, &pb.CreateInviteRequest{
		GuildId:        guildID,
		MaxUses:        maxUses,
		ExpiresInHours: expiresInHours,
	})
	if err != nil {
		return "", err
	}
	return resp.Code, nil
}

func (a *App) JoinByInvite(code string) (*pb.Guild, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.JoinByInvite(ctx, &pb.JoinByInviteRequest{Code: code})
	if err != nil {
		return nil, err
	}
	return resp.Guild, nil
}

func (a *App) LeaveGuild(guildID string) error {
	if err := a.requireReady(); err != nil {
		return err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	_, err := a.client.Guild.LeaveGuild(ctx, &pb.LeaveGuildRequest{GuildId: guildID})
	return err
}

func (a *App) DeleteGuild(guildID string) error {
	if err := a.requireReady(); err != nil {
		return err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	_, err := a.client.Guild.DeleteGuild(ctx, &pb.DeleteGuildRequest{GuildId: guildID})
	return err
}

func (a *App) ListChannels(guildID string) ([]*pb.Channel, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.ListChannels(ctx, &pb.ListChannelsRequest{GuildId: guildID})
	if err != nil {
		return nil, err
	}
	return resp.Channels, nil
}

func (a *App) CreateChannel(guildID, name string, channelType int32) (*pb.Channel, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.CreateChannel(ctx, &pb.CreateChannelRequest{
		GuildId: guildID,
		Name:    name,
		Type:    pb.ChannelType(channelType),
	})
	if err != nil {
		return nil, err
	}
	return resp.Channel, nil
}

func (a *App) ListMembers(guildID string) ([]*pb.Member, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.ListMembers(ctx, &pb.ListMembersRequest{GuildId: guildID})
	if err != nil {
		return nil, err
	}
	return resp.Members, nil
}

// ============================================================
// Chat
// ============================================================

func (a *App) SendMessage(channelID, content string) (*pb.ChatMessage, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Chat.SendMessage(ctx, &pb.SendMessageRequest{
		ChannelId: channelID,
		Content:   content,
	})
	if err != nil {
		return nil, err
	}
	return resp.Message, nil
}

func (a *App) GetHistory(channelID string, limit int32, beforeMessageID string) ([]*pb.ChatMessage, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Chat.GetHistory(ctx, &pb.GetHistoryRequest{
		ChannelId:       channelID,
		Limit:           limit,
		BeforeMessageId: beforeMessageID,
	})
	if err != nil {
		return nil, err
	}
	return resp.Messages, nil
}

// SubscribeChannel подписывается на real-time сообщения канала.
// Новые сообщения эмитируются как Wails-события "chat:message" на фронтенд.
// Вызов автоматически отменяет предыдущую подписку (смена канала).
func (a *App) SubscribeChannel(channelID string) error {
	if err := a.requireReady(); err != nil {
		return err
	}

	// Отменяем старую подписку
	a.cancelSubscription()

	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()

	// Стриминг живёт дольше одного запроса — без таймаута
	streamCtx, cancel := context.WithCancel(context.Background())
	streamCtx = rpc.WithToken(streamCtx, token)

	a.subMu.Lock()
	a.subCancel = cancel
	a.subMu.Unlock()

	go func() {
		defer cancel()

		stream, err := a.client.Chat.SubscribeChannel(streamCtx, &pb.SubscribeChannelRequest{
			ChannelId: channelID,
		})
		if err != nil {
			runtime.LogErrorf(a.ctx, "SubscribeChannel: %v", err)
			runtime.EventsEmit(a.ctx, "chat:error", err.Error())
			return
		}

		runtime.LogInfof(a.ctx, "Subscribed to channel %s", channelID)

		for {
			event, err := stream.Recv()
			if err != nil {
				// Нормальное завершение при отмене контекста
				if streamCtx.Err() != nil {
					return
				}
				runtime.LogErrorf(a.ctx, "stream.Recv: %v", err)
				runtime.EventsEmit(a.ctx, "chat:error", err.Error())
				return
			}

			// Разбираем oneof payload
			switch p := event.Payload.(type) {
			case *pb.ChatEvent_MessageCreated:
				runtime.EventsEmit(a.ctx, "chat:message", p.MessageCreated)
			case *pb.ChatEvent_MessageDeleted:
				runtime.EventsEmit(a.ctx, "chat:message_deleted", p.MessageDeleted)
			}
		}
	}()

	return nil
}

// UnsubscribeChannel явно отменяет подписку (например при logout).
func (a *App) UnsubscribeChannel() {
	a.cancelSubscription()
}
