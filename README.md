# KitsuLAN 🦊

Децентрализованный LAN-мессенджер.

## 🚀 Быстрый старт (Dev)

### Требования
* Docker & Docker Compose
* Go 1.21+
* Wails (для клиента)

### 1. Запуск Инфраструктуры
Мы используем Docker для БД и LiveKit.
```bash
cd deploy
docker compose up -d
```
После этого доступны:
* **LiveKit Dashboard:** http://localhost:7880
* **MinIO Console:** http://localhost:9001 (user: `kitsu_minio`, pass: `kitsu_minio_password`)
* **Postgres:** localhost:5432

### 2. Запуск Бэкенда (Core)
```bash
cd services/core
go run main.go
```

### 3. Запуск Клиента
```bash
cd client
wails dev
```
