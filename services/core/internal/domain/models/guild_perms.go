package models

const AllGuildPermissions GuildPermission = ^GuildPermission(0)

type GuildPermission int64

//goland:noinspection GoMixedReceiverTypes
func (p GuildPermission) Has(flag GuildPermission) bool {
	return p&flag != 0
}

//goland:noinspection GoMixedReceiverTypes
func (p GuildPermission) HasAll(flags GuildPermission) bool {
	return p&flags == flags
}

//goland:noinspection GoMixedReceiverTypes
func (p GuildPermission) HasAny(flags GuildPermission) bool {
	return p&flags != 0
}

//goland:noinspection GoMixedReceiverTypes
func (p *GuildPermission) Add(flag GuildPermission) {
	*p |= flag
}

//goland:noinspection GoMixedReceiverTypes
func (p *GuildPermission) Remove(flag GuildPermission) {
	*p &^= flag
}

func (p GuildPermission) Without(flags GuildPermission) GuildPermission {
	return p &^ flags
}

func (p GuildPermission) With(flags GuildPermission) GuildPermission {
	return p | flags
}

func (p GuildPermission) Can(flag GuildPermission) bool {
	if p.Has(PermAdministrator) {
		return true
	}
	return p.Has(flag)
}

func CalculatePermissions(base GuildPermission, overwrites []ChannelPermissionOverwrite) GuildPermission {
	if base.Has(PermAdministrator) {
		return AllGuildPermissions // Возвращаем все биты в 1
	}

	perms := base

	for _, ow := range overwrites {
		perms = perms.
			Without(ow.Deny).
			With(ow.Allow)
	}
	return perms
}

// ApplyOverwrite применяет разрешающие и запрещающие маски.
// Сначала снимаются запреты, затем накладываются разрешения.
func ApplyOverwrite(
	perms GuildPermission,
	allow GuildPermission,
	deny GuildPermission,
) GuildPermission {
	perms = perms.Without(deny)
	perms = perms.With(allow)
	return perms
}

func (p GuildPermission) IsAdmin() bool {
	return p.Has(PermAdministrator)
}

// Битовые маски прав (до 64 различных пермиссий в одном int64)
const (
	PermViewChannels GuildPermission = 1 << iota
	PermSendMessages
	PermManageMessages
	PermManageChannels
	PermManageGuild
	PermManageRoles
	PermKickMembers
	PermBanMembers
	PermAttachFiles
	PermAddReactions
	PermConnectVoice
	PermSpeakVoice
	PermMuteMembers
	PermAdministrator // обходит остальные проверки
	PermCreateInvites
	PermManageThreads
)
