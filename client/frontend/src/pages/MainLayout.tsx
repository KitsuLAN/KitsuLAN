import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUsername, useAuthActions } from "@/stores/authStore";
import {
  useGuilds,
  useActiveGuildID,
  useActiveChannelID,
  useActiveChannels,
  useActiveMembers,
  useGuildActions,
  useGuildStore,
} from "@/stores/guildStore";
import { CHANNEL_TYPE_TEXT, CHANNEL_TYPE_VOICE } from "@/lib/wails";
import type { Guild, Channel, Member } from "@/lib/wails";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Inline Modal (переиспользуем ту же схему что в Home) ──────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-kitsu-s4 bg-kitsu-s1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Диалог создания канала ────────────────────────────────────────────────

function CreateChannelModal({
  guildID,
  onClose,
}: {
  guildID: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<1 | 2>(CHANNEL_TYPE_TEXT);
  const [loading, setLoading] = useState(false);
  const { createChannel, selectChannel } = useGuildActions();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ch = await createChannel(
        guildID,
        name.trim().toLowerCase().replace(/\s+/g, "-"),
        type
      );
      toast.success(`Канал #${ch.name} создан`);
      if (type === CHANNEL_TYPE_TEXT) selectChannel(ch.id!);
      onClose();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Создать канал" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Тип канала */}
        <div className="flex gap-2">
          {([CHANNEL_TYPE_TEXT, CHANNEL_TYPE_VOICE] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg border py-3 text-sm transition-colors",
                type === t
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-kitsu-s4 bg-kitsu-bg text-muted-foreground hover:bg-kitsu-s2"
              )}
            >
              <span className="text-xl">
                {t === CHANNEL_TYPE_TEXT ? "#" : "🔊"}
              </span>
              <span className="text-xs font-semibold">
                {t === CHANNEL_TYPE_TEXT ? "Текстовый" : "Голосовой"}
              </span>
            </button>
          ))}
        </div>

        {/* Имя */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Название
          </label>
          <div className="flex items-center rounded-md border border-kitsu-s4 bg-kitsu-bg px-3">
            <span className="mr-1 text-muted-foreground">
              {type === CHANNEL_TYPE_TEXT ? "#" : "🔊"}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="мой-канал"
              className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
          </div>
        </div>

        <Button disabled={!name.trim() || loading} onClick={handleCreate}>
          {loading ? "Создаём…" : "Создать канал"}
        </Button>
      </div>
    </Modal>
  );
}

// ── Диалог инвайта ────────────────────────────────────────────────────────

function InviteModal({
  guildID,
  onClose,
}: {
  guildID: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { createInvite } = useGuildActions();

  useEffect(() => {
    createInvite(guildID, 0, 0)
      .then(setCode)
      .catch((e) => {
        toast.error(String(e));
        onClose();
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Код скопирован!");
  };

  return (
    <Modal title="Пригласить участников" onClose={onClose}>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Генерируем код…
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Поделитесь этим кодом. Он действует бессрочно.
          </p>
          <button
            onClick={copyCode}
            className="flex items-center justify-between rounded-lg border border-kitsu-s4 bg-kitsu-bg px-4 py-3 font-mono text-lg font-bold tracking-widest text-foreground hover:bg-kitsu-s2 transition-colors"
          >
            {code}
            <span className="text-xs font-sans font-normal text-muted-foreground">
              нажмите чтобы скопировать
            </span>
          </button>
        </div>
      )}
    </Modal>
  );
}

type Status = "online" | "away" | "dnd" | "offline";

const STATUS_COLORS: Record<Status, string> = {
  online: "bg-kitsu-online",
  away: "bg-kitsu-away",
  dnd: "bg-red-500",
  offline: "bg-kitsu-offline",
};

// Цвета гильдий — генерируем по индексу, т.к. сервер их не хранит пока
const GUILD_COLORS = [
  "bg-primary",
  "bg-violet-700",
  "bg-cyan-700",
  "bg-emerald-700",
  "bg-rose-700",
  "bg-amber-700",
];

function guildColor(index: number) {
  return GUILD_COLORS[index % GUILD_COLORS.length];
}

// ── Иконка гильдии ──
function GuildIcon({
  guild,
  index,
  active,
  onClick,
}: {
  guild: Guild;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const color = guildColor(index);
  const short = (guild.name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="relative" title={guild.name}>
      <span
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 w-1 rounded-r bg-primary transition-all duration-150",
          active ? "h-9" : "h-0 hover:h-5"
        )}
      />
      <button
        onClick={onClick}
        className={cn(
          "flex h-11 w-11 items-center justify-center font-bold text-sm transition-all duration-200 text-foreground select-none",
          active
            ? cn("rounded-xl", color)
            : cn("rounded-full bg-kitsu-s3 hover:rounded-xl", "hover:" + color)
        )}
      >
        {short}
      </button>
    </div>
  );
}

// ── Элемент канала ──
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

// ── Элемент участника ──
function MemberItem({ member }: { member: Member }) {
  // Онлайн-статус пока не приходит с сервера — показываем всех как online
  const status: Status = member.is_online ? "online" : "offline";
  const displayName = member.nickname || member.username || "?";

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-kitsu-s2",
        status === "offline" && "opacity-40"
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
            STATUS_COLORS[status]
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

// ── Главный компонент ──
export default function MainLayout() {
  const username = useUsername();
  const { logout } = useAuthActions();

  const guilds = useGuilds();
  const activeGuildID = useActiveGuildID();
  const activeChannelID = useActiveChannelID();
  const channels = useActiveChannels();
  const members = useActiveMembers();

  const { loadGuilds, selectGuild, selectChannel } = useGuildActions();

  const firstGuildId = guilds[0]?.id;

  // Загружаем гильдии при монтировании
  useEffect(() => {
    loadGuilds();
  }, []);

  // Автовыбор первой гильдии
  useEffect(() => {
    if (firstGuildId && !activeGuildID) {
      selectGuild(firstGuildId);
    }
  }, [firstGuildId, activeGuildID]);

  const activeGuild = guilds.find((g) => g.id === activeGuildID);
  const textChannels = useMemo(
    () => channels.filter((c) => c.type !== CHANNEL_TYPE_VOICE),
    [channels]
  );
  const voiceChannels = useMemo(
    () => channels.filter((c) => c.type === CHANNEL_TYPE_VOICE),
    [channels]
  );
  const activeChannel = channels.find((c) => c.id === activeChannelID);

  const onlineMembers = members.filter((m) => m.is_online);
  const offlineMembers = members.filter((m) => !m.is_online);

  const [channelModal, setChannelModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-kitsu-bg text-foreground">
      {/* ── 1. Server Rail (64px) ── */}
      <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-kitsu-s4 bg-kitsu-s0 py-3">
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl transition-all hover:rounded-2xl">
          🦊
        </button>
        <Separator className="w-8 bg-kitsu-s4" />

        {guilds.map((g, i) => (
          <GuildIcon
            key={g.id}
            guild={g}
            index={i}
            active={activeGuildID === g.id}
            onClick={() => selectGuild(g.id!)}
          />
        ))}

        <Separator className="w-8 bg-kitsu-s4" />
        <button
          title="Создать или вступить в гильдию"
          onClick={() => selectChannel("")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-kitsu-s2 text-xl text-muted-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-white"
        >
          +
        </button>
      </nav>

      {/* ── 2. Channel Panel (240px) ── */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-kitsu-s4 bg-kitsu-s1">
        <button className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4 font-bold hover:bg-kitsu-s2 transition-colors">
          <span className="flex-1 truncate text-sm">
            {activeGuild?.name ?? "Выберите гильдию"}
          </span>
          <span className="text-muted-foreground">⌄</span>
        </button>

        <ScrollArea className="flex-1 px-2 py-3">
          {/* Текстовые каналы */}
          {textChannels.length > 0 && (
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Текстовые
                </span>
                <button
                  onClick={() => activeGuildID && setChannelModal(true)}
                  className="text-muted-foreground/50 hover:text-muted-foreground"
                >
                  +
                </button>
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

          {/* Голосовые каналы */}
          {voiceChannels.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Голосовые
                </span>
                <button
                  onClick={() => activeGuildID && setChannelModal(true)}
                  className="text-muted-foreground/50 hover:text-muted-foreground"
                >
                  +
                </button>
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

          {/* Заглушка если каналов нет */}
          {channels.length === 0 && activeGuildID && (
            <p className="px-2 text-xs text-muted-foreground/40">Нет каналов</p>
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

      {/* ── 3. Основной контент ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-kitsu-bg">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4">
          <span className="text-lg text-muted-foreground">#</span>
          <span className="font-semibold text-sm">
            {activeChannel?.name ?? "—"}
          </span>
          <Separator orientation="vertical" className="h-5 bg-kitsu-s4" />
          <span className="text-sm text-muted-foreground">
            {activeGuild?.name ?? ""}
          </span>
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── 4. Member List (200px) ── */}
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
      {channelModal && activeGuildID && (
        <CreateChannelModal
          guildID={activeGuildID}
          onClose={() => setChannelModal(false)}
        />
      )}
      {inviteModal && activeGuildID && (
        <InviteModal
          guildID={activeGuildID}
          onClose={() => setInviteModal(false)}
        />
      )}
    </div>
  );
}
