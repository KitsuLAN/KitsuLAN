package errors

// ErrorCode — строковый код ошибки для клиента (машинно-читаемый).
type ErrorCode string

const (
	// --- General ---

	CodeUnknown            ErrorCode = "UNKNOWN_ERROR"
	CodeInternal           ErrorCode = "INTERNAL_SERVER_ERROR"
	CodeBadRequest         ErrorCode = "BAD_REQUEST"
	CodeNotFound           ErrorCode = "NOT_FOUND"
	CodeNotImplemented     ErrorCode = "NOT_IMPLEMENTED"
	CodeUnauthorized       ErrorCode = "UNAUTHORIZED"
	CodeForbidden          ErrorCode = "FORBIDDEN"
	CodeTimeout            ErrorCode = "TIMEOUT"
	CodeConflict           ErrorCode = "CONFLICT"
	CodeRateLimited        ErrorCode = "RATE_LIMITED"
	CodeServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"
	CodeServiceBusy        ErrorCode = "SERVICE_BUSY"

	// --- Auth & Security  ---

	CodeAuthMissing         ErrorCode = "AUTH_HEADER_MISSING"
	CodeTokenMalformed      ErrorCode = "TOKEN_FORMAT_INVALID"
	CodeInvalidCredentials  ErrorCode = "INVALID_CREDENTIALS"
	CodeTokenExpired        ErrorCode = "TOKEN_EXPIRED"
	CodeTokenInvalid        ErrorCode = "TOKEN_INVALID"
	CodeTokenSignature      ErrorCode = "TOKEN_SIGNATURE_INVALID"
	CodeTokenRevoked        ErrorCode = "TOKEN_REVOKED"
	CodeMfaRequired         ErrorCode = "MFA_REQUIRED"
	CodeMfaInvalid          ErrorCode = "MFA_INVALID"
	CodeAccountSuspended    ErrorCode = "ACCOUNT_SUSPENDED"
	CodeAccountDeactivated  ErrorCode = "ACCOUNT_DEACTIVATED"
	CodeSessionExpired      ErrorCode = "SESSION_EXPIRED"
	CodeSessionInvalid      ErrorCode = "SESSION_INVALID"
	CodeIpBanned            ErrorCode = "IP_BANNED"
	CodeCaptchaRequired     ErrorCode = "CAPTCHA_REQUIRED"
	CodeUserEmailUnverified ErrorCode = "USER_EMAIL_UNVERIFIED"
	CodeEmailTaken          ErrorCode = "EMAIL_ALREADY_IN_USE"
	CodeUsernameTaken       ErrorCode = "USERNAME_ALREADY_TAKEN"
	CodePasswordWeak        ErrorCode = "PASSWORD_TOO_WEAK"
	CodeUserNotFound        ErrorCode = "USER_NOT_FOUND"
	CodeExplicitContent     ErrorCode = "EXPLICIT_CONTENT_DETECTED"
	CodeSuspiciousActivity  ErrorCode = "SUSPICIOUS_ACTIVITY_DETECTED"

	// --- Guilds & Hierarchy ---

	CodeGuildNotFound       ErrorCode = "GUILD_NOT_FOUND"
	CodeGuildBanned         ErrorCode = "GUILD_ACCESS_BANNED"
	CodeGuildOwnerOnly      ErrorCode = "GUILD_OWNER_ONLY_ACTION"
	CodeMemberAlreadyExists ErrorCode = "GUILD_MEMBER_ALREADY_JOINED"
	CodeBannedFromGuild     ErrorCode = "BANNED_FROM_GUILD"
	CodeGuildJoinLimit      ErrorCode = "GUILD_JOIN_LIMIT"
	CodeChannelNotFound     ErrorCode = "CHANNEL_NOT_FOUND"
	CodeRoleNotFound        ErrorCode = "ROLE_NOT_FOUND"
	CodeMemberNotFound      ErrorCode = "MEMBER_NOT_FOUND"
	CodeInviteInvalid       ErrorCode = "INVITE_CODE_INVALID"
	CodeInviteNotFound      ErrorCode = "INVITE_CODE_NOT_FOUND"
	CodeInviteExpired       ErrorCode = "INVITE_CODE_EXPIRED"
	CodeInviteMaxUses       ErrorCode = "INVITE_MAX_USES_REACHED"
	CodeInviteNoPermissions ErrorCode = "INVITE_CREATE_NO_PERMS"
	CodeInvitesDisabled     ErrorCode = "INVITES_DISABLED"
	CodeUserNotInVoice      ErrorCode = "USER_NOT_IN_VOICE"
	CodeVoiceFull           ErrorCode = "VOICE_CHANNEL_FULL"
	CodeCannotEditOwner     ErrorCode = "CANNOT_MODIFY_OWNER"
	CodeOwnerCannotLeave    ErrorCode = "OWNER_CANNOT_LEAVE"

	// --- Permissions ---

	CodePermMissing         ErrorCode = "PERMISSION_INSUFFICIENT"
	CodeRolePositionTooHigh ErrorCode = "ROLE_POSITION_TOO_HIGH"
	CodeChannelAccessDenied ErrorCode = "CHANNEL_ACCESS_DENIED"

	// --- Resource Limits ---

	CodeMaxGuildsReached    ErrorCode = "MAX_GUILDS_REACHED"
	CodeMaxChannelsReached  ErrorCode = "MAX_CHANNELS_REACHED"
	CodeMaxRolesReached     ErrorCode = "MAX_ROLES_REACHED"
	CodeMaxMembersReached   ErrorCode = "MAX_MEMBERS_REACHED"
	CodeMaxFriendsReached   ErrorCode = "MAX_FRIENDS_REACHED"
	CodeMaxPinsReached      ErrorCode = "MAX_PINS_REACHED"
	CodeMaxReactionsReached ErrorCode = "MAX_REACTIONS_REACHED"
	CodeMaxEmojisReached    ErrorCode = "MAX_EMOJIS_REACHED"

	// --- Messaging ---

	CodeMessageNotFound     ErrorCode = "MESSAGE_NOT_FOUND"
	CodeMessageEmpty        ErrorCode = "MESSAGE_CONTENT_EMPTY"
	CodeMessageTooLong      ErrorCode = "MESSAGE_TOO_LONG"
	CodeEditWindowExpired   ErrorCode = "MESSAGE_EDIT_WINDOW_EXPIRED"
	CodeDeleteWindowExpired ErrorCode = "MESSAGE_DELETE_WINDOW_EXPIRED"
	CodeMessageFiltered     ErrorCode = "MESSAGE_CONTENT_FILTERED"
	CodeSlowmodeActive      ErrorCode = "SLOWMODE_RATE_LIMITED"
	CodeReactionLimit       ErrorCode = "REACTION_LIMIT_REACHED"
	CodeEditNotAllowed      ErrorCode = "MESSAGE_EDIT_NOT_ALLOWED"

	// --- Media & Files ---

	CodeFileEmpty           ErrorCode = "FILE_EMPTY"
	CodeFileTooLarge        ErrorCode = "FILE_SIZE_LIMIT_EXCEEDED"
	CodeFileExtensionDenied ErrorCode = "FILE_EXTENSION_BLOCKED"
	CodeFileMimeMismatch    ErrorCode = "FILE_CONTENT_MIME_MISMATCH"
	CodeFileTypeInvalid     ErrorCode = "FILE_TYPE_INVALID"
	CodeStorageQuota        ErrorCode = "STORAGE_QUOTA_EXCEEDED"
	CodeMalwareDetected     ErrorCode = "MALWARE_DETECTED" // VirusScanService

	// --- Federation ---

	CodeFedRealmNotInitialized ErrorCode = "REALM_NOT_INITIALIZED"
	CodeFederationFailed       ErrorCode = "FEDERATION_FAILED"
	CodeFedRealmBlocked        ErrorCode = "FEDERATION_REALM_BLACKLISTED"
	CodeFedRealmNotFound       ErrorCode = "FEDERATION_REALM_NOT_FOUND"
	CodeFedRealmUnreachable    ErrorCode = "FEDERATION_REALM_UNREACHABLE"
	CodeFedSignatureInvalid    ErrorCode = "FEDERATION_SIGNATURE_INVALID"   // Ed25519 check failed
	CodeFedTrustLevelLow       ErrorCode = "FEDERATION_TRUST_LEVEL_TOO_LOW" // Not whitelisted
	CodeFedDisabled            ErrorCode = "FEDERATION_DISABLED"
	CodeFedUserIsRemote        ErrorCode = "USER_IS_REMOTE" // Cannot modify remote user locally
	CodeFedIdKeyMismatch       ErrorCode = "FEDERATION_ID_KEY_MISMATCH"
	CodeFedClockSkew           ErrorCode = "FEDERATION_CLOCK_SKEW"
	CodeFedVersionIncompatible ErrorCode = "FEDERATION_VERSION_INCOMPATIBLE"
	CodeFedHandshakeFail       ErrorCode = "FEDERATION_HANDSHAKE_FAILED"

	// --- P2P & Torrent ---

	CodeS3Unreachable      ErrorCode = "S3_UNREACHABLE"
	CodeTorrentHashFail    ErrorCode = "TORRENT_HASH_MISMATCH"
	CodeTorrentSpawnError  ErrorCode = "TORRENT_DAEMON_ERROR"
	CodeTorrentInvalid     ErrorCode = "TORRENT_INVALID"
	CodeTorrentNoSeeds     ErrorCode = "TORRENT_NO_SEEDS_AVAILABLE"
	CodeMagnetInvalid      ErrorCode = "MAGNET_INVALID"
	CodeMagnetMalformed    ErrorCode = "MAGNET_URI_MALFORMED"
	CodeTrackerError       ErrorCode = "TRACKER_ERROR"
	CodePeerConnectionFail ErrorCode = "PEER_CONNECTION_FAILED"
	CodeHybridStorageError ErrorCode = "HYBRID_STORAGE_ERROR" // S3 + Torrent sync issue
	CodeDhtBootstrapFailed ErrorCode = "DHT_BOOTSTRAP_FAILED"
	CodeDhtRecordNotFound  ErrorCode = "DHT_RECORD_NOT_FOUND"
	CodeDhtLookupTimeout   ErrorCode = "DHT_NODE_LOOKUP_TIMEOUT"
	CodePeerChoked         ErrorCode = "P2P_PEER_CHOKED_CONNECTION"

	// Database

	CodeDBConnectionError ErrorCode = "DB_CONNECTION_ERROR"
	CodeDBQueryFailed     ErrorCode = "DB_QUERY_FAILED"
	CodeDBMigrationFailed ErrorCode = "DB_MIGRATION_FAILED"
	CodeStaleObjectState  ErrorCode = "DB_STALE_OBJECT_STATE" // Для Optimistic Locking
	CodeDBDeadlock        ErrorCode = "DB_DEADLOCK"
	CodeDBUniqueViolation ErrorCode = "DB_UNIQUE_VIOLATION"

	// Caching & Redis

	CodeCacheUnavailable   ErrorCode = "CACHE_UNAVAILABLE"
	CodeCacheSerialization ErrorCode = "CACHE_SERIALIZATION_FAILED"

	// Workers & Background Tasks

	CodeWorkerPoolFull    ErrorCode = "WORKER_POOL_FULL"
	CodeTaskTimeout       ErrorCode = "BACKGROUND_TASK_TIMEOUT"
	CodeOutboxPublishFail ErrorCode = "OUTBOX_PUBLISH_FAILED"

	// Network & Gateway

	CodeUpstreamTimeout ErrorCode = "UPSTREAM_TIMEOUT"
	CodeGatewayClosed   ErrorCode = "GATEWAY_CLOSED_ABRUPTLY"

	// --- Security / E2EE ---

	CodeE2eeKeyNotFound    ErrorCode = "E2EE_PUBLIC_KEY_NOT_FOUND"
	CodeE2eeSigInvalid     ErrorCode = "E2EE_MESSAGE_SIG_INVALID"
	CodeE2eeDeviceMismatch ErrorCode = "E2EE_DEVICE_ID_MISMATCH"
)
