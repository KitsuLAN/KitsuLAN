// Package repository определяет интерфейсы доступа к данным (порты)
// и их GORM-реализации (адаптеры).
//
// Архитектурное правило:
//   - Интерфейсы — в этом пакете (единственный источник правды)
//   - Service-слой импортирует интерфейсы отсюда
//   - App-слой создаёт реализации и передаёт через конструкторы
//
// Добавление нового репозитория:
//  1. Описать интерфейс здесь (interfaces.go)
//  2. Создать файл реализации user.go → guild.go → message.go и т.д.
//  3. Зарегистровать в Registry (registry.go)
package repository

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
)

// UserRepository — контракт доступа к данным пользователей.
// Все методы принимают context для поддержки таймаутов и трассировки.
type UserRepository interface {
	// Create сохраняет нового пользователя. ID генерируется в BeforeCreate.
	Create(ctx context.Context, user *domain.User) error

	// FindByID возвращает пользователя по UUID. Ошибка errors.ErrUserNotFound если не найден.
	FindByID(ctx context.Context, id string) (*domain.User, error)

	// FindByUsername возвращает пользователя по username.
	FindByUsername(ctx context.Context, username string) (*domain.User, error)

	// FindByEmail возвращает пользователя по email.
	FindByEmail(ctx context.Context, email string) (*domain.User, error)

	// Update обновляет изменяемые поля пользователя (username, avatar_url и т.д.).
	// Использует GORM Save только для переданных полей через map.
	Update(ctx context.Context, id string, fields map[string]any) error

	// Delete выполняет soft-delete (GORM DeletedAt).
	Delete(ctx context.Context, id string) error

	// Search ищет пользователей по username (LIKE). Limit — максимальное количество результатов.
	Search(ctx context.Context, query string, limit int) ([]domain.User, error)

	// ExistsByUsername проверяет занятость username без полной загрузки записи.
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

// TODO Phase 2:
// GuildRepository interface { ... }
// ChannelRepository interface { ... }
// MessageRepository interface { ... }
// MemberRepository interface { ... }
