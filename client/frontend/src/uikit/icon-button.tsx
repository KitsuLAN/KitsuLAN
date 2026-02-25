import { cn } from "./lib/utils"
import { ButtonHTMLAttributes } from "react"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/uikit/tooltip";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean
    size?: "sm" | "md"
    tooltip?: string
}

export function IconButton({ active, size = "md", className, children, tooltip, title, ...props }: IconButtonProps) {
    // Если передан native title, используем его как tooltip текст
    const tooltipText = tooltip || title;

    const button = (
        <button
            className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-[3px] border transition-colors",
                "border-kitsu-s4 bg-transparent text-fg-muted",
                "hover:border-kitsu-s5 hover:bg-kitsu-s3 hover:text-fg",
                "disabled:pointer-events-none disabled:opacity-40",
                size === "md" && "h-6 w-6",
                size === "sm" && "h-[22px] w-[22px]",
                active && "border-kitsu-orange bg-kitsu-orange-dim text-kitsu-orange",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );

    if (!tooltipText) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="top">
                {tooltipText}
            </TooltipContent>
        </Tooltip>
    );
}