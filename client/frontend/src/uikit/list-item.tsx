// src/uikit/list-item.tsx
import { cn } from "@/uikit/lib/utils"
import React from "react"

interface ListItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "prefix" | "content"> {
    active?: boolean
    prefix?: React.ReactNode // Иконка решетки или рупора
    content: React.ReactNode // Название канала или имя юзера
    suffix?: React.ReactNode // Бейдж или счетчик
}

export function ListItem({ active, prefix, content, suffix, className, ...props }: ListItemProps) {
    return (
        <button
            className={cn(
                "flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-1.5 text-left transition-colors",
                "select-none text-fg-muted",
                "hover:bg-kitsu-s2 hover:text-fg",
                active && "border-l-kitsu-orange bg-kitsu-s3 text-fg",
                className
            )}
            {...props}
        >
            {prefix && (
                <span className={cn("flex w-4 shrink-0 font-mono text-sm", active ? "text-kitsu-orange" : "text-fg-dim")}>
                    {prefix}
                </span>
            )}

            <div className="flex-1 truncate text-sm font-medium">
                {content}
            </div>

            {suffix && <div className="shrink-0">{suffix}</div>}
        </button>
    )
}

// Вспомогательный компонент для заголовков групп ("ТЕКСТОВЫЕ КАНАЛЫ", "ОНЛАЙН")
export function ListGroupHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1 px-3 pb-1 pt-3 font-mono text-xs font-semibold uppercase tracking-widest text-fg-dim">
            {children}
        </div>
    )
}