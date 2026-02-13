package main

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/KitsuLAN/KitsuLAN/client/internal/rpc"
	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
)

type App struct {
	ctx    context.Context
	client *rpc.Client
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
	a.client.Close()
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
	a.client.Close()
	a.client = newClient
	return true, nil
}

func (a *App) Register(username, password string) (string, error) {
	if !a.client.IsReady() {
		return "", errors.New("server unavailable")
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
	return resp.AccessToken, nil
}
