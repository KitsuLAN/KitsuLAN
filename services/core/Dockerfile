# ==========================================
# 1. Build Stage (Сборка)
# ==========================================
FROM golang:1.24-alpine AS builder

# Устанавливаем git (нужен для скачивания зависимостей) и ca-certificates
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Кэширование зависимостей
# Сначала копируем только go.mod и go.sum
COPY go.mod go.sum ./
RUN go mod download

# Теперь копируем исходный код
COPY . .

# Компилируем
# CGO_ENABLED=0 — создает статический бинарник (не требует библиотек C)
# GOOS=linux — явно указываем ОС
# -ldflags="-s -w" — убирает отладочную инфу, уменьшая размер файла на 20-30%
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server/main.go

# ==========================================
# 2. Final Stage (Запуск)
# ==========================================
# Используем минимальный образ (Alpine) весит около 5MB
FROM alpine:latest

LABEL maintainer="KitsuLAN Team"
LABEL service="kitsulan-core"
LABEL authors="Pugemon"

# Устанавливаем сертификаты (для HTTPS запросов) и Timezone
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /root/

# Копируем скомпилированный файл из первого этапа (builder)
COPY --from=builder /server .
# Копируем шаблон настроек
COPY --from=builder /app/.env.example .env

# Открываем порты приложения
EXPOSE 8090 8091 8092

CMD ["./server"]