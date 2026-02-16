package cache

import (
	"context"
	"fmt"

	"github.com/KitsuLAN/KitsuLAN/services/core/internal/config"
	"github.com/dgraph-io/ristretto"
	"github.com/redis/go-redis/v9"
)

type Provider struct {
	Redis     *redis.Client
	Ristretto *ristretto.Cache
	Cfg       *config.Config
}

func NewProvider(cfg *config.Config) (*Provider, error) {
	if !cfg.CacheEnabled {
		return &Provider{Cfg: cfg}, nil
	}

	// 1. Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		DialTimeout:  cfg.RedisDialTimeout,
		ReadTimeout:  cfg.RedisReadTimeout,
		WriteTimeout: cfg.RedisWriteTimeout,
		PoolSize:     cfg.RedisPoolSize,
	})

	// Ping для проверки связи с Redis
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	// 2. Ristretto (Global L1 instance)
	// Можно использовать один большой инстанс Ristretto на все приложение
	var l1 *ristretto.Cache
	if cfg.CacheL1Enabled {
		var err error
		l1, err = ristretto.NewCache(&ristretto.Config{
			NumCounters: cfg.CacheL1NumCounters, // 10x от числа ключей
			MaxCost:     cfg.CacheL1MaxCost,     // Макс память (байт)
			BufferItems: 64,                     // Рекомендовано документацией Ristretto
			Metrics:     cfg.CacheL1Metrics,     // Можно включить для мониторинга
		})
		if err != nil {
			return nil, fmt.Errorf("failed to init ristretto: %w", err)
		}
	}

	return &Provider{Redis: rdb, Ristretto: l1, Cfg: cfg}, nil
}

func (p *Provider) Close() error {
	if p.Ristretto != nil {
		p.Ristretto.Close()
	}
	if p.Redis != nil {
		err := p.Redis.Close()
		if err != nil {
			return fmt.Errorf("failed to close redis: %w", err)
		}
	}
	return nil
}
