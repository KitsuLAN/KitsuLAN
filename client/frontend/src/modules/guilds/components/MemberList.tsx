import { ScrollArea } from "@/uikit/scroll-area";
import { Avatar, AvatarFallback } from "@/uikit/avatar";
import { StatusDot } from "@/uikit/status-dot";
import { ListItem, ListGroupHeader } from "@/uikit/list-item";
import { useActiveMembers } from "@/modules/guilds/guildStore";
import type { Member } from "@/api/wails";
import { cn } from "@/uikit/lib/utils";

function MemberItem({ member }: { member: Member }) {
  const displayName = member.nickname || member.username || "Unknown";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isOnline = member.is_online ?? false;

  // Динамически определяем статус (можно расширить на away/dnd позже)
  const currentStatus = isOnline ? "online" : "offline";

  return (
      <ListItem
          className={cn(!isOnline && "opacity-50")}
          content={
            <div className="flex items-center gap-1.5">
              <div className="relative shrink-0">
                {/* Квадратный аватар */}
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                {/* Динамическая статус-точка с обводкой под цвет фона панели */}
                <StatusDot
                    status={currentStatus}
                    className="absolute bottom-px right-px size-1"
                />
              </div>
              <span className="truncate">{displayName}</span>
            </div>
          }
      />
  );
}

export function MemberList() {
  const members = useActiveMembers();
  const onlineMembers = members.filter((m) => m.is_online);
  const offlineMembers = members.filter((m) => !m.is_online);

  return (
      <aside className="flex w-52 min-w-52 shrink-0 flex-col border-l border-kitsu-s4 bg-kitsu-s1 transition-transform">
        {/* Заголовок панели */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-3">
        <span className="flex-1 font-mono text-xs font-semibold uppercase tracking-widest text-fg-dim">
          Участники
        </span>
          <span className="font-mono text-xs text-fg-dim">
          {onlineMembers.length} в сети
        </span>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1.5">
            {onlineMembers.length > 0 && (
                <>
                  <ListGroupHeader>Online — {onlineMembers.length}</ListGroupHeader>
                  {onlineMembers.map((m) => (
                      <MemberItem key={m.user_id} member={m} />
                  ))}
                </>
            )}

            {offlineMembers.length > 0 && (
                <>
                  <div className="mt-2" />
                  <ListGroupHeader>Offline — {offlineMembers.length}</ListGroupHeader>
                  {offlineMembers.map((m) => (
                      <MemberItem key={m.user_id} member={m} />
                  ))}
                </>
            )}

            {members.length === 0 && (
                <p className="px-2.5 py-1 font-mono text-xs text-fg-muted/40">
                  Нет участников
                </p>
            )}
          </div>
        </ScrollArea>
      </aside>
  );
}