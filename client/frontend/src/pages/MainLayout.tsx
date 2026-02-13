/**
 * src/pages/MainLayout.tsx
 *
 * Структура:
 * [Server Rail 64px] [Channel Panel 240px] [Chat/Outlet flex-1] [Member List 200px]
 *
 * Изменения от оригинала:
 * - bg-zinc-* → bg-kitsu-s* (единые токены)
 * - indigo → primary (оранжевый)
 * - Добавлен список участников (правая колонка)
 * - Добавлены voice channels
 * - Avatar fallback использует правильный цвет бренда
 */
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUsername, useAuthActions } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// ── Mock данные. Заменить на данные из gRPC-стора ──
const GUILDS = [
  { id: "g1", short: "KL", name: "KitsuLAN Dev", color: "bg-primary" },
  { id: "g2", short: "GC", name: "Gaming Crew", color: "bg-violet-700" },
  { id: "g3", short: "RG", name: "Retro Games", color: "bg-cyan-700" },
];

const CHANNELS = {
  text: ["general", "dev-talk", "random", "announcements"],
  voice: ["General Voice", "Dev Standup", "Gaming"],
};

const MEMBERS = [
  { id: "u1", name: "Vyacheslav", status: "online", role: "admin" },
  { id: "u2", name: "KitsuFan", status: "online", role: "member" },
  { id: "u3", name: "LanPartyGo", status: "away", role: "member" },
  { id: "u4", name: "Retro_Guy", status: "offline", role: "member" },
];

type Status = "online" | "away" | "dnd" | "offline";

const STATUS_COLORS: Record<Status, string> = {
  online: "bg-kitsu-online",
  away: "bg-kitsu-away",
  dnd: "bg-red-500",
  offline: "bg-kitsu-offline",
};

// ── Индикатор статуса ──
function StatusDot({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        STATUS_COLORS[status]
      )}
    />
  );
}

// ── Иконка гильдии (Server Rail) ──
function GuildIcon({
  guild,
  active,
  onClick,
}: {
  guild: (typeof GUILDS)[0];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative" title={guild.name}>
      {/* Активный индикатор слева */}
      <span
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 w-1 rounded-r bg-primary transition-all duration-150",
          active ? "h-9" : "h-0 hover:h-5"
        )}
      />
      <button
        onClick={onClick}
        className={cn(
          "flex h-11 w-11 items-center justify-center font-bold text-sm transition-all duration-200",
          "text-foreground select-none",
          active
            ? cn("rounded-xl", guild.color)
            : cn(
                "rounded-full bg-kitsu-s3 hover:rounded-xl",
                "hover:" + guild.color
              )
        )}
      >
        {guild.short}
      </button>
    </div>
  );
}

// ── Элемент канала ──
function ChannelItem({
  name,
  type,
  active,
  onClick,
}: {
  name: string;
  type: "text" | "voice";
  active?: boolean;
  onClick?: () => void;
}) {
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
        {type === "text" ? "#" : "🔊"}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}

// ── Элемент списка участников ──
function MemberItem({ member }: { member: (typeof MEMBERS)[0] }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 transition-colors",
        "hover:bg-kitsu-s2",
        member.status === "offline" && "opacity-40"
      )}
    >
      <div className="relative shrink-0">
        <Avatar size="sm">
          <AvatarFallback className="bg-kitsu-s3 text-xs">
            {member.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-kitsu-s1",
            STATUS_COLORS[member.status as Status]
          )}
        />
      </div>
      <div className="min-w-0 text-left">
        <div className="truncate text-[13px] text-foreground">
          {member.name}
        </div>
        {member.role === "admin" && (
          <div className="text-[10px] font-bold text-primary">ADMIN</div>
        )}
      </div>
    </button>
  );
}

// ── Главный компонент ──
export default function MainLayout() {
  const username = useUsername();
  const { logout } = useAuthActions();
  const [activeGuild, setActiveGuild] = useState("g1");
  const [activeChannel, setActiveChannel] = useState("general");

  const guild = GUILDS.find((g) => g.id === activeGuild)!;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-kitsu-bg text-foreground">
      {/* ── 1. Server Rail (64px) ── */}
      <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-kitsu-s4 bg-kitsu-s0 py-3">
        {/* Логотип / Home */}
        <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl transition-all hover:rounded-2xl">
          🦊
        </button>

        <Separator className="w-8 bg-kitsu-s4" />

        {GUILDS.map((g) => (
          <GuildIcon
            key={g.id}
            guild={g}
            active={activeGuild === g.id}
            onClick={() => setActiveGuild(g.id)}
          />
        ))}

        <Separator className="w-8 bg-kitsu-s4" />

        {/* Добавить сервер */}
        <button
          title="Добавить сервер"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-kitsu-s2 text-xl text-muted-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-white"
        >
          +
        </button>
      </nav>

      {/* ── 2. Channel Panel (240px) ── */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-kitsu-s4 bg-kitsu-s1">
        {/* Guild header */}
        <button className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4 font-bold hover:bg-kitsu-s2 transition-colors">
          <span className="flex-1 truncate text-sm">{guild.name}</span>
          <span className="text-muted-foreground">⌄</span>
        </button>

        {/* Каналы */}
        <ScrollArea className="flex-1 px-2 py-3">
          {/* Текстовые */}
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Текстовые
              </span>
              <button className="text-muted-foreground/50 hover:text-muted-foreground">
                +
              </button>
            </div>
            {CHANNELS.text.map((ch) => (
              <ChannelItem
                key={ch}
                name={ch}
                type="text"
                active={activeChannel === ch}
                onClick={() => setActiveChannel(ch)}
              />
            ))}
          </div>

          {/* Голосовые */}
          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Голосовые
              </span>
              <button className="text-muted-foreground/50 hover:text-muted-foreground">
                +
              </button>
            </div>
            {CHANNELS.voice.map((ch) => (
              <ChannelItem key={ch} name={ch} type="voice" />
            ))}
          </div>
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

          {/* Controls */}
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

      {/* ── 3. Основной контент (Chat) ── */}
      <main className="flex flex-1 flex-col overflow-hidden bg-kitsu-bg">
        {/* Channel header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 px-4">
          <span className="text-lg text-muted-foreground">#</span>
          <span className="font-semibold text-sm">{activeChannel}</span>
          <Separator orientation="vertical" className="h-5 bg-kitsu-s4" />
          <span className="text-sm text-muted-foreground">Главный канал</span>
        </header>

        {/* Outlet: Chat и другие страницы */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* ── 4. Member List (200px) ── */}
      <aside className="flex w-52 shrink-0 flex-col border-l border-kitsu-s4 bg-kitsu-s1">
        <ScrollArea className="flex-1 px-2 py-3">
          {/* Online */}
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Online — {MEMBERS.filter((m) => m.status !== "offline").length}
          </p>
          {MEMBERS.filter((m) => m.status !== "offline").map((m) => (
            <MemberItem key={m.id} member={m} />
          ))}

          <div className="my-2 border-t border-kitsu-s4" />

          {/* Offline */}
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Offline — {MEMBERS.filter((m) => m.status === "offline").length}
          </p>
          {MEMBERS.filter((m) => m.status === "offline").map((m) => (
            <MemberItem key={m.id} member={m} />
          ))}
        </ScrollArea>
      </aside>
    </div>
  );
}
