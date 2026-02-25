// src/modules/guilds/components/GuildRail.tsx
import { useNavigate } from "react-router-dom";
import { GuildController } from "@/modules/guilds/GuildController";
import { useGuilds, useActiveGuildID } from "@/modules/guilds/guildStore";
import { NavIcon } from "@/uikit/nav-icon";
import FoxLogo from "@/assets/images/logo-kitsu.svg";

export function GuildRail() {
    const guilds = useGuilds();
    const activeGuildID = useActiveGuildID();
    const navigate = useNavigate();

    return (
        <nav className="flex w-16 min-w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden border-r border-kitsu-s4 bg-kitsu-s0 py-1.5">
            <button
                onClick={() => { GuildController.clearSelection(); navigate("/app/home"); }}
                className="mb-1 flex shrink-0 items-center justify-center transition-opacity hover:opacity-80"
                title="Главная"
            >
                <img src={FoxLogo} alt="KitsuLAN" className="size-10" />
            </button>

            <div className="my-0.5 h-px w-10 bg-kitsu-s4" />

            {guilds.map((g) => (
                <NavIcon
                    key={g.id}
                    active={activeGuildID === g.id}
                    label={(g.name ?? "?").slice(0, 2).toUpperCase()}
                    color={g.color}
                    title={g.name}
                    onClick={() => navigate(`/app/${g.id}`)}
                />
            ))}

            <div className="my-0.5 h-px w-10 bg-kitsu-s4" />

            <button
                className="flex size-10 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-kitsu-orange/35 text-kitsu-orange transition-colors hover:border-kitsu-orange hover:bg-kitsu-orange-dim"
                title="Добавить сервер"
            >
                +
            </button>
        </nav>
    );
}