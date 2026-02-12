package service

import (
	"context"
	"strings"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// --- Repository interface ---
// Определяем минимальный интерфейс для доступа к данным пользователей.
// В Phase 1 реализация — прямой GORM, в будущем можно подменить на SQL-репозиторий.

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	FindByID(ctx context.Context, id string) (*domain.User, error)
}

// --- JWT Claims ---

type AuthClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// --- Service ---

type AuthService struct {
	repo UserRepository
	cfg  *config.Config
}

// NewAuthService создаёт сервис авторизации.
// Принимает GORM db и оборачивает его в встроенный репозиторий.
func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{
		repo: &gormUserRepo{db: db},
		cfg:  cfg,
	}
}

// Register создаёт нового пользователя. Возвращает UserID при успехе.
func (s *AuthService) Register(ctx context.Context, username, password string) (string, error) {
	// Валидация
	if err := validateCredentials(username, password); err != nil {
		return "", err
	}

	// Хешируем пароль
	hashedPass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", domainerr.Wrap(domainerr.ErrInternal, "failed to hash password")
	}

	user := &domain.User{
		Username:     strings.TrimSpace(username),
		PasswordHash: string(hashedPass),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		// Проверяем конфликт уникальности (username уже занят)
		if isUniqueConstraintError(err) {
			return "", domainerr.ErrUsernameConflict
		}
		return "", domainerr.Wrap(domainerr.ErrInternal, err.Error())
	}

	return user.ID.String(), nil
}

// Login проверяет credentials и возвращает пару токенов.
func (s *AuthService) Login(ctx context.Context, username, password string) (accessToken, refreshToken string, err error) {
	user, err := s.repo.FindByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		// Не раскрываем, какого именно пользователя нет
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

// RefreshToken валидирует refresh token и выдаёт новый access token.
func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (string, string, error) {
	userID, err := s.validateToken(refreshTokenStr)
	if err != nil {
		return "", "", domainerr.ErrTokenInvalid
	}

	// Проверяем что пользователь ещё существует
	if _, err := s.repo.FindByID(ctx, userID); err != nil {
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

func isUniqueConstraintError(err error) bool {
	msg := err.Error()
	// Postgres: "duplicate key value violates unique constraint"
	// SQLite: "UNIQUE constraint failed"
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "UNIQUE constraint failed") ||
		strings.Contains(msg, "unique constraint")
}

// --- GORM repository implementation ---

type gormUserRepo struct {
	db *gorm.DB
}

func (r *gormUserRepo) Create(ctx context.Context, user *domain.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *gormUserRepo) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error; err != nil {
		if domainerr.Is(err, gorm.ErrRecordNotFound) {
			return nil, domainerr.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *gormUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		if domainerr.Is(err, gorm.ErrRecordNotFound) {
			return nil, domainerr.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}
