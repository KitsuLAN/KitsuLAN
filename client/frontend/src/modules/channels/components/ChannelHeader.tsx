import { Hash, Volume2, Users, Search, Bell, Pin } from "lucide-react";
import { IconButton } from "@/uikit/icon-button";
import { Separator } from "@/uikit/separator";
import { useActiveChannels, useActiveGuildID } from "@/modules/guilds/guildStore";
import { useLayoutStore, useMembersVisible } from "@/modules/layout/layoutStore";
import { CHANNEL_TYPE_VOICE } from "@/api/wails";

function ChannelIcon({ type }: { type?: number }) {
    if (type === CHANNEL_TYPE_VOICE) return <Volume2 size={16} className="text-fg-dim" />;
    return <Hash size={16} className="text-fg-dim" />;
}

export function ChannelHeader({ channelId }: { channelId: string }) {
    const channels = useActiveChannels();
    const channel = channels.find((c) => c.id === channelId);

    // В будущем будем брать топик из стора, пока заглушка
    const topic = (channel as any)?.topic || "//TODO: ТУТ ИНФОРМАЦИЯ О КАНАЛЕ";

    const membersVisible = useMembersVisible();
    const { toggleMembers } = useLayoutStore();

    if (!channel) return <div className="h-12 border-b border-kitsu-s4 bg-kitsu-s2" />;

    return (
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-kitsu-s4 bg-kitsu-s2 px-4 shadow-sm">
            {/* Левая часть: Иконка + Название + Топик */}
            <div className="flex min-w-0 items-center gap-3">
                <ChannelIcon type={channel.type} />

                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-sans text-sm font-bold text-fg">
                            {channel.name}
                        </span>
                        {/* Бейдж типа канала (опционально, для EVE стиля) */}
                        <span className="rounded-[2px] border border-kitsu-s4 bg-kitsu-s1 px-1 py-0.5 font-mono text-[9px] font-medium uppercase text-fg-dim">
                            {channel.type === CHANNEL_TYPE_VOICE ? "VOICE" : "TEXT"}
                        </span>
                    </div>
                    {/* Топик мелким шрифтом под названием */}
                    <span className="truncate font-mono text-xs text-fg-muted max-w-[400px]">
                        {topic}
                    </span>
                </div>
            </div>

            {/* Правая часть: Инструменты */}
            <div className="flex shrink-0 items-center gap-2">
                {/* Группа поиска и пинов */}
                <div className="flex items-center gap-1 border-r border-kitsu-s4 pr-2 mr-2">
                    <IconButton title="Поиск (Ctrl+F)"><Search size={14} /></IconButton>
                    <IconButton title="Закреплённые сообщения"><Pin size={14} /></IconButton>
                    <IconButton title="Уведомления"><Bell size={14} /></IconButton>
                </div>

                {/* Кнопка участников */}
                <IconButton
                    active={membersVisible}
                    onClick={toggleMembers}
                    title="Список участников"
                    className={membersVisible ? "text-fg" : "text-fg-muted"}
                >
                    <Users size={14} />
                </IconButton>

                {/* Строка поиска (заглушка) */}
                <div className="hidden lg:flex ml-2 items-center rounded-[3px] border border-kitsu-s4 bg-kitsu-s1 px-2 py-1 transition-colors focus-within:border-kitsu-orange">
                    <input
                        type="text"
                        placeholder="Поиск..."
                        className="w-32 bg-transparent font-sans text-xs text-fg outline-none placeholder:text-fg-dim focus:w-48 transition-all"
                    />
                    <Search size={10} className="text-fg-dim" />
                </div>
            </div>
        </header>
    );
}