import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Search, Terminal } from "lucide-react";
import { useGuildStore, useActiveGuildID } from "@/modules/guilds/guildStore";
import { GuildController } from "@/modules/guilds/GuildController";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const navigate = useNavigate();

    // Получаем все каналы из стора (по всем гильдиям)
    const channelsByGuild = useGuildStore(s => s.channelsByGuild);
    const guilds = useGuildStore(s => s.guilds);
    const activeGuildID = useActiveGuildID();

    // Слушаем Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    if (!open) return null;

    // Плоский список всех доступных каналов
    const allChannels = Object.entries(channelsByGuild).flatMap(([gId, channels]) =>
        channels.map(ch => ({
            ...ch,
            guildId: gId,
            guildName: guilds.find(g => g.id === gId)?.name || "Unknown"
        }))
    );

    // Простая фильтрация
    const filtered = allChannels.filter(ch =>
        ch.name?.toLowerCase().includes(query.toLowerCase()) ||
        ch.guildName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Показываем топ 8

    const handleSelect = async (guildId: string, channelId: string) => {
        setOpen(false);
        setQuery("");
        if (activeGuildID !== guildId) await GuildController.selectGuild(guildId);
        navigate(`/app/${guildId}/${channelId}`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-[2px] pt-[15vh]">
            {/* Клик по фону закрывает */}
            <div className="absolute inset-0" onClick={() => setOpen(false)} />

            <div className="relative w-full max-w-[600px] overflow-hidden rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 shadow-2xl">

                {/* Хедер / Инпут */}
                <div className="flex items-center gap-3 border-b border-kitsu-s4 px-4 py-3">
                    <Terminal size={18} className="text-kitsu-orange" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Поиск каналов (например, 'general')..."
                        className="flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-dim"
                    />
                    <div className="font-mono text-[10px] text-fg-dim border border-kitsu-s4 px-1.5 py-0.5 rounded-[2px] bg-kitsu-s2">
                        ESC
                    </div>
                </div>

                {/* Результаты */}
                <div className="p-2">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center font-mono text-xs text-fg-dim">
                            NO MATCHES FOUND
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {filtered.map(ch => (
                                <button
                                    key={ch.id}
                                    onClick={() => handleSelect(ch.guildId, ch.id!)}
                                    className="group flex w-full items-center justify-between rounded-[3px] border border-transparent px-3 py-2 hover:border-kitsu-s5 hover:bg-kitsu-s2"
                                >
                                    <div className="flex items-center gap-3">
                                        <Hash size={14} className="text-fg-dim group-hover:text-kitsu-orange" />
                                        <span className="font-sans text-sm font-medium text-fg">{ch.name}</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-fg-dim uppercase tracking-widest">
                                        {ch.guildName}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-kitsu-s4 bg-kitsu-s0 px-4 py-2 font-mono text-[9px] text-fg-dim">
                    <span className="text-kitsu-orange font-bold">PRO TIP:</span> Используйте стрелки для навигации (WIP)
                </div>
            </div>
        </div>
    );
}