package errors

import (
	"strings"
)

// FromDB преобразует ошибки драйверов в AppError.
func FromDB(err error) error {
	if err == nil {
		return nil
	}

	msg := strings.ToLower(err.Error())

	// Дедлоки и блокировки (Retryable)
	if strings.Contains(msg, "deadlock detected") || strings.Contains(msg, "lock timeout") {
		return ErrConcurrentUpdate.WithInternal(err).WithRetry()
	}

	// Потеря связи с БД
	if strings.Contains(msg, "connection refused") || strings.Contains(msg, "is closing") {
		return ErrDBUnavailable.WithInternal(err).WithRetry()
	}

	// По умолчанию — системная ошибка
	return ErrInternal.WithInternal(err)
}
