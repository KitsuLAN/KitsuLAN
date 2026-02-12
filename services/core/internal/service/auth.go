package service

import (
	"context"
	"strings"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/repository"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// --- JWT Claims ---

type AuthClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// --- Service ---

type AuthService struct {
	users repository.UserRepository
	cfg   *config.Config
}

// NewAuthService создаёт сервис авторизации.
func NewAuthService(users repository.UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{users: users, cfg: cfg}
}

// Register создаёт нового пользователя. Возвращает UserID при успехе.
func (s *AuthService) Register(ctx context.Context, username, password string) (string, error) {
	if err := validateCredentials(username, password); err != nil {
		return "", err
	}

	// Ранняя проверка занятости username (до хеширования пароля)
	exists, err := s.users.ExistsByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		return "", domainerr.Wrap(domainerr.ErrInternal, "failed to check username availability")
	}
	if exists {
		return "", domainerr.ErrUsernameConflict
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", domainerr.Wrap(domainerr.ErrInternal, "failed to hash password")
	}

	user := &domain.User{
		Username:     strings.TrimSpace(username),
		PasswordHash: string(hashedPass),
	}

	if err := s.users.Create(ctx, user); err != nil {
		return "", err // репозиторий уже возвращает доменную ошибку
	}

	return user.ID.String(), nil
}

// Login проверяет credentials и возвращает пару access/refresh токенов.
func (s *AuthService) Login(ctx context.Context, username, password string) (accessToken, refreshToken string, err error) {
	user, err := s.users.FindByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		// Намеренно не раскрываем детали — возвращаем единую ошибку
		return "", "", domainerr.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", "", domainerr.ErrInvalidCredentials
	}

	accessToken, err = s.generateToken(user.ID.String(), s.cfg.JWTAccessTokenTTL)
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate access token")
	}

	refreshToken, err = s.generateToken(user.ID.String(), s.cfg.JWTRefreshTokenTTL)
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate refresh token")
	}

	return accessToken, refreshToken, nil
}

// RefreshToken валидирует refresh token и выдаёт новую пару токенов.
func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (string, string, error) {
	userID, err := s.validateToken(refreshTokenStr)
	if err != nil {
		return "", "", domainerr.ErrTokenInvalid
	}

	if _, err := s.users.FindByID(ctx, userID); err != nil {
		return "", "", domainerr.ErrUserNotFound
	}

	newAccess, err := s.generateToken(userID, s.cfg.JWTAccessTokenTTL)
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate access token")
	}

	newRefresh, err := s.generateToken(userID, s.cfg.JWTRefreshTokenTTL)
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate refresh token")
	}

	return newAccess, newRefresh, nil
}

// --- Private helpers ---

func (s *AuthService) generateToken(userID string, ttl time.Duration) (string, error) {
	claims := AuthClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "kitsulan-core",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) validateToken(tokenStr string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domainerr.ErrTokenInvalid
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", domainerr.ErrTokenInvalid
	}

	claims, ok := token.Claims.(*AuthClaims)
	if !ok || claims.UserID == "" {
		return "", domainerr.ErrTokenInvalid
	}

	return claims.UserID, nil
}

func validateCredentials(username, password string) error {
	username = strings.TrimSpace(username)
	if len(username) < 3 {
		return domainerr.Wrap(domainerr.ErrInvalidArgument, "username must be at least 3 characters")
	}
	if len(username) > 32 {
		return domainerr.Wrap(domainerr.ErrInvalidArgument, "username must be at most 32 characters")
	}
	if len(password) < 8 {
		return domainerr.Wrap(domainerr.ErrInvalidArgument, "password must be at least 8 characters")
	}
	return nil
}
