// Package app отвечает за сборку, инициализацию и управление
// жизненным циклом сервиса KitsuLAN Core.
//
// Паттерн: Composition Root — все зависимости создаются здесь и явно
// передаются «вниз» по дереву (dependency injection вручную, без framework).
package app

import (
	"context"
	"fmt"
	"log/slog"
	"net"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/hub"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/infra/cache"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	grpctransport "github.com/KitsuLAN/KitsuLAN/services/core/internal/transport/grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"gorm.io/gorm"
)

// App — корневая структура приложения.
type App struct {
	cfg           *config.Config
	log           *slog.Logger
	db            *gorm.DB
	grpcServer    *grpc.Server
	listener      net.Listener
	cacheProvider *cache.Provider
}

// New собирает граф зависимостей по слоям:
//
//	Database → Repository → Service → Transport → gRPC Server
func New(cfg *config.Config, log *slog.Logger) (*App, error) {
	// 1. Database
	db, err := database.Connect(cfg, log)
	if err != nil {
		return nil, fmt.Errorf("database init: %w", err)
	}

	cacheProvider, err := cache.NewProvider(cfg)
	if err != nil {
		return nil, fmt.Errorf("cache init: %w", err)
	}

	// 2. Repositories (адаптеры к БД)
	repos := repository.NewRegistry(db)
	// Инициализируем менеджер транзакций
	tm := database.NewTransactionManager(db)

	// 3. Services (бизнес-логика)
	authSvc := service.NewAuthService(repos.Users, cfg)
	userSvc := service.NewUserService(repos.Users, cacheProvider)
	guildSvc := service.NewGuildService(repos.Guilds, repos.Channels, tm)
	chatHub := hub.New()
	chatSvc := service.NewChatService(repos.Messages, repos.Channels, repos.Guilds, chatHub)

	// 4. gRPC Server
	grpcServer := buildGRPCServer(cfg, log)

	// 5. Transport handlers
	pb.RegisterAuthServiceServer(grpcServer, grpctransport.NewAuthServer(authSvc))
	pb.RegisterUserServiceServer(grpcServer, grpctransport.NewUserServer(userSvc))
	pb.RegisterGuildServiceServer(grpcServer, grpctransport.NewGuildServer(guildSvc))
	pb.RegisterChatServiceServer(grpcServer, grpctransport.NewChatServer(chatSvc))

	// Health Check (стандартный протокол для Docker / k8s)
	healthSrv := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthSrv)
	healthSrv.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthSrv.SetServingStatus("kitsulan.v1.AuthService", healthpb.HealthCheckResponse_SERVING)
	healthSrv.SetServingStatus("kitsulan.v1.GuildService", healthpb.HealthCheckResponse_SERVING)
	healthSrv.SetServingStatus("kitsulan.v1.ChatService", healthpb.HealthCheckResponse_SERVING)

	// gRPC Reflection — только в development (позволяет grpcurl без .proto)
	if !cfg.IsProduction() {
		reflection.Register(grpcServer)
		log.Info("gRPC reflection enabled (development mode)")
	}

	// 6. TCP Listener
	lis, err := net.Listen("tcp", cfg.GRPCAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on %s: %w", cfg.GRPCAddr, err)
	}

	return &App{
		cfg:           cfg,
		log:           log,
		db:            db,
		grpcServer:    grpcServer,
		listener:      lis,
		cacheProvider: cacheProvider,
	}, nil
}

// Run запускает gRPC сервер. Блокирует до вызова Shutdown.
func (a *App) Run() error {
	a.log.Info("gRPC server starting", "addr", a.listener.Addr().String())
	if err := a.grpcServer.Serve(a.listener); err != nil {
		return fmt.Errorf("gRPC server error: %w", err)
	}
	return nil
}

// Shutdown выполняет graceful shutdown: ждёт завершения RPC, закрывает БД.
func (a *App) Shutdown(ctx context.Context) error {
	a.log.Info("shutting down gRPC server...")

	stopped := make(chan struct{})
	go func() {
		a.grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-ctx.Done():
		a.log.Warn("graceful shutdown timeout, forcing stop")
		a.grpcServer.Stop()
	case <-stopped:
		a.log.Info("gRPC server stopped gracefully")
	}

	if err := a.cacheProvider.Close(); err != nil {
		a.log.Error("failed to close cache provider", "error", err)
	}

	sqlDB, err := a.db.DB()
	if err == nil {
		if closeErr := sqlDB.Close(); closeErr != nil {
			a.log.Error("failed to close database", "error", closeErr)
		} else {
			a.log.Info("database connection closed")
		}
	}

	return nil
}

func buildGRPCServer(cfg *config.Config, log *slog.Logger) *grpc.Server {
	mwLog := log.With("component", "middleware")
	return grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			middleware.UnaryRecovery(mwLog),
			middleware.UnaryAuth(cfg.JWTSecret),
			middleware.UnaryLogging(mwLog),
		),
		grpc.ChainStreamInterceptor(
			middleware.StreamRecovery(mwLog),
			middleware.StreamAuth(cfg.JWTSecret),
		),
	)
}
