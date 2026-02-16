import { ScrollArea } from "@/uikit/scroll-area";
import { Avatar, AvatarFallback } from "@/uikit/avatar";
import { useActiveMembers } from "@/modules/guilds/guildStore";
import type { Member } from "@/api/wails";
import { cn } from "@/uikit/lib/utils";

function MemberItem({ member }: { member: Member }) {
  const displayName = member.nickname || member.username || "?";
  const isOnline = member.is_online ?? false;

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-kitsu-s2",
        !isOnline && "opacity-40"
      )}
    >
      <div className="relative shrink-0">
        <Avatar size="sm">
          <AvatarFallback className="bg-kitsu-s3 text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-kitsu-s1",
            isOnline ? "bg-kitsu-online" : "bg-kitsu-offline"
          )}
        />
      </div>
      <div className="min-w-0 text-left">
        <div className="truncate text-[13px] text-foreground">
          {displayName}
        </div>
      </div>
    </button>
  );
}

export function MemberList() {
  const members = useActiveMembers();
  const onlineMembers = members.filter((m) => m.is_online);
  const offlineMembers = members.filter((m) => !m.is_online);

  return (
    <aside className="flex w-52 shrink-0 flex-col border-l border-kitsu-s4 bg-kitsu-s1">
      <ScrollArea className="flex-1 px-2 py-3">
        {onlineMembers.length > 0 && (
          <>
            <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Online — {onlineMembers.length}
            </p>
            {onlineMembers.map((m) => (
              <MemberItem key={m.user_id} member={m} />
            ))}
            {offlineMembers.length > 0 && (
              <div className="my-2 border-t border-kitsu-s4" />
            )}
          </>
        )}
        {offlineMembers.length > 0 && (
          <>
            <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Offline — {offlineMembers.length}
            </p>
            {offlineMembers.map((m) => (
              <MemberItem key={m.user_id} member={m} />
            ))}
          </>
        )}
        {members.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground/40">
            Нет участников
          </p>
        )}
      </ScrollArea>
    </aside>
  );
}
