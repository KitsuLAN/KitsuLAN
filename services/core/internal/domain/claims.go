package domain

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	JwtTokenVersion     = 1
	JwtTokenIssuer      = "kitsulan-auth"
	JwtTokenTypeAccess  = "access"
	JwtTokenTypeRefresh = "refresh"
	JwtTokenTypeService = "service"
	JwtTokenLeeway      = 5 * time.Minute // TODO: Вынести в конфиг
)

var jwtTokenAudience = []string{"core", "media", "integration"}

func JwtTokenAudience() []string {
	return jwtTokenAudience
}

// AuthClaims — расширенная структура JWT для федеративной системы.
type AuthClaims struct {
	UserID    string   `json:"uid"`           // ID пользователя (дублирует Subject)
	RealmID   string   `json:"rid"`           // Кто выдал токен (наш узел)
	TokenType string   `json:"typ"`           // "access" | "refresh"
	SessionID string   `json:"sid,omitempty"` // ID сессии (uuid)
	Scope     []string `json:"scp,omitempty"` // "user", "admin", "bot"
	Version   int      `json:"ver"`           // Версия схемы токена (например, 1)

	DeviceID string   `json:"dev,omitempty"`  // Fingerprint устройства
	Origin   string   `json:"org,omitempty"`  // Откуда пришел запрос (предположительно dht hash)
	AMR      []string `json:"amr,omitempty"`  // Authentication Methods References (pwd, mfa)
	AZP      string   `json:"azp,omitempty"`  // Authorized party (какой клиент: web, desktop)
	Service  string   `json:"svc,omitempty"`  // Если токен выдан сервису, а не юзеру
	Perm     []string `json:"perm,omitempty"` // Список прав (api:read:messages, etc)

	OriginalIssuedAt *jwt.NumericDate `json:"orig_iat,omitempty"` // Когда была создана первая сессия
	RefreshChain     string           `json:"rat,omitempty"`      // ID предыдущего refresh токена (для ротации)

	jwt.RegisteredClaims
}
