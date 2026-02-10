package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Ключ подписи токенов должен быть в .env
var jwtKey = []byte(os.Getenv("JWT_SECRET"))

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint) (string, error) {
	// Если переменная не задана, используем дефолт (только для дева!)
	if len(jwtKey) == 0 {
		jwtKey = []byte("secret_dev_key")
	}

	expirationTime := time.Now().Add(24 * time.Hour * 7) // Токен на неделю
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// ParseToken возвращает UserID если токен валиден
func ParseToken(tokenString string) (uint, error) {
	if len(jwtKey) == 0 {
		jwtKey = []byte("secret_dev_key")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		return jwtKey, nil
	})

	if err != nil {
		return 0, err
	}

	if !token.Valid {
		return 0, jwt.ErrSignatureInvalid
	}

	return claims.UserID, nil
}
