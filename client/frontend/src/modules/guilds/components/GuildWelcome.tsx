import { useGuilds } from "@/modules/guilds/guildStore";
import { Button } from "@/uikit/button";
import { GuildController } from "@/modules/guilds/GuildController";
import { Users, Hash, ShieldAlert, Activity } from "lucide-react";
import { InviteModal } from "./modals/InviteModal";
import { useState } from "react";

export function GuildWelcome({ guildId }: { guildId: string }) {
    const guilds = useGuilds();
    const guild = guilds.find((g) => g.id === guildId);
    const [showInvite, setShowInvite] = useState(false);

    if (!guild) return null;

    const initials = (guild.name ?? "??").slice(0, 2).toUpperCase();

    return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-kitsu-bg p-8 text-fg">

            {/* Карточка статуса */}
            <div className="w-full max-w-md overflow-hidden rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 shadow-2xl">

                {/* Хедер карточки */}
                <div className="flex h-8 items-center justify-between border-b border-kitsu-s4 bg-kitsu-s2 px-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-fg-dim">
                        SYSTEM :: GUILD_OVERVIEW
                    </span>
                    <div className="flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-kitsu-s4" />
                        <div className="h-1.5 w-1.5 rounded-full bg-kitsu-s4" />
                        <div className="h-1.5 w-1.5 rounded-full bg-kitsu-online" />
                    </div>
                </div>

                <div className="p-8 text-center">
                    {/* Лого */}
                    <div
                        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[3px] border border-dashed border-kitsu-s4 bg-kitsu-bg text-4xl font-bold text-fg shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]"
                        style={guild.color ? { borderColor: guild.color, color: guild.color, backgroundColor: `${guild.color}10` } : {}}
                    >
                        {initials}
                    </div>

                    <h1 className="mb-2 font-sans text-2xl font-bold tracking-tight">
                        {guild.name}
                    </h1>

                    <p className="mb-8 font-mono text-xs text-fg-muted">
                        {guild.description || "NO DESCRIPTION PROVIDED"}
                    </p>

                    {/* Грид статистики */}
                    <div className="mb-8 grid grid-cols-2 gap-2 border-t border-b border-kitsu-s4 py-4">
                        <div className="flex flex-col items-center gap-1 border-r border-kitsu-s4">
                            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-fg-dim">
                                <Users size={10} /> MEMBERS
                            </span>
                            <span className="font-mono text-lg font-bold text-fg">{guild.member_count}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-fg-dim">
                                <Activity size={10} /> STATUS
                            </span>
                            <span className="font-mono text-lg font-bold text-kitsu-online">ACTIVE</span>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => setShowInvite(true)}>
                            <Users size={14} /> ПРИГЛАСИТЬ
                        </Button>
                        <Button variant="outline" onClick={() => { /* TODO: Settings */ }}>
                            <ShieldAlert size={14} /> НАСТРОЙКИ
                        </Button>
                    </div>
                </div>

                {/* Футер */}
                <div className="flex h-6 items-center justify-center border-t border-kitsu-s4 bg-kitsu-s0 font-mono text-[9px] text-fg-dim">
                    ID: {guild.id?.toUpperCase()}
                </div>
            </div>

            {showInvite && <InviteModal guildID={guildId} onClose={() => setShowInvite(false)} />}
        </div>
    );
}