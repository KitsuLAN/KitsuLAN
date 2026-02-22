/**
 * src/modules/chat/components/MessageGroup.tsx
 *
 * Адаптация MessageGroup из Fluxer.
 * Рендерит группу сообщений от одного автора.
 * Первое сообщение в группе — с аватаром и именем.
 * Последующие — компактные (только текст + время при ховере).
 *
 * Изменения:
 * - Фикс: длинные слова/ссылки теперь переносятся через overflow-wrap + break-all
 * - Разделитель даты стал кликабельным — скрывает/показывает сообщения за этот день
 */

import { memo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/uikit/lib/utils";
import { timestampPbToISO, type ChatMessage } from "@/api/wails";

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function formatTime(iso?: string): string {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getInitials(username?: string): string {
    if (!username) return "??";
    return username.slice(0, 2).toUpperCase();
}

/** Генерирует детерминированный цвет аватарки по имени пользователя */
function avatarColor(username?: string): string {
    if (!username) return "#525252";
    const COLORS = [
        "#5865F2", "#57F287", "#FEE75C", "#EB459E",
        "#ED4245", "#3BA55D", "#FAA61A", "#4F545C",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── Одно сообщение (компактное — без аватара) ───────────────────────────────

interface CompactMessageProps {
    msg: ChatMessage;
    isOwn: boolean;
}

const CompactMessage = memo(function CompactMessage({ msg, isOwn }: CompactMessageProps) {
    const iso = timestampPbToISO(msg.created_at);
    return (
        <div
            className={cn(
                "group relative flex min-h-[1.375rem] items-start gap-0 pl-[52px] pr-4 py-0.5",
                "hover:bg-kitsu-s1/60 transition-colors duration-75",
            )}
        >
            {/* Время появляется при ховере, слева на месте аватара */}
            <span
                className={cn(
                    "absolute left-0 w-[52px] shrink-0 pl-4",
                    "text-[10px] tabular-nums text-foreground/30 opacity-0",
                    "group-hover:opacity-100 transition-opacity",
                    "flex items-center justify-center pt-0.5",
                )}
            >
        {formatTime(iso)}
      </span>

            <p
                className={cn(
                    // overflow-wrap: anywhere — переносит даже внутри длинного слова/ссылки
                    // min-w-0 обязателен: без него flex-item игнорирует ограничение родителя
                    "min-w-0 w-full whitespace-pre-wrap break-all text-[14px] leading-[1.375rem] text-foreground/90",
                )}
                style={{ overflowWrap: "anywhere" }}
            >
                {msg.content}
            </p>
        </div>
    );
});

// ─── Первое сообщение группы (с аватаром и именем) ───────────────────────────

interface GroupHeaderMessageProps {
    msg: ChatMessage;
    isOwn: boolean;
}

const GroupHeaderMessage = memo(function GroupHeaderMessage({
                                                                msg,
                                                                isOwn,
                                                            }: GroupHeaderMessageProps) {
    const iso = timestampPbToISO(msg.created_at);
    const color = avatarColor(msg.author_username);

    return (
        <div
            className={cn(
                "group flex gap-3 px-4 pt-3 pb-0.5",
                "hover:bg-kitsu-s1/60 transition-colors duration-75",
            )}
        >
            {/* Аватар */}
            <div
                className="mt-0.5 flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}
            >
                {getInitials(msg.author_username)}
            </div>

            {/* Контент */}
            <div className="min-w-0 flex-1">
                {/* Мета: имя + время */}
                <div className="mb-0.5 flex items-baseline gap-2">
          <span
              className={cn(
                  "max-w-[200px] truncate text-[14px] font-semibold leading-none",
                  isOwn ? "text-primary" : "text-foreground",
              )}
          >
            {msg.author_username}
          </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-foreground/30">
            {formatTime(iso)}
          </span>
                </div>

                {/* Текст */}
                <p
                    className="whitespace-pre-wrap break-all text-[14px] leading-[1.375rem] text-foreground/90"
                    style={{ overflowWrap: "anywhere" }}
                >
                    {msg.content}
                </p>
            </div>
        </div>
    );
});

// ─── Кликабельный разделитель даты (спойлер) ─────────────────────────────────

interface DateDividerProps {
    label: string;
    collapsed: boolean;
    count: number;
    onToggle: () => void;
}

function DateDivider({ label, collapsed, count, onToggle }: DateDividerProps) {
    return (
        <button
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Показать сообщения за ${label}` : `Скрыть сообщения за ${label}`}
            className={cn(
                "group relative my-2 flex w-full items-center px-4",
                "cursor-pointer select-none transition-opacity hover:opacity-100",
                collapsed ? "opacity-80" : "opacity-60 hover:opacity-80",
            )}
        >
            <div className="flex-1 border-t border-kitsu-s4 transition-colors group-hover:border-kitsu-s4/80" />

            <span
                className={cn(
                    "mx-3 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-0.5",
                    "text-[11px] font-semibold transition-colors",
                    collapsed
                        ? "border-primary/30 bg-primary/10 text-primary/70 group-hover:border-primary/50 group-hover:text-primary"
                        : "border-kitsu-s4 bg-kitsu-s1 text-foreground/50 group-hover:border-kitsu-s4/60 group-hover:text-foreground/70",
                )}
            >
        {collapsed ? (
            <ChevronRight className="h-3 w-3" />
        ) : (
            <ChevronDown className="h-3 w-3" />
        )}
                {label}
                {collapsed && (
                    <span className="ml-1 rounded bg-primary/20 px-1 text-[10px] text-primary/80">
            {count}
          </span>
                )}
      </span>

            <div className="flex-1 border-t border-kitsu-s4 transition-colors group-hover:border-kitsu-s4/80" />
        </button>
    );
}

// ─── Группа сообщений ─────────────────────────────────────────────────────────

export interface MessageGroupProps {
    groupId: string;
    messages: ChatMessage[];
    /** username текущего пользователя — для подсветки "своих" */
    currentUsername: string;
    /** Опциональный разделитель даты над группой. Если есть — включает спойлер */
    dateDivider?: string;
    /**
     * Управление collapsed-состоянием снаружи (из MessageList).
     * Если не передан — компонент управляет сам собой.
     */
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const MessageGroup = memo(function MessageGroup({
                                                           groupId,
                                                           messages,
                                                           currentUsername,
                                                           dateDivider,
                                                           collapsed: collapsedProp,
                                                           onToggleCollapse,
                                                       }: MessageGroupProps) {
    // Локальный стейт — используется только если родитель не управляет
    const [localCollapsed, setLocalCollapsed] = useState(false);

    const isControlled = collapsedProp !== undefined;
    const collapsed = isControlled ? collapsedProp : localCollapsed;
    const handleToggle = isControlled
        ? onToggleCollapse!
        : () => setLocalCollapsed((v) => !v);

    return (
        <div role="group" data-group-id={groupId}>
            {/* Разделитель даты — только если есть метка */}
            {dateDivider && (
                <DateDivider
                    label={dateDivider}
                    collapsed={collapsed}
                    count={messages.length}
                    onToggle={handleToggle}
                />
            )}

            {/* Сообщения — скрыты если collapsed */}
            {!collapsed &&
                messages.map((msg, index) => {
                    const isOwn = msg.author_username === currentUsername;
                    const isFirst = index === 0;

                    return isFirst ? (
                        <GroupHeaderMessage key={msg.id} msg={msg} isOwn={isOwn} />
                    ) : (
                        <CompactMessage key={msg.id} msg={msg} isOwn={isOwn} />
                    );
                })}
        </div>
    );
});