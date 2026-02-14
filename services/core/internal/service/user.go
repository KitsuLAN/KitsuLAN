package service

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
)

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*domain.User, error) {
	return s.repo.FindByID(ctx, userID)
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

	if len(fields) > 0 {
		if err := s.repo.Update(ctx, userID, fields); err != nil {
			return nil, err
		}
	}

	return s.repo.FindByID(ctx, userID)
}

// TODO: SearchUsers
