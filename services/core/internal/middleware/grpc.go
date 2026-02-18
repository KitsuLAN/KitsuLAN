// Package middleware предоставляет gRPC interceptors (unary + stream):
//   - Recovery     — перехват паник, логирование и конвертация в gRPC Internal error
//   - Logging      — логирование каждого RPC вызова с метаданными
//   - Auth         — проверка JWT-токена и добавление UserID в контекст
package middleware

import (
	"context"
	"errors"
	"runtime/debug"
	"strings"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/domain"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
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
	ContextKeyClaims contextKey = "claims"
)

func mapAuthError(err error) error {
	switch {
	case errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, domainerr.ErrTokenExpired):
		return status.Error(codes.Unauthenticated, "token expired")

	case errors.Is(err, domainerr.ErrTokenInvalid):
		return status.Error(codes.Unauthenticated, "invalid token")

	default:
		return status.Error(codes.Unauthenticated, "auth failed")
	}
}

// --- Recovery Interceptor ---

// UnaryRecovery перехватывает панику в unary-обработчиках и возвращает
// Internal gRPC ошибку вместо падения процесса.
func UnaryRecovery() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (resp any, err error) {
		defer func() {
			if r := recover(); r != nil {
				log := logger.FromContext(ctx).With("component", "middleware")
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
func StreamRecovery() grpc.StreamServerInterceptor {
	return func(
		srv any,
		ss grpc.ServerStream,
		info *grpc.StreamServerInfo,
		handler grpc.StreamHandler,
	) (err error) {
		defer func() {
			if r := recover(); r != nil {
				log := logger.FromContext(ss.Context()).With("component", "middleware")
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
func UnaryLogging() grpc.UnaryServerInterceptor {
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

		log := logger.FromContext(ctx).With("component", "middleware")
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

type tokenValidator interface {
	ValidateAccessToken(ctx context.Context, token string) (*domain.AuthClaims, error)
}

// UnaryAuth проверяет JWT-токен для защищённых методов.
// Добавляет UserID в контекст при успешной проверке.
func UnaryAuth(auth tokenValidator) grpc.UnaryServerInterceptor {
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

		tokenStr, err := extractBearer(ctx)
		if err != nil {
			return nil, err
		}

		claims, err := auth.ValidateAccessToken(ctx, tokenStr)
		if err != nil {
			return nil, mapAuthError(err) // Конвертируем доменную ошибку в gRPC статус
		}

		// Добавляем UserID в контекст для использования в обработчиках
		ctx = context.WithValue(ctx, ContextKeyUserID, claims.UserID)
		ctx = context.WithValue(ctx, ContextKeyClaims, claims)
		return handler(ctx, req)
	}
}

// StreamAuth — interceptor авторизации для streaming RPC.
func StreamAuth(auth tokenValidator) grpc.StreamServerInterceptor {
	return func(srv any, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		if _, ok := publicMethods[info.FullMethod]; ok {
			return handler(srv, ss)
		}

		tokenStr, err := extractBearer(ss.Context())
		if err != nil {
			return err // extractAndValidateToken уже возвращает gRPC status error
		}

		claims, err := auth.ValidateAccessToken(ss.Context(), tokenStr)
		if err != nil {
			return mapAuthError(err)
		}

		newCtx := context.WithValue(ss.Context(), ContextKeyUserID, claims.UserID)
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

func extractBearer(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Error(codes.Unauthenticated, "missing metadata")
	}

	values := md.Get("authorization")
	if len(values) == 0 {
		return "", status.Error(codes.Unauthenticated, "missing authorization header")
	}

	raw := values[0]
	if !strings.HasPrefix(raw, "Bearer ") {
		return "", status.Error(codes.Unauthenticated, "invalid authorization format")
	}

	return strings.TrimPrefix(raw, "Bearer "), nil
}

// MustUserID извлекает UserID из контекста.
//
// Предполагается, что функция вызывается только в gRPC-хендлерах,
// защищённых Auth interceptor-ом.
// Если UserID отсутствует в контексте, функция паникует — это
// означает ошибку конфигурации (Auth interceptor не применён).
func MustUserID(ctx context.Context) string {
	uid, ok := UserIDFromContext(ctx)
	if !ok {
		panic("UserID missing in context: Auth interceptor is not applied")
	}
	return uid
}
