package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/app"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
)

func main() {
	// 1. Config & Logger
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}
	log := logger.New(cfg.Env)

	// 2. Создаем контекст, который отменится при SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 3. Init Application
	a, err := app.New(cfg, log)
	if err != nil {
		log.Error("failed to init app", "error", err)
		os.Exit(1)
	}

	// 4. Run (блокирует выполнение, пока не придет сигнал или ошибка)
	log.Info("application starting...")
	if err := a.Run(ctx); err != nil {
		log.Error("application execution failed", "error", err)
		os.Exit(1)
	}

	log.Info("application stopped gracefully")
}
