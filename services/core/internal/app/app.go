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
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	grpctransport "github.com/KitsuLAN/KitsuLAN/services/core/internal/transport/grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"gorm.io/gorm"
)

// App — корневая структура приложения.
// Хранит все зависимости верхнего уровня и управляет их жизненным циклом.
type App struct {
	cfg        *config.Config
	log        *slog.Logger
	db         *gorm.DB
	grpcServer *grpc.Server
	listener   net.Listener
}

// New создаёт и инициализирует приложение.
// Все зависимости создаются здесь и «проводятся» в нужные компоненты.
func New(cfg *config.Config, log *slog.Logger) (*App, error) {
	// --- 1. Database ---
	db, err := database.Connect(cfg, log)
	if err != nil {
		return nil, fmt.Errorf("database init: %w", err)
	}

	// --- 2. Services (бизнес-логика) ---
	authSvc := service.NewAuthService(db, cfg)

	// --- 3. gRPC Server с interceptors ---
	grpcServer := buildGRPCServer(cfg, log)

	// --- 4. Transport layer (регистрация gRPC handlers) ---
	pb.RegisterAuthServiceServer(grpcServer, grpctransport.NewAuthServer(authSvc))

	// Health check — стандартный протокол для k8s/Docker liveness probes
	healthSrv := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthSrv)
	healthSrv.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	healthSrv.SetServingStatus("kitsulan.v1.AuthService", healthpb.HealthCheckResponse_SERVING)

	// Reflection — позволяет grpcurl и BloomRPC самостоятельно
	// обнаружить методы сервера без .proto файлов (только в dev)
	if !cfg.IsProduction() {
		reflection.Register(grpcServer)
		log.Info("gRPC reflection enabled (development mode)")
	}

	// --- 5. TCP Listener ---
	lis, err := net.Listen("tcp", cfg.GRPCAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on %s: %w", cfg.GRPCAddr, err)
	}

	return &App{
		cfg:        cfg,
		log:        log,
		db:         db,
		grpcServer: grpcServer,
		listener:   lis,
	}, nil
}

// Run запускает gRPC сервер. Блокирует горутину до вызова Shutdown.
// Предназначен для запуска в отдельной горутине из main().
func (a *App) Run() error {
	a.log.Info("gRPC server starting", "addr", a.listener.Addr().String())
	if err := a.grpcServer.Serve(a.listener); err != nil {
		return fmt.Errorf("gRPC server error: %w", err)
	}
	return nil
}

// Shutdown выполняет graceful shutdown:
//  1. Останавливает gRPC сервер (ждёт завершения активных RPC, max 5s)
//  2. Закрывает соединение с БД
func (a *App) Shutdown(ctx context.Context) error {
	a.log.Info("shutting down gRPC server...")

	// GracefulStop ждёт завершения текущих запросов.
	// Используем канал чтобы уважать deadline из ctx.
	stopped := make(chan struct{})
	go func() {
		a.grpcServer.GracefulStop()
		close(stopped)
	}()

	select {
	case <-ctx.Done():
		a.log.Warn("graceful shutdown timeout exceeded, forcing stop")
		a.grpcServer.Stop()
	case <-stopped:
		a.log.Info("gRPC server stopped gracefully")
	}

	// Закрываем БД
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

// buildGRPCServer создаёт gRPC сервер с цепочкой interceptors.
// Порядок interceptors важен: Recovery → Auth → Logging
// (Recovery должен быть самым внешним, чтобы поймать панику в других).
func buildGRPCServer(cfg *config.Config, log *slog.Logger) *grpc.Server {
	// Cепаратор для логгеров компонентов
	mwLog := log.With("component", "middleware")

	return grpc.NewServer(
		// Unary interceptors (для обычных RPC)
		grpc.ChainUnaryInterceptor(
			middleware.UnaryRecovery(mwLog),
			middleware.UnaryAuth(cfg.JWTSecret),
			middleware.UnaryLogging(mwLog),
		),
		// Stream interceptors (для gRPC streams, Phase 2+)
		grpc.ChainStreamInterceptor(
			middleware.StreamRecovery(mwLog),
		),
	)
}
