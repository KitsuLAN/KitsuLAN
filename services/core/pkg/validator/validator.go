package validator

import (
	"regexp"
	"strings"

	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
)

var (
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_.-]+$`)
	emailRegex    = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

func ValidateCredentials(username, password string) *errors.AppError {
	username = strings.TrimSpace(username)

	if len(username) < 3 {
		return errors.ValidationError("username", "Must be at least 3 characters").
			WithRemedy("Please choose a longer username.")
	}
	if len(username) > 32 {
		return errors.ValidationError("username", "Must be at most 32 characters")
	}
	if !usernameRegex.MatchString(username) {
		return errors.ValidationError("username", "Contains invalid characters").
			WithRemedy("Use only letters, numbers, underscores, dots, and hyphens.")
	}

	if len(password) < 8 {
		return errors.ValidationError("password", "Too short").
			WithRemedy("Password must be at least 8 characters long.")
	}
	// Можно добавить проверку на сложность (цифры, спецсимволы) тут же
	return nil
}

func ValidateGuildName(name string) *errors.AppError {
	name = strings.TrimSpace(name)
	if len(name) < 2 || len(name) > 100 {
		return errors.ValidationError("name", "Must be between 2 and 100 characters")
	}
	return nil
}

func ValidateChannelName(name string) *errors.AppError {
	name = strings.TrimSpace(name)
	if len(name) < 1 || len(name) > 100 {
		return errors.ValidationError("name", "Must be between 1 and 100 characters")
	}
	// Для каналов обычно запрещают пробелы или спецсимволы, но оставим мягкую проверку
	return nil
}
