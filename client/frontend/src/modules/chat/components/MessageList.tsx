/**
 * src/modules/chat/components/MessageList.tsx
 *
 * Виртуализация не пока нужна для LAN-чата с ограниченной историей.
 * Автоскролл вниз при новых сообщениях (если уже были внизу).
 * Кнопка "Загрузить ещё" — подгрузка истории вверх.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/uikit/scroll-area";
import { cn } from "@/uikit/lib/utils";
import type { ChatMessage } from "@/api/wails";
import { groupMessages } from "../utils/messageGrouping";
import { MessageGroup } from "./MessageGroup";
// ─── LoadMore Button ──────────────────────────────────────────────────────────

interface LoadMoreButtonProps {
    onClick: () => void;
    loading?: boolean;
}

function LoadMoreButton({ onClick, loading }: LoadMoreButtonProps) {
    return (
        <div className="flex justify-center py-3">
            <button
                onClick={onClick}
                disabled={loading}
                className={cn(
                    "rounded-full border border-kitsu-s4 bg-kitsu-s1 px-4 py-1.5",
                    "text-xs text-muted-foreground transition-colors",
                    "hover:bg-kitsu-s2 hover:text-foreground",
                    "disabled:cursor-wait disabled:opacity-50",
                )}
            >
                {loading ? "Загружаем…" : "Загрузить предыдущие"}
            </button>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ channelName }: { channelName?: string }) {
    return (
        <div className="flex flex-col gap-3 px-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-kitsu-s2 text-3xl font-bold text-muted-foreground">
                #
            </div>
            <div>
                <h2 className="text-xl font-bold">
                    {channelName ? `Добро пожаловать в #${channelName}` : "Пустой канал"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Напишите первое сообщение в этом канале.
                </p>
            </div>
        </div>
    );
}

// ─── Main MessageList ─────────────────────────────────────────────────────────

export interface MessageListProps {
    messages: ChatMessage[];
    currentUsername: string;
    hasMore: boolean;
    channelName?: string;
    onLoadMore: () => void;
}

export function MessageList({
                                messages,
                                currentUsername,
                                hasMore,
                                channelName,
                                onLoadMore,
                            }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    /**
     * Стейт свёрнутых дат. Ключ — строка датового разделителя (например "Сегодня").
     * Хранится в MessageList, чтобы не сбрасывался при ре-рендере MessageGroup.
     */
    const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

    const toggleDate = useCallback((label: string) => {
        setCollapsedDates((prev) => ({ ...prev, [label]: !prev[label] }));
    }, []);

    /**
     * Флаг "пользователь внизу" — нужен для автоскролла.
     * Если пользователь прокрутил вверх — не прыгаем вниз при новых сообщениях.
     */
    const isAtBottomRef = useRef(true);

    const handleLoadMore = useCallback(async () => {
        setLoadingMore(true);
        try {
            onLoadMore();
        } finally {
            setLoadingMore(false);
        }
    }, [onLoadMore]);

    // Следим за позицией скролла
    useEffect(() => {
        const el = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
        if (!el) return;

        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = el as HTMLElement;
            // Считаем "внизу" если отступ от низа меньше 80px
            isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // Автоскролл вниз при новых сообщениях
    useEffect(() => {
        if (isAtBottomRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]);

    // Начальный скролл вниз при открытии канала
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
        isAtBottomRef.current = true;
        // Сбрасываем свёрнутые даты при смене канала
        setCollapsedDates({});
    }, [messages[0]?.channel_id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Группируем сообщения (адаптированная логика из Fluxer)
    const groups = groupMessages(messages);

    return (
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
            <div className="flex flex-col pb-2">
                {/* Загрузка истории */}
                {hasMore ? (
                    <LoadMoreButton onClick={handleLoadMore} loading={loadingMore} />
                ) : (
                    // Начало канала — пустой стейт или приветствие
                    messages.length === 0 && <EmptyState channelName={channelName} />
                )}

                {/* Группы сообщений */}
                {groups.map((group) => (
                    <MessageGroup
                        key={group.groupId}
                        groupId={group.groupId}
                        messages={group.messages}
                        currentUsername={currentUsername}
                        dateDivider={group.dateDivider}
                        collapsed={group.dateDivider ? collapsedDates[group.dateDivider] : undefined}
                        onToggleCollapse={
                            group.dateDivider ? () => toggleDate(group.dateDivider!) : undefined
                        }
                    />
                ))}

                {/* Якорь для автоскролла */}
                <div ref={bottomRef} className="h-px" />
            </div>
        </ScrollArea>
    );
}