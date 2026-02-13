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
	mu          sync.RWMutex
	subscribers map[string]map[uint64]chan *pb.ChatEvent // channelID → subID → ch
	nextID      uint64
}

func New() *Hub {
	return &Hub{
		subscribers: make(map[string]map[uint64]chan *pb.ChatEvent),
	}
}

// Subscribe регистрирует подписчика на канал.
// Возвращает канал событий и функцию отписки (вызвать defer unsubscribe()).
func (h *Hub) Subscribe(channelID string) (<-chan *pb.ChatEvent, func()) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.nextID++
	id := h.nextID

	ch := make(chan *pb.ChatEvent, 32) // буфер на случай медленного клиента

	if h.subscribers[channelID] == nil {
		h.subscribers[channelID] = make(map[uint64]chan *pb.ChatEvent)
	}
	h.subscribers[channelID][id] = ch

	unsubscribe := func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		delete(h.subscribers[channelID], id)
		if len(h.subscribers[channelID]) == 0 {
			delete(h.subscribers, channelID)
		}
		close(ch)
	}

	return ch, unsubscribe
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
