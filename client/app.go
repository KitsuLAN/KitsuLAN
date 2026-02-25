package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/KitsuLAN/KitsuLAN/client/internal/rpc"
	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"google.golang.org/grpc/status"
)

type App struct {
	ctx    context.Context
	client *rpc.Client

	// State
	mu          sync.RWMutex
	accessToken string
	currentHost string

	// Subscription control
	subMu     sync.Mutex
	subCancel context.CancelFunc
	activeCh  string // ID текущего канала, чтобы не переподписываться зря
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	runtime.LogInfo(ctx, ">>> KitsuLAN Client Started")
}

func (a *App) shutdown(ctx context.Context) {
	a.cancelSubscription()
	if a.client != nil {
		a.client.Close()
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────

func (a *App) authCtx() (context.Context, context.CancelFunc) {
	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()

	// Тайм-аут 5 секунд для большинства запросов — хороший UX
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	return rpc.WithToken(ctx, token), cancel
}

func (a *App) setToken(token string) {
	a.mu.Lock()
	a.accessToken = token
	a.mu.Unlock()
}

func (a *App) requireReady() error {
	if a.client == nil || !a.client.IsReady() {
		return errors.New("[NET_ERR] Connection lost or not initialized")
	}
	return nil
}

// wrapErr форматирует ошибки gRPC для фронтенда
func (a *App) wrapErr(err error) error {
	if err == nil {
		return nil
	}
	st, ok := status.FromError(err)
	if !ok {
		return err // Обычная ошибка
	}
	// Формат: [CODE] Message
	return fmt.Errorf("[%s] %s", st.Code().String(), st.Message())
}

// ─── System & Network ────────────────────────────────────────────────

func (a *App) CheckServerStatus() bool {
	return a.client != nil && a.client.IsReady()
}

func (a *App) ConnectToServer(addr string) (bool, error) {
	a.mu.Lock()
	// Если мы уже подключены к этому адресу и соединение живо — не переподключаемся
	if a.client != nil && a.currentHost == addr && a.client.IsReady() {
		a.mu.Unlock()
		return true, nil
	}
	a.mu.Unlock()

	// Закрываем старое
	if a.client != nil {
		a.cancelSubscription()
		a.client.Close()
	}

	newClient := rpc.NewClient(addr)
	runtime.LogInfof(a.ctx, "Connecting to %s...", addr)

	if err := newClient.Connect(); err != nil {
		runtime.LogError(a.ctx, "Connection failed: "+err.Error())
		return false, a.wrapErr(err)
	}

	a.mu.Lock()
	a.client = newClient
	a.currentHost = addr
	a.mu.Unlock()

	runtime.LogInfo(a.ctx, "Connection established")
	return true, nil
}

func (a *App) PingServer(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		host = addr
	}
	// Хардкод порта HealthCheck (обычно gRPC порт + 1 или /healthz)
	// В данном случае предполагаем HTTP health check на порту 8091 (как в app.go ранее)
	healthAddr := fmt.Sprintf("http://%s:8091/healthz", host)

	client := http.Client{Timeout: 1500 * time.Millisecond}
	resp, err := client.Get(healthAddr)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

// ─── Authentication ──────────────────────────────────────────────────

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
		return "", a.wrapErr(err)
	}
	return resp.UserId, nil
}

func (a *App) Login(username, password string) (string, error) {
	if err := a.requireReady(); err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := a.client.Auth.Login(ctx, &pb.LoginRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		return "", a.wrapErr(err)
	}

	a.setToken(resp.AccessToken)
	return resp.AccessToken, nil
}

func (a *App) SetToken(token string) {
	a.setToken(token)
}

// ─── Guilds & Channels ───────────────────────────────────────────────

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
	return resp.GetGuild(), a.wrapErr(err)
}

func (a *App) ListMyGuilds() ([]*pb.Guild, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.ListMyGuilds(ctx, &pb.ListMyGuildsRequest{})
	if err != nil {
		return nil, a.wrapErr(err)
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
		return "", a.wrapErr(err)
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
		return nil, a.wrapErr(err)
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
	return a.wrapErr(err)
}

func (a *App) DeleteGuild(guildID string) error {
	if err := a.requireReady(); err != nil {
		return err
	}
	ctx, cancel := a.authCtx()
	defer cancel()
	_, err := a.client.Guild.DeleteGuild(ctx, &pb.DeleteGuildRequest{GuildId: guildID})
	return a.wrapErr(err)
}

func (a *App) ListChannels(guildID string) ([]*pb.Channel, error) {
	if err := a.requireReady(); err != nil {
		return nil, err
	}
	ctx, cancel := a.authCtx()
	defer cancel()

	resp, err := a.client.Guild.ListChannels(ctx, &pb.ListChannelsRequest{GuildId: guildID})
	if err != nil {
		return nil, a.wrapErr(err)
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
		return nil, a.wrapErr(err)
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
		return nil, a.wrapErr(err)
	}
	return resp.Members, nil
}

// ─── Chat & Streaming ───────────────────────────────────────────────

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
		return nil, a.wrapErr(err)
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
		return nil, a.wrapErr(err)
	}
	return resp.Messages, nil
}

// SubscribeChannel — Ключевая функция для real-time чата
func (a *App) SubscribeChannel(channelID string) error {
	if err := a.requireReady(); err != nil {
		return err
	}

	a.subMu.Lock()
	// Если уже подписаны на этот же канал, ничего не делаем (избегаем мигания)
	if a.activeCh == channelID && a.subCancel != nil {
		a.subMu.Unlock()
		return nil
	}
	// Если это смена канала — отменяем старую подписку
	if a.subCancel != nil {
		a.subCancel()
	}
	a.activeCh = channelID
	a.subMu.Unlock()

	// Получаем токен под блокировкой
	a.mu.RLock()
	token := a.accessToken
	a.mu.RUnlock()

	// Создаем контекст стрима, который живет пока мы не сменим канал
	streamCtx, cancel := context.WithCancel(context.Background())
	streamCtx = rpc.WithToken(streamCtx, token)

	a.subMu.Lock()
	a.subCancel = cancel
	a.subMu.Unlock()

	// Запускаем стриминг в горутине
	go a.runChatStream(streamCtx, channelID)

	return nil
}

func (a *App) runChatStream(ctx context.Context, channelID string) {
	runtime.LogInfof(a.ctx, "STREAM :: Subscribing to %s", channelID)

	stream, err := a.client.Chat.SubscribeChannel(ctx, &pb.SubscribeChannelRequest{
		ChannelId: channelID,
	})
	if err != nil {
		runtime.LogErrorf(a.ctx, "STREAM :: Init failed: %v", err)
		runtime.EventsEmit(a.ctx, "chat:error", "STREAM_INIT_FAILED")
		return
	}

	for {
		// Блокирующее чтение
		event, err := stream.Recv()
		if err != nil {
			// Если контекст отменен нами (смена канала), выходим молча
			if errors.Is(ctx.Err(), context.Canceled) {
				runtime.LogInfof(a.ctx, "STREAM :: Closed locally (%s)", channelID)
				return
			}

			// Если ошибка сервера (EOF или разрыв), логируем
			if err == io.EOF {
				runtime.LogInfof(a.ctx, "STREAM :: Server closed connection")
			} else {
				runtime.LogErrorf(a.ctx, "STREAM :: Error: %v", err)
			}

			// Сообщаем фронту, что связь потеряна
			runtime.EventsEmit(a.ctx, "chat:error", "STREAM_DISCONNECTED")
			return
		}

		// Обработка событий
		switch p := event.Payload.(type) {
		case *pb.ChatEvent_MessageCreated:
			// Wails автоматически маршалит Go-структуры в JSON
			runtime.EventsEmit(a.ctx, "chat:message", p.MessageCreated)
		case *pb.ChatEvent_MessageDeleted:
			runtime.EventsEmit(a.ctx, "chat:message_deleted", p.MessageDeleted)
		}
	}
}

func (a *App) UnsubscribeChannel() {
	a.cancelSubscription()
}

func (a *App) cancelSubscription() {
	a.subMu.Lock()
	defer a.subMu.Unlock()
	if a.subCancel != nil {
		a.subCancel()
		a.subCancel = nil
	}
	a.activeCh = ""
}

// ─── Realm Management ────────────────────────────────────────────────

func (a *App) GetRealmStatus() (map[string]any, error) {
	// Здесь не используем requireReady, т.к. этот метод может вызываться ДО авторизации
	if a.client == nil || !a.client.IsReady() {
		return nil, fmt.Errorf("server_unreachable")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Если здесь a.client.Realm == nil, значит Connect() еще не отработал полностью
	if a.client.Realm == nil {
		return nil, fmt.Errorf("realm client not initialized")
	}

	resp, err := a.client.Realm.GetRealmStatus(ctx, &pb.GetRealmStatusRequest{})
	if err != nil {
		return nil, a.wrapErr(err)
	}

	return map[string]any{
		"is_initialized": resp.IsInitialized,
		"version":        resp.Version,
	}, nil
}

func (a *App) SetupRealm(domain, name string) (map[string]any, error) {
	// Setup можно вызывать без токена (обычно) на чистом инстансе
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := a.client.Realm.SetupRealm(ctx, &pb.SetupRealmRequest{
		Domain:      domain,
		DisplayName: name,
	})
	if err != nil {
		return nil, a.wrapErr(err)
	}
	return map[string]any{
		"realm_id":   resp.RealmId,
		"public_key": resp.PublicKey,
	}, nil
}
