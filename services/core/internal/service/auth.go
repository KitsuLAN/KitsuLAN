package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type userRepo interface {
	// Create сохраняет нового пользователя. ID генерируется в BeforeCreate.
	Create(ctx context.Context, user *domain.User) error

	// FindByID возвращает пользователя по UUID. Ошибка errors.ErrUserNotFound если не найден.
	FindByID(ctx context.Context, id string) (*domain.User, error)

	// FindByUsername возвращает пользователя по username.
	FindByUsername(ctx context.Context, username string) (*domain.User, error)

	// ExistsByUsername проверяет занятость username без полной загрузки записи.
	ExistsByUsername(ctx context.Context, username string) (bool, error)
}

// --- Service ---

type AuthService struct {
	users userRepo
	cfg   *config.Config
}

// NewAuthService создаёт сервис авторизации.
func NewAuthService(users userRepo, cfg *config.Config) *AuthService {
	return &AuthService{users: users, cfg: cfg}
}

// Register создаёт нового пользователя. Возвращает UserID при успехе.
func (s *AuthService) Register(ctx context.Context, username, password string) (string, error) {
	log := logger.FromContext(ctx)
	log.Info("attempting registration", "username", username)

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
	log := logger.FromContext(ctx)

	user, err := s.users.FindByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		log.Warn("login failed: user not found", "username", username, "error", err)
		return "", "", domainerr.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		log.Warn("login failed: invalid password", "username", username)
		return "", "", domainerr.ErrInvalidCredentials
	}

	sessionID := uuid.NewString()
	userID := user.ID.String()
	now := time.Now()

	accessToken, err = s.generateToken(userID, sessionID, domain.JwtTokenTypeAccess, s.cfg.JWTAccessTokenTTL, nil, "")
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate access token")
	}

	refreshToken, err = s.generateToken(userID, sessionID, domain.JwtTokenTypeRefresh, s.cfg.JWTRefreshTokenTTL, &now, "")
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate refresh token")
	}

	log.Info("user logged in", "user_id", userID, "session_id", sessionID)
	return accessToken, refreshToken, nil
}

// RefreshToken валидирует refresh token и выдаёт новую пару токенов.
func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (string, string, error) {
	log := logger.FromContext(ctx)

	// 1. Валидируем старый токен и получаем его Claims
	oldClaims, err := s.validateToken(refreshTokenStr)
	if err != nil {
		return "", "", err
	}

	if oldClaims.TokenType != domain.JwtTokenTypeRefresh {
		return "", "", domainerr.ErrTokenInvalid
	}

	newAccess, err := s.generateToken(oldClaims.UserID, oldClaims.SessionID, domain.JwtTokenTypeAccess, s.cfg.JWTAccessTokenTTL, nil, "")
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate access token")
	}

	origIat := oldClaims.IssuedAt.Time
	newRefresh, err := s.generateToken(oldClaims.UserID, oldClaims.SessionID, domain.JwtTokenTypeRefresh, s.cfg.JWTRefreshTokenTTL, &origIat, oldClaims.ID)
	if err != nil {
		return "", "", domainerr.Wrap(domainerr.ErrInternal, "failed to generate refresh token")
	}

	log.Info("token refreshed", "uid", oldClaims.UserID, "sid", oldClaims.SessionID)
	return newAccess, newRefresh, nil
}

// --- Private helpers ---

func (s *AuthService) generateToken(userID, sessionID, tokenType string, ttl time.Duration, origIat *time.Time, chainJti string) (string, error) {
	now := time.Now()

	claims := domain.AuthClaims{
		UserID:    userID,
		RealmID:   s.cfg.RealmID,
		TokenType: tokenType,
		SessionID: sessionID,
		Scope:     []string{"user"},
		Version:   domain.JwtTokenVersion,
		DeviceID:  "unknown", // TODO: Брать из Metadata gRPC (User-Agent / X-Device-ID)
		// TODO: Реализовать Origin, Service

		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),                 // jti
			Subject:   userID,                           // sub
			Issuer:    domain.JwtTokenIssuer,            // iss
			Audience:  domain.JwtTokenAudience(),        // aud
			IssuedAt:  jwt.NewNumericDate(now),          // iat
			NotBefore: jwt.NewNumericDate(now),          // nbf
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)), // exp
		},
	}

	switch tokenType {
	case "access":
		claims.AMR = []string{"pwd"}                    // Авторизован через пароль
		claims.AZP = "desktop"                          // Авторизован через нативный клиент, иных вариантов нет
		claims.Perm = []string{"api:read", "api:write"} // TODO: Формализовать права доступа к API

	case "refresh":
		if origIat != nil {
			claims.OriginalIssuedAt = jwt.NewNumericDate(*origIat)
		} else {
			claims.OriginalIssuedAt = jwt.NewNumericDate(now)
		}

	}

	return s.signToken(claims)
}

// ValidateAccessToken проверяет токен и возвращает Claims.
func (s *AuthService) ValidateAccessToken(ctx context.Context, tokenStr string) (*domain.AuthClaims, error) {
	claims, err := s.validateToken(tokenStr)
	if err != nil {
		return nil, err
	}

	// Middleware должен принимать ТОЛЬКО Access-токены
	if claims.TokenType != domain.JwtTokenTypeAccess {
		return nil, domainerr.ErrTokenInvalid
	}

	// Здесь в будущем можно добавить мгновенную проверку бана в Redis/L1 Cache
	// if s.isBanned(claims.UserID) { return nil, domainerr.ErrUserBanned }

	return claims, nil
}

func (s *AuthService) validateToken(tokenStr string) (*domain.AuthClaims, error) {
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(domain.JwtTokenIssuer),
		jwt.WithAudience(domain.JwtTokenAudience()...),
		jwt.WithLeeway(domain.JwtTokenLeeway),
	)

	token, err := parser.ParseWithClaims(tokenStr, &domain.AuthClaims{}, func(t *jwt.Token) (any, error) {
		// Проверка заголовков
		if typ, ok := t.Header["typ"].(string); ok && typ != "JWT" {
			return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "invalid token header typ")
		}
		if kid, ok := t.Header["kid"].(string); ok && kid != s.cfg.JWTKeyID {
			return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "invalid token header kid")
		}

		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, domainerr.ErrTokenExpired
		}
		return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "failed to parse token")
	}

	if !token.Valid {
		return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "token not valid")
	}

	claims, ok := token.Claims.(*domain.AuthClaims)
	if !ok {
		return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "claims cast failed")
	}

	if claims.Version != domain.JwtTokenVersion {
		return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "invalid token version")
	}

	switch claims.TokenType {
	case domain.JwtTokenTypeAccess, domain.JwtTokenTypeRefresh, domain.JwtTokenTypeService:
	default:
		return nil, domainerr.Wrap(domainerr.ErrTokenInvalid, "invalid token type")
	}

	// TODO: Отслеживать RefreshChain для защиты от украденных токенов

	return claims, nil
}

func (s *AuthService) signToken(claims domain.AuthClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token.Header["kid"] = s.cfg.JWTKeyID
	token.Header["typ"] = "JWT"
	signedToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", domainerr.Wrap(domainerr.ErrInternal, "failed to sign jwt token")
	}
	return signedToken, nil
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
