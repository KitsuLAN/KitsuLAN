// Package hub реализует in-memory pub/sub для gRPC server-streaming.
// При отправке сообщения оно рассылается всем активным подписчикам канала.
package hub

import (
	"sync"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
)

// Hub управляет подписками на каналы.
// Безопасен для конкурентного использования.
type Hub struct {
	mu sync.RWMutex
	// channelID → subID → ch
	subscribers map[string]map[uint64]chan *pb.ChatEvent

	// userID -> count (сколько активных соединений у юзера)
	// Если count > 0, юзер онлайн.
	presence map[string]int

	nextID uint64
}

func New() *Hub {
	return &Hub{
		subscribers: make(map[string]map[uint64]chan *pb.ChatEvent),
		presence:    make(map[string]int),
	}
}

// Subscribe регистрирует подписчика на канал и помечает юзера как Online.
// Возвращает канал событий и функцию отписки (вызвать defer unsubscribe()).
func (h *Hub) Subscribe(channelID string, userID string) (<-chan *pb.ChatEvent, func()) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.nextID++
	id := h.nextID

	ch := make(chan *pb.ChatEvent, 32) // буфер на случай медленного клиента

	if h.subscribers[channelID] == nil {
		h.subscribers[channelID] = make(map[uint64]chan *pb.ChatEvent)
	}
	h.subscribers[channelID][id] = ch

	if userID != "" {
		h.presence[userID]++
	}

	// Функция отписки (вызывается при дисконнекте/смене канала)
	unsubscribe := func() {
		h.mu.Lock()
		defer h.mu.Unlock()

		// Удаляем канал
		if subs, ok := h.subscribers[channelID]; ok {
			delete(subs, id)
			if len(subs) == 0 {
				delete(h.subscribers, channelID)
			}
		}

		// Декремент Presence
		if userID != "" {
			h.presence[userID]--
			if h.presence[userID] <= 0 {
				delete(h.presence, userID)
			}
		}

		close(ch)
	}

	return ch, unsubscribe
}

// IsOnline проверяет, есть ли у пользователя активные подключения.
func (h *Hub) IsOnline(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.presence[userID] > 0
}

// Publish рассылает событие всем подписчикам канала.
// Медленные клиенты (полный буфер) пропускают событие — не блокируем.
func (h *Hub) Publish(channelID string, event *pb.ChatEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, ch := range h.subscribers[channelID] {
		select {
		case ch <- event:
		default: // клиент не успевает — пропускаем
		}
	}
}
