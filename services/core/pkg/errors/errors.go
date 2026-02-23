package errors

import (
	"errors"
	"fmt"
	"log/slog"
	"runtime"
	"strings"

	"google.golang.org/grpc/codes"
)

// AppError — максимально разговорчивая ошибка для self-hosted проекта.
type AppError struct {
	Code      ErrorCode      `json:"code"`    // Машиночитаемый код (API контракт)
	PublicMsg string         `json:"message"` // Сообщение для конечного пользователя
	Internal  error          `json:"-"`       // Исходная ошибка бэкенда (БД, сеть и т.д.)
	Op        string         `json:"op,omitempty"`
	Status    codes.Code     `json:"-"`                // gRPC Status
	Meta      map[string]any `json:"meta,omitempty"`   // Дополнительный контекст
	Stack     string         `json:"-"`                // Стек вызовов в момент создания/оборачивания ошибки
	Remedy    string         `json:"remedy,omitempty"` // Что сделать юзеру, чтобы исправить (например, "Update app")
	Retryable bool           `json:"retryable"`        // Можно ли клиенту повторить запрос?
	Severity  slog.Level     `json:"-"`                // Для фильтрации в системах типа Grafana/Loki
}

// Error реализует стандартный интерфейс error.
// В консоли мы хотим видеть максимум деталей.
func (e *AppError) Error() string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[%s] %s", e.Code, e.PublicMsg))
	if e.Op != "" {
		sb.WriteString(fmt.Sprintf(" (op: %s)", e.Op))
	}
	if e.Internal != nil {
		sb.WriteString(fmt.Sprintf(" -> %v", e.Internal))
	}
	return sb.String()
}

func AsAppError(err error) *AppError {
	var ae *AppError
	if errors.As(err, &ae) {
		return ae
	}
	return ErrInternal.WithInternal(err)
}

// Unwrap позволяет использовать стандартные errors.Is и errors.As.
func (e *AppError) Unwrap() error {
	return e.Internal
}

// LogValue реализует интерфейс slog.LogValuer.
func (e *AppError) LogValue() slog.Value {
	attrs := []slog.Attr{
		slog.String("code", string(e.Code)),
		slog.String("public_msg", e.PublicMsg),
	}
	if e.Op != "" {
		attrs = append(attrs, slog.String("op", e.Op))
	}
	if e.Internal != nil {
		attrs = append(attrs, slog.String("internal_err", e.Internal.Error()))
	}
	if len(e.Meta) > 0 {
		attrs = append(attrs, slog.Any("meta", e.Meta))
	}
	if e.Stack != "" {
		attrs = append(attrs, slog.String("stack", e.Stack))
	}
	if e.Remedy != "" {
		attrs = append(attrs, slog.String("remedy", e.Remedy))
	}

	return slog.GroupValue(attrs...)
}

// --- Утилиты для создания и оборачивания ---

// New создает базовый Sentinel. Стек здесь не захватывается, так как Sentinels создаются при старте (в var).
func New(code ErrorCode, msg string, status codes.Code) *AppError {
	return &AppError{
		Code:      code,
		PublicMsg: msg,
		Status:    status,
	}
}

// Wrap оборачивает системную ошибку в AppError, захватывая стек вызовов.
// Это главный конструктор для ошибок на уровне репозитория/инфраструктуры.
func Wrap(internalErr error, sentinel *AppError, op string) *AppError {
	if internalErr == nil {
		return nil
	}

	// Если мы уже оборачивали эту ошибку ранее, не перезаписываем стек
	var existing *AppError
	if errors.As(internalErr, &existing) {
		return existing
	}

	newErr := *sentinel
	newErr.Internal = internalErr
	newErr.Op = op
	newErr.Stack = captureStack(2) // Пропускаем текущую функцию и вызывающую
	return &newErr
}

// WithMeta создает копию ошибки с добавленными метаданными (Immutable подход).
func (e *AppError) WithMeta(key string, value any) *AppError {
	newErr := *e
	newMap := make(map[string]any)
	for k, v := range e.Meta {
		newMap[k] = v
	}
	newMap[key] = value
	newErr.Meta = newMap

	// Если стека еще нет (это чистый Sentinel), захватываем его
	if newErr.Stack == "" {
		newErr.Stack = captureStack(2)
	}
	return &newErr
}

func (e *AppError) WithOp(op string) *AppError {
	newErr := *e
	newErr.Op = op
	if newErr.Stack == "" {
		newErr.Stack = captureStack(2)
	}
	return &newErr
}

func (e *AppError) WithRetry() *AppError {
	newErr := *e
	newErr.Retryable = true
	return &newErr
}

func (e *AppError) WithRemedy(r string) *AppError {
	newErr := *e
	newErr.Remedy = r
	return &newErr
}

func (e *AppError) WithInternal(err error) *AppError {
	newErr := *e
	newErr.Internal = err
	if newErr.Stack == "" {
		newErr.Stack = captureStack(2)
	}
	return &newErr
}

// WithMsg заменяет стандартное PublicMsg (то, что увидит пользователь).
func (e *AppError) WithMsg(msg string) *AppError {
	newErr := *e
	newErr.PublicMsg = msg
	return &newErr
}

// WithMsgf — форматированная версия WithMsg.
func (e *AppError) WithMsgf(format string, args ...any) *AppError {
	newErr := *e
	newErr.PublicMsg = fmt.Sprintf(format, args...)
	return &newErr
}

// Msg — хелпер для быстрого создания ошибки из Sentinel с кастомным сообщением.
func Msg(sentinel *AppError, msg string) *AppError {
	newErr := *sentinel
	newErr.PublicMsg = msg
	newErr.Stack = captureStack(2)
	return &newErr
}

// captureStack собирает цепочку вызовов для отладки.
func captureStack(skip int) string {
	pc := make([]uintptr, 10)
	n := runtime.Callers(skip+1, pc)
	if n == 0 {
		return ""
	}
	frames := runtime.CallersFrames(pc[:n])
	var sb strings.Builder
	for {
		frame, more := frames.Next()
		// Игнорируем стандартную библиотеку для чистоты вывода
		if !strings.Contains(frame.File, "runtime/") {
			fmt.Fprintf(&sb, "%s:%d\n", frame.File, frame.Line)
		}
		if !more {
			break
		}
	}
	return sb.String()
}

var Is = errors.Is
var As = errors.As
var Join = errors.Join
