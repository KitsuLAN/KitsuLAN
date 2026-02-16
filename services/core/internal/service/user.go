package service

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/cachemodel"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/infra/cache"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	"github.com/google/uuid"
)

type UserService struct {
	repo  repository.UserRepository
	cache *cache.Manager[cachemodel.UserCacheDTO]
}

func NewUserService(repo repository.UserRepository, provider *cache.Provider) *UserService {
	return &UserService{
		repo:  repo,
		cache: cache.NewManager[cachemodel.UserCacheDTO](provider, "users"),
	}
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*domain.User, error) {
	dto, err := s.cache.GetOrSet(ctx, userID, func() (*cachemodel.UserCacheDTO, error) {
		// --- ЭТА ФУНКЦИЯ ВЫПОЛНЯЕТСЯ ТОЛЬКО ЕСЛИ НЕТ В КЭШЕ ---

		// 1. Идем в репозиторий
		u, err := s.repo.FindByID(ctx, userID)
		if err != nil {
			return nil, err
		}

		// 2. Маппим Domain Model -> Cache DTO
		return &cachemodel.UserCacheDTO{
			ID:        u.ID.String(),
			Username:  u.Username,
			AvatarURL: u.AvatarURL,
		}, nil
	})

	if err != nil {
		return nil, err
	}

	// 3. Маппим Cache DTO -> Domain Model (для ответа)
	// Важно: парсим UUID обратно, т.к. в DTO храним string
	id, _ := uuid.Parse(dto.ID)

	return &domain.User{
		ID:        id,
		Username:  dto.Username,
		AvatarURL: dto.AvatarURL,
		// Поля, которых нет в кэше, оставляем пустыми или заполняем дефолтами
		// IsOnline: calculated elsewhere
	}, nil
}

func (s *UserService) UpdateProfile(ctx context.Context, userID string, nickname, bio, avatar *string) (*domain.User, error) {
	fields := make(map[string]any)

	// Обновляем только то, что пришло (не nil)
	if nickname != nil {
		// Пока что nickname меняет username, в будущем можно разделить
		fields["username"] = *nickname
	}
	if bio != nil {
		fields["bio"] = *bio
	}
	if avatar != nil {
		fields["avatar_url"] = *avatar
	}

	// Если есть изменения — пишем в БД
	if len(fields) > 0 {
		if err := s.repo.Update(ctx, userID, fields); err != nil {
			return nil, err
		}
		// Инвалидируем кеш
		_ = s.cache.Invalidate(ctx, userID)
	}

	// Получаем свежий профиль и прогреваем кэш
	return s.repo.FindByID(ctx, userID)
}

// TODO: SearchUsers
