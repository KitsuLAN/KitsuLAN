package middleware

import (
	"context"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// UnaryRequestID добавляет request_id в контекст и обновляет логгер.
func UnaryRequestID() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		// 1. Пытаемся достать ID из метаданных (если фронтенд/LB его прислал)
		md, _ := metadata.FromIncomingContext(ctx)
		reqID := ""
		if vals := md.Get("x-request-id"); len(vals) > 0 {
			reqID = vals[0]
		}

		// 2. Если нет — генерируем новый
		if reqID == "" {
			reqID = uuid.New().String()
		}

		// 3. Достаем текущий логгер и добавляем к нему атрибут request_id
		log := logger.FromContext(ctx).With("request_id", reqID)

		// 4. Кладем обновленный логгер обратно в контекст
		// Теперь все дальнейшие вызовы logger.FromContext(ctx) вернут логгер с ID
		ctx = logger.WithContext(ctx, log)

		return handler(ctx, req)
	}
}
