// Package errors определяет доменные ошибки KitsuLAN
// и предоставляет утилиты для их конвертации в gRPC status codes.
//
// Паттерн использования в service-слое:
//
//	return "", errors.ErrUserNotFound
//
// Паттерн использования в transport-слое:
//
//	if err != nil {
//	    return nil, errors.ToGRPC(err)
//	}
package errors

import (
	"errors"
	"fmt"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// --- Sentinel errors (доменные ошибки) ---

var (
	// Auth
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenInvalid       = errors.New("token invalid")
	ErrUnauthorized       = errors.New("unauthorized")

	// User
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrUsernameConflict  = errors.New("username already taken")
	ErrEmailConflict     = errors.New("email already in use")

	// General
	ErrNotFound         = errors.New("not found")
	ErrAlreadyExists    = errors.New("already exists")
	ErrPermissionDenied = errors.New("permission denied")
	ErrInvalidArgument  = errors.New("invalid argument")
	ErrInternal         = errors.New("internal error")
)

// DomainError — обёртка для доменных ошибок с дополнительным контекстом.
// Позволяет добавить человекочитаемое сообщение без потери sentinel-ошибки.
type DomainError struct {
	Err     error
	Message string
}

func (e *DomainError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("%s: %s", e.Err.Error(), e.Message)
	}
	return e.Err.Error()
}

func (e *DomainError) Unwrap() error {
	return e.Err
}

// Wrap оборачивает sentinel-ошибку с дополнительным сообщением.
//
// Пример:
//
//	return errors.Wrap(errors.ErrUserNotFound, "user id: "+id)
func Wrap(err error, msg string) error {
	return &DomainError{Err: err, Message: msg}
}

// --- Маппинг доменных ошибок → gRPC status codes ---

// ToGRPC конвертирует доменную ошибку в gRPC status error.
// Если ошибка уже является gRPC status — возвращает её как есть.
// Неизвестные ошибки маппируются в codes.Internal (безопасно для клиента).
func ToGRPC(err error) error {
	if err == nil {
		return nil
	}

	// Если уже gRPC status — не трогаем
	if _, ok := status.FromError(err); ok {
		return err
	}

	code, msg := mapToGRPCCode(err)
	return status.Error(code, msg)
}

func mapToGRPCCode(err error) (codes.Code, string) {
	switch {
	// Auth errors
	case errors.Is(err, ErrInvalidCredentials):
		return codes.Unauthenticated, "invalid credentials"
	case errors.Is(err, ErrTokenExpired):
		return codes.Unauthenticated, "token expired"
	case errors.Is(err, ErrTokenInvalid):
		return codes.Unauthenticated, "invalid token"
	case errors.Is(err, ErrUnauthorized):
		return codes.PermissionDenied, "unauthorized"

	// Not found errors
	case errors.Is(err, ErrUserNotFound),
		errors.Is(err, ErrNotFound):
		return codes.NotFound, err.Error()

	// Conflict errors
	case errors.Is(err, ErrUserAlreadyExists),
		errors.Is(err, ErrUsernameConflict),
		errors.Is(err, ErrEmailConflict),
		errors.Is(err, ErrAlreadyExists):
		return codes.AlreadyExists, err.Error()

	// Validation errors
	case errors.Is(err, ErrInvalidArgument):
		return codes.InvalidArgument, err.Error()

	// Permission errors
	case errors.Is(err, ErrPermissionDenied):
		return codes.PermissionDenied, "permission denied"

	// Всё остальное — Internal (детали не отправляем клиенту)
	default:
		return codes.Internal, "internal server error"
	}
}

// Is — удобная обёртка над стандартным errors.Is для импорта через один пакет.
var Is = errors.Is

// As — удобная обёртка над стандартным errors.As.
var As = errors.As
