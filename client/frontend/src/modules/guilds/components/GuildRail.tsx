// src/modules/guilds/components/GuildRail.tsx
import { useNavigate } from "react-router-dom";
import { Separator } from "@/uikit/separator";
import { cn } from "@/uikit/lib/utils";
import type { Guild } from "@/api/wails";

// Импортируем контроллер (логика) и селекторы (данные)
import { GuildController } from "@/modules/guilds/GuildController";
import { useGuilds, useActiveGuildID } from "@/modules/guilds/guildStore";

function GuildIcon({
                       guild,
                       active,
                       onClick,
                   }: {
    guild: Guild;
    active: boolean;
    onClick: () => void;
}) {
    const bgStyle = { backgroundColor: guild.color || "#525252" };
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
                    "flex h-11 w-11 items-center justify-center font-bold text-sm transition-all duration-200 text-white select-none",
                    active ? "rounded-xl" : "rounded-full bg-kitsu-s3 hover:rounded-xl"
                )}
                style={active ? bgStyle : {}}
                onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = guild.color || "#525252";
                }}
                onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = "";
                }}
            >
                {short}
            </button>
        </div>
    );
}

export function GuildRail() {
    const navigate = useNavigate();

    // Получаем данные (реактивно)
    const guilds = useGuilds();
    const activeGuildID = useActiveGuildID();

    const handleGoHome = () => {
        // Вызываем контроллер для сброса состояния
        GuildController.clearSelection();
        navigate("/app/home");
    };

    const handleSelectGuild = (id: string) => {
        // Вызываем контроллер для смены контекста
        navigate(`/app/${id}`);
    };

    return (
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-kitsu-s4 bg-kitsu-s0 py-3">
            <button
                title="Домой"
                onClick={handleGoHome}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl transition-all hover:rounded-2xl"
            >
                🦊
            </button>

            <Separator className="w-8 bg-kitsu-s4" />

            {guilds.map((g) => (
                <GuildIcon
                    key={g.id}
                    guild={g}
                    active={activeGuildID === g.id}
                    onClick={() => handleSelectGuild(g.id!)}
                />
            ))}

            <Separator className="w-8 bg-kitsu-s4" />

            <button
                title="Добавить гильдию"
                onClick={handleGoHome}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-kitsu-s2 text-xl text-muted-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-white"
            >
                +
            </button>
        </nav>
    );
}