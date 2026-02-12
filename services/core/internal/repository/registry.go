package repository

import "gorm.io/gorm"

// Registry — контейнер всех репозиториев.
// Создаётся один раз в App (Composition Root) и передаётся в сервисы.
//
// Преимущества:
//   - Единая точка создания всех репозиториев
//   - Легко мокировать в тестах (можно подменить отдельный репозиторий)
//   - Явные зависимости без global state
//
// Использование в app.go:
//
//	repos := repository.NewRegistry(db)
//	authSvc := service.NewAuthService(repos.Users, cfg)
//	userSvc := service.NewUserService(repos.Users)
type Registry struct {
	Users UserRepository
	// TODO Phase 2:
	// Guilds   GuildRepository
	// Channels ChannelRepository
	// Messages MessageRepository
	// Members  MemberRepository
}

// NewRegistry создаёт все GORM-репозитории и упаковывает в Registry.
func NewRegistry(db *gorm.DB) *Registry {
	return &Registry{
		Users: NewUserRepository(db),
	}
}
