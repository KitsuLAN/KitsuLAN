package errors

import (
	"fmt"

	"google.golang.org/grpc/codes"
)

// --- Static Errors (Sentinels) ---
// Их можно использовать для простых проверок: if errors.Is(err, errors.ErrUserNotFound)

// --- Common Business Logic Errors ---
var (
	ErrInternal       = New(CodeInternal, "An internal server error occurred.", codes.Internal)
	ErrBadRequest     = New(CodeBadRequest, "Your request is invalid.", codes.InvalidArgument)
	ErrNotFound       = New(CodeNotFound, "The requested resource was not found.", codes.NotFound)
	ErrUnauthorized   = New(CodeUnauthorized, "You are not authenticated.", codes.Unauthenticated)
	ErrForbidden      = New(CodeForbidden, "You do not have permission to perform this action.", codes.PermissionDenied)
	ErrRateLimit      = New(CodeRateLimited, "You are being rate-limited.", codes.ResourceExhausted)
	ErrConflict       = New(CodeConflict, "A resource with the same identity already exists.", codes.AlreadyExists)
	ErrNotImplemented = New(CodeNotImplemented, "This feature is not yet implemented.", codes.Unimplemented)
)

// --- Auth & User ---
var (
	ErrInvalidCredentials = New(CodeInvalidCredentials, "Invalid username or password.", codes.Unauthenticated)
	ErrTokenExpired       = New(CodeTokenExpired, "Your session has expired. Please log in again.", codes.Unauthenticated)
	ErrTokenInvalid       = New(CodeTokenInvalid, "Authentication token is invalid or malformed.", codes.Unauthenticated)
	ErrMfaRequired        = New(CodeMfaRequired, "Multi-factor authentication is required.", codes.PermissionDenied)
	ErrAccountSuspended   = New(CodeAccountSuspended, "Your account is suspended.", codes.PermissionDenied)
	ErrUserNotFound       = New(CodeUserNotFound, "User not found.", codes.NotFound)
	ErrEmailTaken         = New(CodeEmailTaken, "This email is already in use.", codes.AlreadyExists)
	ErrUsernameTaken      = New(CodeUsernameTaken, "This username is already taken.", codes.AlreadyExists)
	ErrIpBanned           = New(CodeIpBanned, "Your IP address has been banned.", codes.PermissionDenied)
	ErrCaptchaRequired    = New(CodeCaptchaRequired, "Captcha verification is required.", codes.PermissionDenied)
)

// --- Guilds, Channels, Roles ---
var (
	ErrGuildNotFound       = New(CodeGuildNotFound, "Guild not found.", codes.NotFound)
	ErrChannelNotFound     = New(CodeChannelNotFound, "Channel not found.", codes.NotFound)
	ErrRoleNotFound        = New(CodeRoleNotFound, "Role not found.", codes.NotFound)
	ErrMemberNotFound      = New(CodeMemberNotFound, "Member not found.", codes.NotFound)
	ErrMaxGuilds           = New(CodeMaxGuildsReached, "You have reached the maximum number of guilds you can join.", codes.ResourceExhausted)
	ErrBannedFromGuild     = New(CodeBannedFromGuild, "You are banned from this guild.", codes.PermissionDenied)
	ErrInviteInvalid       = New(CodeInviteInvalid, "This invite is invalid or has expired.", codes.NotFound)
	ErrInvitesDisabled     = New(CodeInvitesDisabled, "Invites are disabled for this guild.", codes.FailedPrecondition)
	ErrUserNotInVoice      = New(CodeUserNotInVoice, "You are not in a voice channel.", codes.FailedPrecondition)
	ErrRolePositionTooHigh = New(CodeRolePositionTooHigh, "Cannot manage a role with a higher or equal position.", codes.PermissionDenied)
	ErrOwnerCannotLeave    = New(CodeOwnerCannotLeave, "The owner cannot leave the guild.", codes.PermissionDenied)
)

// --- Messaging & Media ---
var (
	ErrMessageNotFound = New(CodeMessageNotFound, "Message not found.", codes.NotFound)
	ErrSlowmode        = New(CodeSlowmodeActive, "Slowmode is active in this channel.", codes.ResourceExhausted)
	ErrMessageTooLong  = New(CodeMessageTooLong, "Message content is too long.", codes.InvalidArgument)
	ErrCannotSendEmpty = New(CodeMessageEmpty, "Cannot send an empty message.", codes.InvalidArgument)
	ErrFileTooLarge    = New(CodeFileTooLarge, "The uploaded file is too large.", codes.InvalidArgument)
	ErrMalwareDetected = New(CodeMalwareDetected, "A virus was detected in the uploaded file.", codes.InvalidArgument)
	ErrStorageQuota    = New(CodeStorageQuota, "You have exceeded your storage quota.", codes.ResourceExhausted)
)

// --- Federation & P2P (KitsuLAN specific) ---
var (
	ErrRealmNotInitialized = New(CodeFedRealmNotInitialized, "This realm is not configured yet.", codes.FailedPrecondition)
	ErrRealmUnreachable    = New(CodeFedRealmUnreachable, "The remote server could not be reached.", codes.Unavailable)
	ErrSignatureInvalid    = New(CodeFedSignatureInvalid, "Federation message signature is invalid.", codes.PermissionDenied)
	ErrFederationDisabled  = New(CodeFedDisabled, "Federation is disabled on this server.", codes.FailedPrecondition)
	ErrPeerConnectionFail  = New(CodePeerConnectionFail, "Failed to connect to peer for file transfer.", codes.Unavailable)
	ErrRealmBlocked        = New(CodeFedRealmBlocked, "This realm is blocked by administrator.", codes.PermissionDenied)
)

// --- Infrastructure (For internal use, client sees 'Internal Server Error') ---
var (
	ErrDBUnavailable    = New(CodeDBConnectionError, "Database service is temporarily unavailable.", codes.Unavailable)
	ErrDBQueryFailed    = New(CodeDBQueryFailed, "Failed to execute database query.", codes.Internal)
	ErrConcurrentUpdate = New(CodeStaleObjectState, "This resource was modified by another request. Please try again.", codes.Aborted)
	ErrCacheUnavailable = New(CodeCacheUnavailable, "Cache service is temporarily unavailable.", codes.Unavailable)
	ErrStorageDown      = New(CodeS3Unreachable, "Media storage service is temporarily unavailable.", codes.Unavailable)
)

// --- Dynamic Errors (Constructors) ---
// Используются, когда нужно передать параметры (как в TS классах data: {...})

// InviteError — когда с инвайтом что-то не так.
func InviteError(code ErrorCode, inviteCode string) *AppError {
	var msg string
	switch code {
	case CodeInviteExpired:
		msg = fmt.Sprintf("Invite code '%s' has expired.", inviteCode)
	case CodeInviteMaxUses:
		msg = fmt.Sprintf("Invite code '%s' has reached its usage limit.", inviteCode)
	default:
		msg = fmt.Sprintf("Invite code '%s' is invalid.", inviteCode)
	}
	return New(code, msg, codes.NotFound).WithMeta("invite_code", inviteCode)
}

// LimitReached — для любых лимитов (Guilds, Emojis, Channels).
func LimitReached(resource string, limit int) *AppError {
	code := ErrorCode(fmt.Sprintf("MAX_%s_REACHED", resource))
	return New(code, fmt.Sprintf("You have reached the limit of %d %s.", limit, resource), codes.ResourceExhausted).
		WithMeta("limit", limit).
		WithMeta("resource", resource)
}

// RateLimit создает ошибку лимита запросов.
func RateLimit(retryAfter float64, global bool) *AppError {
	return New(CodeRateLimited, "You are being rate limited.", codes.ResourceExhausted).
		WithMeta("retry_after", retryAfter).
		WithMeta("global", global)
}

// Slowmode создает ошибку слоумода в канале.
func Slowmode(retryAfter float64) *AppError {
	return New(CodeSlowmodeActive, fmt.Sprintf("Slowmode is active. Wait %.1f seconds.", retryAfter), codes.ResourceExhausted).
		WithMeta("retry_after", retryAfter)
}

// MaxResourceReached создает ошибку превышения лимита (Guilds, Channels, Emojis).
// Универсальный конструктор для всех Max...Error.
func MaxResourceReached(code ErrorCode, resourceName string, limit int) *AppError {
	msg := fmt.Sprintf("Maximum number of %s reached (%d).", resourceName, limit)
	return New(code, msg, codes.ResourceExhausted).
		WithMeta("limit", limit).
		WithMeta("resource", resourceName)
}

// SuspiciousActivity сигнализирует о срабатывании анти-фрод системы.
func SuspiciousActivity(flags int) *AppError {
	return New(CodeSuspiciousActivity, "Your account flagged for suspicious activity. Verification required.", codes.PermissionDenied).
		WithMeta("suspicious_flags", flags)
}

// ExplicitContent сигнализирует о блокировке контента фильтром.
func ExplicitContent(probability float64, filterName string) *AppError {
	return New(CodeExplicitContent, "Content blocked by safety filter.", codes.InvalidArgument).
		WithMeta("probability", probability).
		WithMeta("filter_source", filterName)
}

// InvalidArgument возвращает ошибку валидации конкретного поля.
func InvalidArgument(field, reason string) *AppError {
	return New(CodeBadRequest, fmt.Sprintf("Invalid argument in field '%s': %s", field, reason), codes.InvalidArgument).
		WithMeta("field", field).
		WithMeta("reason", reason)
}

// FederationSyncError ошибка при рассинхроне между реалмами.
func FederationSyncError(remoteRealm string, driftMs int64) *AppError {
	return New(CodeFedClockSkew, "Time sync error with remote realm.", codes.FailedPrecondition).
		WithMeta("remote_realm", remoteRealm).
		WithMeta("clock_drift_ms", driftMs)
}

// FederationVersionError — при конфликте версий протоколов.
func FederationVersionError(remoteRealm string, remoteVer, localVer string) *AppError {
	return New(CodeFedVersionIncompatible, "Incompatible federation protocol version.", codes.FailedPrecondition).
		WithMeta("remote_realm", remoteRealm).
		WithMeta("remote_version", remoteVer).
		WithMeta("local_version", localVer)
}

// FederationError — ошибка для S2S взаимодействия.
func FederationError(code ErrorCode, remoteRealm string, cause error) *AppError {
	return New(code, fmt.Sprintf("Federation failure with %s", remoteRealm), codes.Unavailable).
		WithMeta("remote_realm", remoteRealm).
		WithInternal(cause).
		WithRetry()
}

// PermissionError — детальная ошибка прав.
func PermissionError(missingPerm string, guildID string) *AppError {
	return New(CodePermMissing, "Insufficient permissions.", codes.PermissionDenied).
		WithMeta("required_perm", missingPerm).
		WithMeta("guild_id", guildID)
}

// ValidationError — для ошибок ввода (вместо generic "bad request").
func ValidationError(field string, reason string) *AppError {
	return New(CodeBadRequest, fmt.Sprintf("Validation failed for '%s': %s", field, reason), codes.InvalidArgument).
		WithMeta("field", field).
		WithMeta("reason", reason)
}

// TorrentError — для ошибок P2P раздачи.
func TorrentError(code ErrorCode, infoHash string, detail string) *AppError {
	return New(code, fmt.Sprintf("Torrent error [%s]: %s", infoHash, detail), codes.Internal).
		WithMeta("info_hash", infoHash).
		WithMeta("detail", detail)
}

// E2eeKeyError — когда ключи шифрования не совпадают.
func E2eeKeyError(userID string, deviceID string) *AppError {
	return New(CodeE2eeKeyNotFound, "Encryption key not found for device.", codes.FailedPrecondition).
		WithMeta("user_id", userID).
		WithMeta("device_id", deviceID)
}
