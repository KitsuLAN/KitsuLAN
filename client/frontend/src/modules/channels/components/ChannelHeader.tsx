/**
 * src/modules/channels/components/ChannelHeader.tsx
 */

import { useState } from "react";
import { Hash, Volume2, Users, UserPlus, ChevronDown, Search } from "lucide-react";
import { cn } from "@/uikit/lib/utils";
import { Separator } from "@/uikit/separator";
import { useActiveChannels, useActiveGuildID } from "@/modules/guilds/guildStore";
import { InviteModal } from "@/modules/guilds/components/modals/InviteModal";
import { CHANNEL_TYPE_VOICE, CHANNEL_TYPE_TEXT } from "@/api/wails";
import {
    useLayoutStore,
    useMembersVisible,
} from "@/modules/layout/layoutStore";

// ─── Типы канала ──────────────────────────────────────────────────────────────

/** Вычисляет вариант хедера по типу канала из proto */
function resolveVariant(type?: number): "text" | "voice" | "dm" {
    if (type === CHANNEL_TYPE_VOICE) return "voice";
    // TODO: CHANNEL_TYPE_DM = 3 — добавить в wails.ts когда появится в proto
    return "text";
}

// ─── Иконка канала ────────────────────────────────────────────────────────────

function ChannelTypeIcon({
                             type,
                             className,
                         }: {
    type?: number;
    className?: string;
}) {
    const cls = cn("h-4 w-4 shrink-0 opacity-60", className);
    if (type === CHANNEL_TYPE_VOICE) return <Volume2 className={cls} />;
    return <Hash className={cls} />;
}

// ─── Переиспользуемая кнопка-иконка ──────────────────────────────────────────

interface IconButtonProps {
    label: string;
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
}

function IconButton({ label, onClick, active, children }: IconButtonProps) {
    return (
        <button
            title={label}
            aria-label={label}
            onClick={onClick}
            className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                active
                    ? "bg-kitsu-s3 text-foreground"
                    : "text-muted-foreground hover:bg-kitsu-s2 hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

// ─── Тема канала ──────────────────────────────────────────────────────────────

function ChannelTopic({ topic }: { topic: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Скрыть тему" : topic}
            className={cn(
                "group flex min-w-0 max-w-xs items-center gap-1",
                "text-[12px] text-muted-foreground/70 transition-colors hover:text-muted-foreground",
            )}
        >
      <span
          className={cn(
              "truncate transition-all",
              expanded ? "max-w-none whitespace-normal text-left" : "max-w-[200px]",
          )}
      >
        {topic}
      </span>
            <ChevronDown
                className={cn(
                    "h-3 w-3 shrink-0 opacity-0 transition-all group-hover:opacity-60",
                    expanded && "rotate-180 opacity-60",
                )}
            />
        </button>
    );
}

// ─── Скелет загрузки ─────────────────────────────────────────────────────────

function HeaderSkeleton() {
    return (
        <header className="flex h-12 shrink-0 items-center border-b border-kitsu-s4 px-4">
            <div className="h-4 w-32 animate-pulse rounded bg-kitsu-s3" />
        </header>
    );
}

// ─── Хедер текстового канала ─────────────────────────────────────────────────

interface TextHeaderProps {
    channelId: string;
}

function TextChannelHeader({ channelId }: TextHeaderProps) {
    const guildId = useActiveGuildID();
    const channels = useActiveChannels();
    const channel = channels.find((c) => c.id === channelId);

    const membersVisible = useMembersVisible();
    const { toggleMembers, toggleSearch } = useLayoutStore();
    const [inviteOpen, setInviteOpen] = useState(false);

    if (!channel) return <HeaderSkeleton />;

    // channel.topic появится когда бэкенд начнёт его отдавать
    const topic = (channel as any).topic as string | undefined;

    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 bg-kitsu-bg px-4">
                {/* Левая часть: иконка + имя + тема */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ChannelTypeIcon type={channel.type} />

                    <span className="truncate text-sm font-semibold text-foreground">
            {channel.name}
          </span>

                    {topic && (
                        <>
                            <Separator orientation="vertical" className="h-4 bg-kitsu-s4" />
                            <ChannelTopic topic={topic} />
                        </>
                    )}
                </div>

                {/* Правая часть: кнопки */}
                <div className="flex shrink-0 items-center gap-1">
                    {/* Поиск — Phase 2, кнопка уже есть, оверлей подключим позже */}
                    <IconButton label="Поиск по каналу" onClick={toggleSearch}>
                        <Search className="h-4 w-4" />
                    </IconButton>

                    {/* Пригласить */}
                    {guildId && (
                        <IconButton
                            label="Пригласить участников"
                            onClick={() => setInviteOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" />
                        </IconButton>
                    )}

                    {/* Список участников */}
                    <IconButton
                        label={membersVisible ? "Скрыть участников" : "Показать участников"}
                        onClick={toggleMembers}
                        active={membersVisible}
                    >
                        <Users className="h-4 w-4" />
                    </IconButton>
                </div>
            </header>

            {inviteOpen && guildId && (
                <InviteModal guildID={guildId} onClose={() => setInviteOpen(false)} />
            )}
        </>
    );
}

// ─── Хедер голосового канала ─────────────────────────────────────────────────
// Phase 3: здесь будет кнопка "Войти в канал" + список участников голоса.
// Сейчас — минимальная заглушка с правильной структурой.

function VoiceChannelHeader({ channelId }: { channelId: string }) {
    const channels = useActiveChannels();
    const channel = channels.find((c) => c.id === channelId);

    const membersVisible = useMembersVisible();
    const { toggleMembers } = useLayoutStore();

    if (!channel) return <HeaderSkeleton />;

    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-kitsu-s4 bg-kitsu-bg px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <ChannelTypeIcon type={channel.type} />
                <span className="truncate text-sm font-semibold text-foreground">
          {channel.name}
        </span>
                {/* Phase 3: <JoinVoiceButton channelId={channelId} /> */}
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <IconButton
                    label={membersVisible ? "Скрыть участников" : "Показать участников"}
                    onClick={toggleMembers}
                    active={membersVisible}
                >
                    <Users className="h-4 w-4" />
                </IconButton>
            </div>
        </header>
    );
}

// ─── Публичный API: единая точка входа ───────────────────────────────────────

interface ChannelHeaderProps {
    channelId: string;
}

/**
 * Определяет тип канала и рендерит нужный вариант хедера.
 * Снаружи не нужно передавать тип — компонент читает его из стора сам.
 */
export function ChannelHeader({ channelId }: ChannelHeaderProps) {
    const channels = useActiveChannels();
    const channel = channels.find((c) => c.id === channelId);

    const variant = resolveVariant(channel?.type);

    if (variant === "voice") {
        return <VoiceChannelHeader channelId={channelId} />;
    }

    // "text" | "dm" — пока один компонент, разойдутся в Phase 2
    return <TextChannelHeader channelId={channelId} />;
}