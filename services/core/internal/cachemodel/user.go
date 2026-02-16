package cachemodel

// UserCacheDTO — версия 1
// Строго описываем поля. Если в БД 50 полей, сюда берем только 5 горячих.
type UserCacheDTO struct {
	ID        string `msgpack:"1"` // Используем индексы msgpack для компактности
	Username  string `msgpack:"2"`
	AvatarURL string `msgpack:"3"`
	// Bio string - не кэшируем, тяжелое поле, редко нужно в списках
	IsOnline bool `msgpack:"4"` // Можно хранить тут, или отдельно в Redis Bitmaps
}

// GuildMemberCacheDTO
type GuildMemberCacheDTO struct {
	Roles    []string `msgpack:"1"`
	Nickname string   `msgpack:"2"`
}
