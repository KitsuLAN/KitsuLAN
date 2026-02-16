// KitsuLAN Core Service — точка входа.
//
// Порядок запуска:
//  1. Загружаем конфигурацию (env / .env файл)
//  2. Инициализируем структурированный логгер
//  3. Собираем приложение (App) со всеми зависимостями
//  4. Запускаем gRPC сервер в отдельной горутине
//  5. Ожидаем сигнала завершения (SIGINT / SIGTERM)
//  6. Выполняем graceful shutdown с таймаутом
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/app"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// --- 1. Config ---
	cfg, err := config.Load()
	if err != nil {
		// Логгер ещё не инициализирован — используем slog.Default()
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// --- 2. Logger ---
	log := logger.New(cfg.Env)
	log.Info("KitsuLAN Core Service starting",
		"env", cfg.Env,
		"grpc_addr", cfg.GRPCAddr,
		"db_driver", cfg.DBDriver,
	)

	// --- 3. Application (Composition Root) ---
	application, err := app.New(cfg, log)
	if err != nil {
		log.Error("failed to initialize application", "error", err)
		os.Exit(1)
	}

	// --- 4. Run gRPC server (non-blocking) ---
	serverErrors := make(chan error, 1)
	go func() {
		if err := application.Run(); err != nil {
			serverErrors <- err
		}
	}()
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())

		log.Info("metrics server starting", "addr", cfg.MetricsPort)
		if err := http.ListenAndServe("0.0.0.0:"+cfg.MetricsPort, mux); err != nil {
			log.Error("metrics server failed", "error", err)
		}
	}()

	// --- 5. Health endpoint (опционально, для Docker/k8s HEALTHCHECK) ---
	// Простой HTTP /healthz на отдельном порту
	healthMux := http.NewServeMux()
	healthMux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	healthServer := &http.Server{
		Addr:    ":" + cfg.HealthPort,
		Handler: healthMux,
	}
	go func() {
		if err := healthServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Warn("health server stopped", "error", err)
		}
	}()
	log.Info("health endpoint started", "addr", ":8091/healthz")

	// --- 6. Wait for shutdown signal ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		log.Error("server error, initiating shutdown", "error", err)
	case sig := <-quit:
		log.Info("received shutdown signal", "signal", sig.String())
	}

	// --- 7. Graceful Shutdown ---
	log.Info("starting graceful shutdown...")

	// Даём 10 секунд на завершение активных запросов
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Останавливаем health server
	if err := healthServer.Shutdown(shutdownCtx); err != nil {
		log.Warn("health server shutdown error", "error", err)
	}

	// Останавливаем gRPC сервер + закрываем БД
	if err := application.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown error", "error", err)
		os.Exit(1)
	}

	log.Info("KitsuLAN Core Service stopped gracefully")
}
