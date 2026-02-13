// Package middleware предоставляет gRPC interceptors (unary + stream):
//   - Recovery     — перехват паник, логирование и конвертация в gRPC Internal error
//   - Logging      — логирование каждого RPC вызова с метаданными
//   - Auth         — проверка JWT-токена и добавление UserID в контекст
package middleware

import (
	"context"
	"log/slog"
	"runtime/debug"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// contextKey для значений в контексте запроса
type contextKey string

const (
	ContextKeyUserID contextKey = "user_id"
)

// --- Recovery Interceptor ---

// UnaryRecovery перехватывает панику в unary-обработчиках и возвращает
// Internal gRPC ошибку вместо падения процесса.
func UnaryRecovery(log *slog.Logger) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered in gRPC handler",
					"method", info.FullMethod,
					"panic", r,
					"stack", string(debug.Stack()),
				)
				err = status.Errorf(codes.Internal, "internal server error")
			}
		}()
		return handler(ctx, req)
	}
}

// StreamRecovery — то же самое для stream-обработчиков.
func StreamRecovery(log *slog.Logger) grpc.StreamServerInterceptor {
	return func(
		srv any,
		ss grpc.ServerStream,
		info *grpc.StreamServerInfo,
		handler grpc.StreamHandler,
	) (err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered in gRPC stream handler",
					"method", info.FullMethod,
					"panic", r,
					"stack", string(debug.Stack()),
				)
				err = status.Errorf(codes.Internal, "internal server error")
			}
		}()
		return handler(srv, ss)
	}
}

// --- Logging Interceptor ---

// UnaryLogging логирует каждый входящий unary-запрос с деталями:
// метод, статус, время выполнения, user_id (если авторизован).
func UnaryLogging(log *slog.Logger) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		elapsed := time.Since(start)

		code := codes.OK
		if err != nil {
			code = status.Code(err)
		}

		attrs := []any{
			"method", info.FullMethod,
			"code", code.String(),
			"duration", elapsed,
		}

		// Если пользователь авторизован — добавляем user_id в лог
		if uid, ok := UserIDFromContext(ctx); ok {
			attrs = append(attrs, "user_id", uid)
		}

		if err != nil && code != codes.Unauthenticated && code != codes.NotFound {
			log.Error("gRPC call failed", append(attrs, "error", err)...)
		} else {
			log.Info("gRPC call", attrs...)
		}

		return resp, err
	}
}

// --- Auth Interceptor ---

// publicMethods — список методов, которые не требуют авторизации.
// Используем map для O(1) поиска.
var publicMethods = map[string]struct{}{
	"/kitsulan.v1.AuthService/Register":     {},
	"/kitsulan.v1.AuthService/Login":        {},
	"/kitsulan.v1.AuthService/RefreshToken": {},
}

// UnaryAuth проверяет JWT-токен для защищённых методов.
// Добавляет UserID в контекст при успешной проверке.
func UnaryAuth(jwtSecret string) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		// Публичные методы пропускаем без проверки
		if _, ok := publicMethods[info.FullMethod]; ok {
			return handler(ctx, req)
		}

		userID, err := extractAndValidateToken(ctx, jwtSecret)
		if err != nil {
			return nil, err
		}

		// Добавляем UserID в контекст для использования в обработчиках
		ctx = context.WithValue(ctx, ContextKeyUserID, userID)
		return handler(ctx, req)
	}
}

// StreamAuth — interceptor авторизации для streaming RPC.
func StreamAuth(jwtSecret string) grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		publicMethods := map[string]bool{
			"/kitsulan.v1.AuthService/Register": true,
			"/kitsulan.v1.AuthService/Login":    true,
		}
		if publicMethods[info.FullMethod] {
			return handler(srv, ss)
		}

		userID, err := extractAndValidateToken(ss.Context(), jwtSecret)
		if err != nil {
			return err // extractAndValidateToken уже возвращает gRPC status error
		}

		newCtx := context.WithValue(ss.Context(), ContextKeyUserID, userID)
		return handler(srv, &wrappedStream{ServerStream: ss, ctx: newCtx})
	}
}

type wrappedStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedStream) Context() context.Context { return w.ctx }

// UserIDFromContext извлекает UserID из контекста запроса.
// Возвращает ("", false) если пользователь не авторизован.
func UserIDFromContext(ctx context.Context) (string, bool) {
	uid, ok := ctx.Value(ContextKeyUserID).(string)
	return uid, ok && uid != ""
}

// extractAndValidateToken достаёт Bearer-токен из gRPC metadata и валидирует его.
func extractAndValidateToken(ctx context.Context, secret string) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Error(codes.Unauthenticated, "missing metadata")
	}

	values := md.Get("authorization")
	if len(values) == 0 {
		return "", status.Error(codes.Unauthenticated, "missing authorization header")
	}

	// Формат: "Bearer <token>"
	raw := values[0]
	if !strings.HasPrefix(raw, "Bearer ") {
		return "", status.Error(codes.Unauthenticated, "invalid authorization format, use: Bearer <token>")
	}
	tokenString := strings.TrimPrefix(raw, "Bearer ")

	// Парсим и валидируем JWT
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, status.Errorf(codes.Unauthenticated, "unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", status.Error(codes.Unauthenticated, "invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", status.Error(codes.Unauthenticated, "invalid token claims")
	}

	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		return "", status.Error(codes.Unauthenticated, "user_id not found in token")
	}

	return userID, nil
}
