package util

// Map преобразует срез типа T в срез типа U, применяя функцию fn к каждому элементу по ссылке.
// Передача по ссылке (*T) позволяет избежать копирования больших структур (доменных моделей).
func Map[T any, U any](input []T, fn func(*T) U) []U {
	if input == nil {
		return nil
	}
	result := make([]U, len(input))
	for i := range input {
		result[i] = fn(&input[i])
	}
	return result
}
