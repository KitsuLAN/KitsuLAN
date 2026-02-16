package cache

import (
	"context"
	"errors"
	"math/rand"
	"time"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/logger"
	domainerr "github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
	"github.com/redis/go-redis/v9"
	"github.com/vmihailenco/msgpack/v5"
	"golang.org/x/sync/singleflight"
)

var (
	ErrMiss     = errors.New("cache miss")
	ErrSentinel = errors.New("sentinel value") // Маркер "пустоты"
)

// Маркер промоха кеша, устанавливается на отсутсвующий объект, для предотвращения спама запросами
const nilMarker = "__nil__"
const nilTTL = 30 * time.Second

// FetchFunc — функция, которая идёт в БД, если в кэше пусто.
type FetchFunc[T any] func() (*T, error)

// Manager — управляет жизненным циклом кэша для конкретного типа T.
type Manager[T any] struct {
	provider *Provider
	sf       singleflight.Group
	prefix   string // Namespace (например "user", "guild")
}

// NewManager создает менеджер для конкретной сущности `CacheDTO`
func NewManager[T any](provider *Provider, prefix string) *Manager[T] {
	return &Manager[T]{
		provider: provider,
		prefix:   prefix,
	}
}

// GetOrSet — основной метод (Cache-Aside + SingleFlight + L1 + L2)
// 1. Ищет в Ristretto (L1)
// 2. Ищет в Redis (L2) (через singleflight, чтобы не пробить L2)
// 3. Если нет — вызывает fetchFunc (БД) (через singleflight, чтобы не пробить БД)
// 4. Сохраняет обратно в L1 и L2
func (m *Manager[T]) GetOrSet(ctx context.Context, id string, fetch FetchFunc[T]) (*T, error) {
	start := time.Now()

	if !m.provider.Cfg.CacheEnabled {
		return fetch()
	}

	cacheKey := m.buildKey(id)

	// 1. L1: Ristretto (Memory) - Lock-free чтение
	// Получаем сразу копию объекта, безопасно для модификаций
	if v, ok := m.getL1(cacheKey); ok {
		recordHitL1(m.prefix)
		observeDuration(m.prefix, "l1", time.Since(start).Seconds())
		return v, nil
	}

	// 2. Используем SingleFlight для защиты от Cache Stampede.
	// Группируем запросы по ключу.
	val, err, _ := m.sf.Do(cacheKey, func() (any, error) {
		// Внутри SingleFlight повторно проверяем L1 (на случай гонки)
		if v, ok := m.getL1(cacheKey); ok {
			recordHitL1(m.prefix)
			return v, nil
		}

		// 3. L2: Redis
		tRedis := time.Now()
		entity, err := m.getL2(ctx, cacheKey)
		if err == nil {
			m.setL1(cacheKey, entity)
			recordHitL2(m.prefix)
			observeDuration(m.prefix, "l2", time.Since(tRedis).Seconds())
			return entity, nil
		}

		if errors.Is(err, ErrSentinel) {
			// HIT Найден маркер пустоты
			// Записей с таким маркером нет в бд
			recordHitL2(m.prefix)
			return nil, domainerr.ErrNotFound
		}

		if err != nil && !errors.Is(err, ErrMiss) {
			recordError(m.prefix)
			logger.FromContext(ctx).Warn("cache: redis get error", "key", cacheKey, "err", err)
		}

		// 4. Source: DB (FetchFunc)
		tFetch := time.Now()
		fetched, err := fetch()
		fetchDuration := time.Since(tFetch).Seconds()

		if err != nil {
			recordError(m.prefix)
			return nil, err
		}
		if fetched == nil {
			m.setL2Nil(cacheKey)
			recordMiss(m.prefix)
			observeDuration(m.prefix, "fetch", fetchDuration)
			return nil, ErrMiss
		}

		recordMiss(m.prefix)
		observeDuration(m.prefix, "fetch", fetchDuration)

		// 5. Запись в L1 (Ristretto) и L2 (Redis)
		blob, err := m.serialize(fetched)
		if err == nil {
			m.setL2Raw(cacheKey, blob)
			m.setL1Raw(cacheKey, blob)
		}

		return fetched, nil
	})

	if err != nil {
		return nil, err
	}

	// Важно: SingleFlight возвращает interface{}, приводим к типу
	// Если вернулся nil (из-за Sentinel), возвращаем ошибку или nil
	if val == nil {
		return nil, domainerr.ErrNotFound
	}

	return val.(*T), nil
}

// Invalidate принудительно удаляет ключ из L1 и L2
func (m *Manager[T]) Invalidate(ctx context.Context, id string) error {
	if !m.provider.Cfg.CacheEnabled {
		return nil
	}
	key := m.buildKey(id)

	m.delL1(key)
	return m.delL2(ctx, key)
}

// --- Helpers ---

// buildKey строит ключ вида: namespace:version:prefix:id
// Пример: kitsulan-core:v1:users:123e4567-e89b...
func (m *Manager[T]) buildKey(id string) string {
	cfg := m.provider.Cfg
	return cfg.CacheNamespace + ":" +
		cfg.CacheVersion + ":" +
		m.prefix + ":" +
		id
}

// calculateTTL применяет Jitter к базовому TTL чтобы избежать одновременного протухания записей.
func (m *Manager[T]) calculateTTL() time.Duration {
	base := m.provider.Cfg.CacheTTL
	jitter := m.provider.Cfg.CacheTTLJitter
	if jitter <= 0 {
		return base
	}
	extra := time.Duration(rand.Float64() * jitter * float64(base))
	return base + extra
}

// serialize упаковывает данные в MsgPack
func (m *Manager[T]) serialize(value *T) ([]byte, error) {
	return msgpack.Marshal(value)
}

// deserialize распаковывает MsgPack
func (m *Manager[T]) deserialize(data []byte, dest *T) error {
	return msgpack.Unmarshal(data, dest)
}

// ---------- L1 (memory / ristretto) ----------

func (m *Manager[T]) getL1(key string) (*T, bool) {
	if m.provider.Ristretto == nil {
		return nil, false
	}

	val, found := m.provider.Ristretto.Get(key)
	if !found {
		return nil, false
	}

	res, ok := val.(*T)
	return res, ok
}

func (m *Manager[T]) setL1(key string, value *T) {
	blob, err := m.serialize(value)
	if err == nil {
		m.setL1Raw(key, blob)
	}
}

func (m *Manager[T]) setL1Raw(key string, blob []byte) {
	if m.provider.Ristretto == nil {
		return
	}
	// Cost = длина байтов, Ristretto будет умнее управлять памятью
	m.provider.Ristretto.SetWithTTL(key, blob, int64(len(blob)), m.provider.Cfg.CacheL1TTL)
}

func (m *Manager[T]) delL1(key string) {
	if m.provider.Ristretto == nil {
		return
	}
	m.provider.Ristretto.Del(key)
}

// ---------- L2 (redis) ----------

func (m *Manager[T]) getL2(ctx context.Context, key string) (*T, error) {
	ctxRedis, cancel := context.WithTimeout(ctx, m.provider.Cfg.RedisReadTimeout)
	defer cancel()

	data, err := m.provider.Redis.Get(ctxRedis, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrMiss
		}
		return nil, err
	}

	if string(data) == nilMarker {
		return nil, ErrSentinel
	}

	var entity T
	if err := m.deserialize(data, &entity); err != nil {
		return nil, ErrMiss // Битые данные считаем промахом
	}

	return &entity, nil
}

func (m *Manager[T]) setL2(key string, value *T) {
	blob, err := m.serialize(value)
	if err == nil {
		m.setL2Raw(key, blob)
	}
}

func (m *Manager[T]) setL2Raw(key string, blob []byte) {
	ttl := m.calculateTTL()
	// Background контекст для записи, чтобы не прерывать сохранение при отмене запроса клиента
	ctxSet, cancel := context.WithTimeout(context.Background(), m.provider.Cfg.RedisWriteTimeout)
	defer cancel()

	if err := m.provider.Redis.Set(ctxSet, key, blob, ttl).Err(); err != nil {
		// Используем простой логгер или fmt, если контекст потерян,
		// но лучше передавать logger через структуру менеджера при создании.
		// fmt.Printf("redis set error: %v\n", err)
		// TODO: Логировать проблемы установки кеша редиса
	}
}

func (m *Manager[T]) setL2Nil(key string) {
	ctxSet, cancel := context.WithTimeout(context.Background(), m.provider.Cfg.RedisWriteTimeout)
	defer cancel()

	_ = m.provider.Redis.Set(ctxSet, key, nilMarker, nilTTL).Err()
}

func (m *Manager[T]) delL2(ctx context.Context, key string) error {
	ctxDel, cancel := context.WithTimeout(ctx, m.provider.Cfg.RedisWriteTimeout)
	defer cancel()
	return m.provider.Redis.Del(ctxDel, key).Err()
}
