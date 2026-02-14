import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUsername, useAuthActions } from "@/stores/authStore";
import {
  useActiveGuildID,
  useActiveChannelID,
  useActiveChannels,
  useGuilds,
  useGuildActions,
} from "@/stores/guildStore";
import { CreateChannelModal } from "@/components/layout/CreateChannelModal";
import { InviteModal } from "@/components/layout/InviteModal";
import { CHANNEL_TYPE_VOICE } from "@/lib/wails";
import type { Channel } from "@/lib/wails";
import { cn } from "@/lib/utils";

function ChannelItem({
  channel,
  active,
  onClick,
}: {
  channel: Channel;
  active: boolean;
  onClick: () => void;
}) {
  const isVoice = channel.type === CHANNEL_TYPE_VOICE;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-kitsu-s3 text-foreground"
          : "text-muted-foreground hover:bg-kitsu-s2 hover:text-foreground"
      )}
    >
      <span className="shrink-0 text-base opacity-60">
        {isVoice ? "🔊" : "#"}
      </span>
      <span className="truncate">{channel.name}</span>
    </button>
  );
}

export function ChannelPanel() {
  const username = useUsername();
  const { logout } = useAuthActions();
  const guilds = useGuilds();
  const activeGuildID = useActiveGuildID();
  const activeChannelID = useActiveChannelID();
  const channels = useActiveChannels();
  const { selectChannel } = useGuildActions();

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const activeGuild = guilds.find((g) => g.id === activeGuildID);
  const textChannels = useMemo(
    () => channels.filter((c) => c.type !== CHANNEL_TYPE_VOICE),
    [channels]
  );
  const voiceChannels = useMemo(
    () => channels.filter((c) => c.type === CHANNEL_TYPE_VOICE),
    [channels]
  );

  return (
    <>
      <aside className="flex w-60 shrink-0 flex-col border-r border-kitsu-s4 bg-kitsu-s1">
        {/* Guild header */}
        <div className="flex h-12 shrink-0 items-center border-b border-kitsu-s4 px-4">
          <span className="flex-1 truncate text-sm font-bold">
            {activeGuild?.name ?? "Выберите сервер"}
          </span>
          {activeGuildID && (
            <button
              title="Пригласить"
              onClick={() => setShowInviteModal(true)}
              className="rounded p-1 text-sm text-muted-foreground hover:bg-kitsu-s2 hover:text-foreground transition-colors"
            >
              👤+
            </button>
          )}
        </div>

        {/* Каналы */}
        <ScrollArea className="flex-1 px-2 py-3">
          {textChannels.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Текстовые
                </span>
                {activeGuildID && (
                  <button
                    onClick={() => setShowChannelModal(true)}
                    className="text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    +
                  </button>
                )}
              </div>
              {textChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  active={activeChannelID === ch.id}
                  onClick={() => selectChannel(ch.id!)}
                />
              ))}
            </div>
          )}

          {voiceChannels.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Голосовые
                </span>
              </div>
              {voiceChannels.map((ch) => (
                <ChannelItem
                  key={ch.id}
                  channel={ch}
                  active={activeChannelID === ch.id}
                  onClick={() => selectChannel(ch.id!)}
                />
              ))}
            </div>
          )}

          {channels.length === 0 && activeGuildID && (
            <div className="flex flex-col items-start gap-2 px-1">
              <p className="text-xs text-muted-foreground/40">Нет каналов</p>
              <button
                onClick={() => setShowChannelModal(true)}
                className="text-xs text-primary hover:underline"
              >
                + Создать канал
              </button>
            </div>
          )}
        </ScrollArea>

        {/* User panel */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-t border-kitsu-s4 bg-kitsu-s2 px-2">
          <div className="relative">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {username?.slice(0, 2).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-kitsu-online ring-2 ring-kitsu-s2" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{username}</div>
            <div className="text-[11px] text-kitsu-online">Online</div>
          </div>
          <div className="flex items-center gap-0.5">
            {["🎙", "🔈", "⚙"].map((icon) => (
              <button
                key={icon}
                className="rounded p-1 text-sm text-muted-foreground hover:bg-kitsu-s3 hover:text-foreground transition-colors"
              >
                {icon}
              </button>
            ))}
            <button
              onClick={logout}
              title="Выйти"
              className="rounded p-1 text-sm text-muted-foreground hover:bg-kitsu-s3 hover:text-destructive transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      </aside>

      {showChannelModal && activeGuildID && (
        <CreateChannelModal
          guildID={activeGuildID}
          onClose={() => setShowChannelModal(false)}
        />
      )}
      {showInviteModal && activeGuildID && (
        <InviteModal
          guildID={activeGuildID}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}
