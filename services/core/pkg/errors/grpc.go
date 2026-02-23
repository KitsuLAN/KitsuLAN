package errors

import (
	"errors"
	"fmt"

	"google.golang.org/genproto/googleapis/rpc/errdetails"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ToGRPC превращает внутреннюю ошибку в богатый gRPC-ответ.
func ToGRPC(err error) error {
	if err == nil {
		return nil
	}

	var appErr *AppError
	if !errors.As(err, &appErr) {
		// Если это не наша ошибка, превращаем ее в Internal
		// Но мы не раскрываем текст оригинальной ошибки клиенту!
		st := status.New(codes.Internal, "Internal server error")
		return st.Err()
	}

	// Создаем базовый gRPC статус с публичным сообщением
	st := status.New(appErr.Status, appErr.PublicMsg)

	// Формируем детальное описание ошибки
	errorInfo := &errdetails.ErrorInfo{
		Reason:   string(appErr.Code),
		Domain:   "kitsulan.v1",
		Metadata: make(map[string]string),
	}

	// Заполняем Metadata строковыми значениями
	for k, v := range appErr.Meta {
		errorInfo.Metadata[k] = fmt.Sprintf("%v", v)
	}

	// Если есть операция (Op), добавляем ее для трассировки
	if appErr.Op != "" {
		errorInfo.Metadata["operation"] = appErr.Op
	}

	// Прикрепляем стандартный gRPC ErrorInfo.
	// Фронтенд сможет легко распарсить это и написать `if err.code === 'RATE_LIMITED' ...`
	richStatus, detailsErr := st.WithDetails(errorInfo)

	if detailsErr == nil {
		return richStatus.Err()
	}

	// Фолбек, если сериализация деталей сломалась
	return st.Err()
}
