package app

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/database"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/hub"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/infra/cache"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/middleware"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	grpctransport "github.com/KitsuLAN/KitsuLAN/services/core/internal/transport/grpc"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/sync/errgroup"
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
	cacheProvider *cache.Provider

	// Серверы
	grpcServer   *grpc.Server
	healthServer *http.Server
	metricServer *http.Server

	// Слушатели (создаем заранее, чтобы знать порт при старте)
	grpcListener net.Listener
}

// New собирает граф зависимостей по слоям:
//
//	Database → Repository → Service → Transport → gRPC Server
func New(cfg *config.Config, log *slog.Logger) (*App, error) {
	// 1. Инфраструктура (БД, Кеш)
	db, err := database.Connect(cfg, log)
	if err != nil {
		return nil, fmt.Errorf("database init: %w", err)
	}

	cacheProvider, err := cache.NewProvider(cfg)
	if err != nil {
		return nil, fmt.Errorf("cache init: %w", err)
	}

	// 2. Бизнес-логика (Репозитории, Сервисы)
	services := initServices(db, cfg, cacheProvider)

	// 3. gRPC Сервер
	grpcSrv, err := initGRPCServer(cfg, log, services)
	if err != nil {
		return nil, fmt.Errorf("grpc init: %w", err)
	}

	// Подготавливаем листенер сразу, чтобы если порт занят — упасть сразу в New
	lis, err := net.Listen("tcp", cfg.ListenAddr+cfg.PublicApiPort)
	if err != nil {
		return nil, fmt.Errorf("failed to listen grpc: %w", err)
	}

	// 4. HTTP Servers (Metrics & Health)
	healthSrv := initHealthServer(cfg)
	metricSrv := initMetricServer(cfg)

	return &App{
		cfg:           cfg,
		log:           log,
		db:            db,
		cacheProvider: cacheProvider,
		grpcServer:    grpcSrv,
		grpcListener:  lis,
		healthServer:  healthSrv,
		metricServer:  metricSrv,
	}, nil
}

// Run запускает все серверы параллельно через errgroup.
// Блокирует выполнение до отмены контекста (SIGINT) или ошибки одного из серверов.
func (a *App) Run(ctx context.Context) error {
	g, ctx := errgroup.WithContext(ctx)

	// --- 1. gRPC Server ---
	g.Go(func() error {
		a.log.Info("gRPC server started", "addr", a.grpcListener.Addr().String())
		if err := a.grpcServer.Serve(a.grpcListener); err != nil {
			return err
		}
		return nil
	})
	// Graceful Stop для gRPC
	g.Go(func() error {
		<-ctx.Done() // Ждем сигнала отмены
		a.log.Info("gRPC server stopping...")
		a.grpcServer.GracefulStop()
		return nil
	})

	// --- 2. Metrics Server ---
	g.Go(func() error {
		a.log.Info("metrics server started", "addr", a.metricServer.Addr)
		if err := a.metricServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			return err
		}
		return nil
	})
	// Graceful Stop для Metrics
	g.Go(func() error {
		<-ctx.Done()
		a.log.Info("metrics server stopping...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return a.metricServer.Shutdown(shutdownCtx)
	})

	// --- 3. Health Server ---
	g.Go(func() error {
		a.log.Info("health server started", "addr", a.healthServer.Addr)
		if err := a.healthServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	})
	// Graceful Stop для Health
	g.Go(func() error {
		<-ctx.Done()
		a.log.Info("health server stopping...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return a.healthServer.Shutdown(shutdownCtx)
	})

	// Ждем завершения всех горутин
	err := g.Wait()

	// После остановки серверов закрываем подключения к БД и Кешу
	a.closeResources()

	return err
}

func (a *App) closeResources() {
	a.log.Info("closing resources...")
	if err := a.cacheProvider.Close(); err != nil {
		a.log.Error("failed to close cache", "error", err)
	}

	sqlDB, err := a.db.DB()
	if err == nil {
		_ = sqlDB.Close()
	}
}

// --- Helpers ---

type serviceDeps struct {
	auth  *service.AuthService
	user  *service.UserService
	guild *service.GuildService
	chat  *service.ChatService
}

func initServices(db *gorm.DB, cfg *config.Config, cp *cache.Provider) *serviceDeps {
	repos := repository.NewRegistry(db)
	tm := database.NewTransactionManager(db)
	chatHub := hub.New()

	return &serviceDeps{
		auth:  service.NewAuthService(repos.Users, cfg),
		user:  service.NewUserService(repos.Users, cp),
		guild: service.NewGuildService(repos.Guilds, repos.Channels, tm),
		chat:  service.NewChatService(repos.Messages, repos.Channels, repos.Guilds, chatHub),
	}
}

func initGRPCServer(cfg *config.Config, log *slog.Logger, s *serviceDeps) (*grpc.Server, error) {
	mwLog := log.With("component", "middleware")
	grpcServer := grpc.NewServer(
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

	pb.RegisterAuthServiceServer(grpcServer, grpctransport.NewAuthServer(s.auth))
	pb.RegisterUserServiceServer(grpcServer, grpctransport.NewUserServer(s.user))
	pb.RegisterGuildServiceServer(grpcServer, grpctransport.NewGuildServer(s.guild))
	pb.RegisterChatServiceServer(grpcServer, grpctransport.NewChatServer(s.chat))

	// Health Check gRPC
	healthSrv := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthSrv)
	healthSrv.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	if !cfg.IsProduction() {
		reflection.Register(grpcServer)
	}

	return grpcServer, nil
}

func initHealthServer(cfg *config.Config) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	return &http.Server{
		Addr:    cfg.ListenAddr + cfg.HealthPort,
		Handler: mux,
	}
}

func initMetricServer(cfg *config.Config) *http.Server {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	return &http.Server{
		Addr:    cfg.ListenAddr + cfg.MetricsPort,
		Handler: mux,
	}
}
