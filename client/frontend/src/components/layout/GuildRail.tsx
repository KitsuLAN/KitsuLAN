import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import {
  useGuilds,
  useActiveGuildID,
  useGuildActions,
} from "@/stores/guildStore";
import type { Guild } from "@/lib/wails";
import { cn } from "@/lib/utils";

const GUILD_COLORS = [
  "bg-primary",
  "bg-violet-700",
  "bg-cyan-700",
  "bg-emerald-700",
  "bg-rose-700",
  "bg-amber-700",
];

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
  const color = GUILD_COLORS[index % GUILD_COLORS.length];
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

export function GuildRail() {
  const navigate = useNavigate();
  const guilds = useGuilds();
  const activeGuildID = useActiveGuildID();
  const { selectGuild, clearSelection } = useGuildActions();

  const goHome = () => {
    clearSelection();
    navigate("/home");
  };

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-kitsu-s4 bg-kitsu-s0 py-3">
      {/* Кнопка домашней страницы */}
      <button
        title="Домой"
        onClick={goHome}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl transition-all hover:rounded-2xl"
      >
        🦊
      </button>

      <Separator className="w-8 bg-kitsu-s4" />

      {guilds.map((g, i) => (
        <GuildIcon
          key={g.id}
          guild={g}
          index={i}
          active={activeGuildID === g.id}
          onClick={() => {
            selectGuild(g.id!);
            navigate("/app");
          }}
        />
      ))}

      <Separator className="w-8 bg-kitsu-s4" />

      {/* Создать / вступить — явный переход на /home */}
      <button
        title="Добавить гильдию"
        onClick={goHome}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-kitsu-s2 text-xl text-muted-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-white"
      >
        +
      </button>
    </nav>
  );
}
