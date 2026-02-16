package cache

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics хранит коллекторы Prometheus
type Metrics struct {
	// Счетчик операций (Hit L1, Hit L2, Miss, Error)
	OpsTotal *prometheus.CounterVec
	// Время выполнения запросов (Latency)
	Duration *prometheus.HistogramVec
	// Размер данных в памяти (L1 Cost)
	L1Cost *prometheus.GaugeVec
	// Количество ключей в памяти (L1 Count)
	L1Items *prometheus.GaugeVec
}

var (
	// Глобальный реестр метрик для кэша
	// Используем promauto для автоматической регистрации при старте
	m = &Metrics{
		OpsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "kitsulan",
				Subsystem: "cache",
				Name:      "ops_total",
				Help:      "Total number of cache operations by result (hit_l1, hit_l2, miss, error)",
			},
			[]string{"prefix", "result"}, // prefix = "users", "guilds"...
		),
		Duration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "kitsulan",
				Subsystem: "cache",
				Name:      "duration_seconds",
				Help:      "Cache operation latency",
				Buckets:   prometheus.DefBuckets, // .005, .01, .025, .05, .1 ...
			},
			[]string{"prefix", "source"}, // source = "l1", "l2", "fetch"
		),
		L1Cost: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "kitsulan",
				Subsystem: "cache",
				Name:      "l1_cost_bytes",
				Help:      "Current memory usage of L1 cache in bytes",
			},
			[]string{"prefix"}, // Ristretto общий, но можно тегировать, если разделяем инстансы
		),
		L1Items: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "kitsulan",
				Subsystem: "cache",
				Name:      "l1_items_count",
				Help:      "Number of items in L1 cache",
			},
			[]string{"prefix"},
		),
	}
)

// Helper функции для чистоты кода в Manager

func recordHitL1(prefix string) {
	m.OpsTotal.WithLabelValues(prefix, "hit_l1").Inc()
}

func recordHitL2(prefix string) {
	m.OpsTotal.WithLabelValues(prefix, "hit_l2").Inc()
}

func recordMiss(prefix string) {
	m.OpsTotal.WithLabelValues(prefix, "miss").Inc()
}

func recordError(prefix string) {
	m.OpsTotal.WithLabelValues(prefix, "error").Inc()
}

func observeDuration(prefix, source string, t float64) {
	m.Duration.WithLabelValues(prefix, source).Observe(t)
}
