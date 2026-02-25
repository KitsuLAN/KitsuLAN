import { memo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/uikit/lib/utils";
import { timestampPbToISO, type ChatMessage } from "@/api/wails";
import { Avatar, AvatarFallback } from "@/uikit/avatar";
import { MessageActions } from "./MessageActions";

// Форматирование времени: "14:05"
function formatTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// Кнопка сворачивания (Шеврон)
function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="absolute -left-6 top-2 flex h-4 w-4 items-center justify-center rounded-[2px] text-fg-dim opacity-0 transition-opacity hover:bg-kitsu-s3 hover:text-fg group-hover:opacity-100"
            title={collapsed ? "Развернуть" : "Свернуть"}
        >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
    );
}

// Заголовок группы (С аватаром, именем и кнопкой сворачивания)
const GroupHeaderMessage = memo(function GroupHeaderMessage({
                                                                msg,
                                                                isOwn,
                                                                collapsed,
                                                                onToggle,
                                                                count
                                                            }: {
    msg: ChatMessage;
    isOwn: boolean;
    collapsed: boolean;
    onToggle: () => void;
    count: number;
}) {
    const time = formatTime(timestampPbToISO(msg.created_at));
    const initials = msg.author_username?.slice(0, 2).toUpperCase() || "??";

    return (
        <div className="group relative grid grid-cols-[56px_1fr_auto] py-1 pl-2 pr-4 hover:bg-white/[0.02]">

            {/* Кнопка сворачивания (абсолютно позиционирована слева) */}
            <div className="absolute left-1 top-2">
                <button
                    onClick={onToggle}
                    className="flex h-4 w-4 items-center justify-center rounded-[2px] text-fg-dim opacity-0 transition-opacity hover:bg-kitsu-s3 hover:text-fg group-hover:opacity-100"
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>

            {/* Аватар (слева) */}
            <div className="flex shrink-0 justify-center pt-1 pl-2">
                <Avatar size="md" className="cursor-pointer hover:ring-2 hover:ring-kitsu-s4" onClick={onToggle}>
                    <AvatarFallback className={isOwn ? "text-kitsu-orange bg-kitsu-orange-dim" : "text-fg-muted bg-kitsu-s3"}>
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </div>

            {/* Контент (центр) */}
            <div className="min-w-0 px-2">
                <div className="flex items-baseline gap-2">
                    <span
                        className={cn(
                            "cursor-pointer font-sans text-sm font-bold hover:underline",
                            isOwn ? "text-kitsu-orange" : "text-fg"
                        )}
                        onClick={onToggle}
                    >
                        {msg.author_username}
                    </span>
                    <span className="font-mono text-xs text-fg-dim select-none">{time}</span>

                    {/* Если свернуто — показываем кол-во сообщений и превью текста */}
                    {collapsed && (
                        <span className="ml-2 rounded-[2px] bg-kitsu-s3 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                            {count} сообщений
                        </span>
                    )}
                </div>

                {/* Текст сообщения (скрывается если collapsed, но первое сообщение показываем как превью одной строкой) */}
                <div className={cn(
                    "mt-0.5 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-fg-muted group-hover:text-fg",
                    collapsed && "truncate text-fg-dim italic"
                )}>
                    {collapsed ? "Группа свернута..." : msg.content}
                </div>
            </div>

            {/* Действия (справа) — Всегда видны, но прозрачность 20% */}
            <div className={cn("transition-opacity", collapsed ? "opacity-0" : "opacity-20 group-hover:opacity-100")}>
                <MessageActions isOwn={isOwn} />
            </div>
        </div>
    );
});

// Последующие сообщения
const CompactMessage = memo(function CompactMessage({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    const time = formatTime(timestampPbToISO(msg.created_at));

    return (
        <div className="group relative grid grid-cols-[56px_1fr_auto] py-0.5 pl-2 pr-4 hover:bg-white/[0.02]">
            {/* Время */}
            <div className="flex shrink-0 justify-end pr-3 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="font-mono text-[10px] text-fg-dim select-none">{time}</span>
            </div>

            {/* Текст */}
            <div className="min-w-0 px-2">
                <div className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-fg-muted group-hover:text-fg">
                    {msg.content}
                </div>
            </div>

            {/* Действия — Всегда видны (opacity-20 -> opacity-100) */}
            <div className="opacity-20 transition-opacity group-hover:opacity-100">
                <MessageActions isOwn={isOwn} />
            </div>
        </div>
    );
});

// Основной компонент группы
export const MessageGroup = memo(function MessageGroup({ groupId, messages, currentUsername, dateDivider }: any) {
    const [collapsed, setCollapsed] = useState(false);
    const count = messages.length;

    return (
        <div role="group" data-group-id={groupId} className="mb-2 transition-all">

            {/* Разделитель даты */}
            {dateDivider && (
                <div className="sticky top-0 z-10 flex items-center gap-4 bg-kitsu-bg/95 py-2 pl-4 pr-4 backdrop-blur-sm">
                    <div className="h-px flex-1 bg-kitsu-s4" />
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-fg-dim">
                        {dateDivider}
                    </span>
                    <div className="h-px flex-1 bg-kitsu-s4" />
                </div>
            )}

            {/* Первое сообщение (Хедер) */}
            {messages.length > 0 && (
                <GroupHeaderMessage
                    key={messages[0].id}
                    msg={messages[0]}
                    isOwn={messages[0].author_username === currentUsername}
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                    count={count}
                />
            )}

            {/* Остальные сообщения (Рендерим только если не свернуто) */}
            {!collapsed && messages.slice(1).map((msg: ChatMessage) => {
                const isOwn = msg.author_username === currentUsername;
                return <CompactMessage key={msg.id} msg={msg} isOwn={isOwn} />;
            })}
        </div>
    );
});