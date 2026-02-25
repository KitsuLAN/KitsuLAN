// src/uikit/status-dot.tsx
import { cn } from "@/uikit/lib/utils"

interface StatusDotProps {
    status: "online" | "away" | "dnd" | "offline"
    className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
    return (
        <span
            className={cn(
                "block shrink-0",
                "rounded-tl-sm rounded-br-sm rounded-bl-none rounded-tr-none",
                status === "online" && "bg-kitsu-online",
                status === "away" && "bg-kitsu-away",
                status === "dnd" && "bg-kitsu-dnd",
                status === "offline" && "bg-kitsu-offline",
                className
            )}
        />
    )
}