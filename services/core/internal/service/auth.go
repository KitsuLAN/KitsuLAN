package service

import (
	"context"
	"strings"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain/models"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
)

type userRepo interface {
	// Create сохраняет нового пользователя. ID генерируется в BeforeCreate.
	Create(ctx context.Context, user *models.User) error

	// FindByID возвращает пользователя по UUID. Ошибка errors.ErrUserNotFound если не найден.
	FindByID(ctx context.Context, id string) (*models.User, error)

	// FindByUsername возвращает пользователя по username.
	FindByUsername(ctx context.Context, username string) (*models.User, error)

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
	const op = "AuthService.Register"

	log := logger.FromContext(ctx)
	log.Info("attempting registration", "username", username)

	if err := validateCredentials(username, password); err != nil {
		return "", errors.AsAppError(err).WithOp(op)
	}

	// Ранняя проверка занятости username (до хеширования пароля)
	exists, err := s.users.ExistsByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		return "", errors.Wrap(err, errors.ErrDBQueryFailed, op).
			WithMsg("Failed to check username availability")
	}
	if exists {
		return "", errors.ErrUsernameTaken.WithOp(op).
			WithRemedy("This username is already in use on this Realm. Try adding some characters or choosing another one.")
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", errors.Wrap(err, errors.ErrInternal, op).
			WithMsg("Failed to process security credentials").
			WithMeta("algo", "bcrypt")
	}

	passStr := string(hashedPass)
	currentRealmUUID, _ := uuid.Parse(s.cfg.RealmID) // TODO: Временно, лучше валидировать при старте
	if currentRealmUUID == uuid.Nil {
		// Fallback если в конфиге не UUID (например "core-local")
		// Для тестов генерируем новый, в проде RealmID должен быть строгим UUID
		currentRealmUUID = uuid.New()
	}

	user := &models.User{
		BaseEntity: models.BaseEntity{
			RealmID: currentRealmUUID,
		},
		Username:     strings.TrimSpace(username),
		PasswordHash: &passStr,
	}

	if err := s.users.Create(ctx, user); err != nil {
		return "", errors.AsAppError(err).WithOp(op)
	}

	return user.ID.String(), nil
}

// Login проверяет credentials и возвращает пару access/refresh токенов.
func (s *AuthService) Login(ctx context.Context, username, password string) (accessToken, refreshToken string, err error) {
	const op = "AuthService.Login"
	log := logger.FromContext(ctx)

	user, err := s.users.FindByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		if errors.Is(err, errors.ErrUserNotFound) {
			return "", "", errors.ErrInvalidCredentials.WithOp(op)
		}
		return "", "", errors.AsAppError(err).WithOp(op)
	}

	// Проверка: есть ли у пользователя вообще пароль (федеративные не имеют)
	if user.PasswordHash == nil {
		log.Warn("login failed: user has no password (federated?)", "username", username, "user_id", user.ID, "realm_id", user.HomeRealmID)
		return "", "", errors.ErrInvalidCredentials.WithOp(op).
			WithMeta("reason", "federated_user_local_login_attempt")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		log.Warn("login failed: invalid password", "username", username)
		return "", "", errors.ErrInvalidCredentials.WithOp(op)
	}

	sessionID := uuid.NewString()
	userID := user.ID.String()
	now := time.Now()

	accessToken, err = s.generateToken(userID, sessionID, domain.JwtTokenTypeAccess, s.cfg.JWTAccessTokenTTL, nil, "")
	if err != nil {
		return "", "", errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to issue access token")
	}

	refreshToken, err = s.generateToken(userID, sessionID, domain.JwtTokenTypeRefresh, s.cfg.JWTRefreshTokenTTL, &now, "")
	if err != nil {
		return "", "", errors.Wrap(err, errors.ErrInternal, op).WithMsg("Failed to issue refresh token")
	}

	log.Info("user logged in", "user_id", userID, "session_id", sessionID)
	return accessToken, refreshToken, nil
}

// RefreshToken валидирует refresh token и выдаёт новую пару токенов.
func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenStr string) (string, string, error) {
	const op = "AuthService.RefreshToken"
	log := logger.FromContext(ctx)

	// 1. Валидируем старый токен и получаем его Claims
	oldClaims, err := s.validateToken(refreshTokenStr)
	if err != nil {
		return "", "", errors.AsAppError(err).WithOp(op).
			WithRemedy("Your session is no longer valid. Please log in again.")
	}

	if oldClaims.TokenType != domain.JwtTokenTypeRefresh {
		return "", "", errors.ErrTokenInvalid.WithOp(op).
			WithMsg("Provided token is not a refresh token").
			WithMeta("got_type", oldClaims.TokenType)
	}

	newAccess, err := s.generateToken(oldClaims.UserID, oldClaims.SessionID, domain.JwtTokenTypeAccess, s.cfg.JWTAccessTokenTTL, nil, "")
	if err != nil {
		return "", "", errors.Wrap(err, errors.ErrInternal, op)
	}

	origIat := oldClaims.IssuedAt.Time
	newRefresh, err := s.generateToken(oldClaims.UserID, oldClaims.SessionID, domain.JwtTokenTypeRefresh, s.cfg.JWTRefreshTokenTTL, &origIat, oldClaims.ID)
	if err != nil {
		return "", "", errors.Wrap(err, errors.ErrInternal, op)
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
		return nil, errors.ErrTokenInvalid
	}

	// Здесь в будущем можно добавить мгновенную проверку бана в Redis/L1 Cache
	// if s.isBanned(claims.UserID) { return nil, errors.ErrUserBanned }

	return claims, nil
}

func (s *AuthService) validateToken(tokenStr string) (*domain.AuthClaims, error) {
	const op = "AuthService.validateToken"

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(domain.JwtTokenIssuer),
		jwt.WithAudience(domain.JwtTokenAudience()...),
		jwt.WithLeeway(domain.JwtTokenLeeway),
	)

	token, err := parser.ParseWithClaims(tokenStr, &domain.AuthClaims{}, func(t *jwt.Token) (any, error) {
		// Проверка заголовков
		if typ, ok := t.Header["typ"].(string); ok && typ != "JWT" {
			return nil, errors.New(errors.CodeTokenMalformed, "Invalid token header type", codes.Unauthenticated).
				WithOp(op).
				WithMeta("expected", "JWT").
				WithMeta("got", t.Header["typ"])
		}
		if kid, ok := t.Header["kid"].(string); ok && kid != s.cfg.JWTKeyID {
			return nil, errors.New(errors.CodeTokenSignature, "Token signed with unknown key ID", codes.Unauthenticated).
				WithOp(op).
				WithRemedy("Your session might be from an older server version. Please log in again.")
		}

		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, errors.ErrTokenExpired.WithOp(op)
		}
		return nil, errors.Wrap(err, errors.ErrTokenInvalid, op).
			WithMsg("Security token validation failed").
			WithRemedy("The session token is malformed or tampered. Re-authentication is required.")
	}

	if !token.Valid {
		return nil, errors.ErrTokenInvalid.WithOp(op).WithMsg("Token is syntactically correct but not valid")
	}

	claims, ok := token.Claims.(*domain.AuthClaims)
	if !ok {
		return nil, errors.ErrTokenInvalid.WithOp(op).
			WithMsg("Failed to extract claims from token").
			WithMeta("type", "AuthClaims")
	}

	if claims.Version != domain.JwtTokenVersion {
		return nil, errors.ErrTokenInvalid.WithOp(op).
			WithMsgf("Incompatible token version: expected %d, got %d", domain.JwtTokenVersion, claims.Version).
			WithRemedy("Your application version might be outdated. Please update.")
	}

	switch claims.TokenType {
	case domain.JwtTokenTypeAccess, domain.JwtTokenTypeRefresh, domain.JwtTokenTypeService:
	default:
		return nil, errors.ErrTokenInvalid.WithOp(op).
			WithMsgf("Unauthorized token type: %s", claims.TokenType).
			WithMeta("token_id", claims.ID)
	}

	// TODO: Отслеживать RefreshChain для защиты от украденных токенов

	return claims, nil
}

func (s *AuthService) signToken(claims domain.AuthClaims) (string, error) {
	const op = "AuthService.signToken"
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	token.Header["kid"] = s.cfg.JWTKeyID
	token.Header["typ"] = "JWT"
	signedToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", errors.Wrap(err, errors.ErrInternal, op).
			WithMsg("Failed to sign security token").
			WithRemedy("Verify that JWT_SECRET is a valid 32-byte hex string.")
	}
	return signedToken, nil
}

func validateCredentials(username, password string) error {
	username = strings.TrimSpace(username)
	if len(username) < 3 {
		return errors.ValidationError("username", "Too short").
			WithOp("AuthService.Register").
			WithRemedy("Username must be at least 3 characters long.")
	}
	if len(username) > 32 {
		return errors.ValidationError("username", "Too long").
			WithOp("AuthService.Register").
			WithRemedy("Username must be at most 32 characters long.")
	}
	if len(password) < 8 {
		return errors.ValidationError("password", "Too weak").
			WithOp("AuthService.Register").
			WithRemedy("Password must be at least 8 characters long for security.")
	}
	return nil
}
