// src/uikit/nav-icon.tsx
import { cn } from "@/uikit/lib/utils"

interface NavIconProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean
    label: string
    color?: string // Кастомный цвет фона для гильдии
}

export function NavIcon({ active, label, color, className, ...props }: NavIconProps) {
    const customStyle = color && !active ? { backgroundColor: color, color: "#fff" } : {}

    return (
        <div className="relative flex w-full justify-center" title={props.title}>
            {/* Индикатор активности слева */}
            {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-kitsu-orange" />
            )}

            <button
                className={cn(
                    "flex size-12 shrink-0 select-none items-center text-lg justify-center rounded border font-mono font-medium transition-colors",
                    active
                        ? "border-kitsu-orange bg-kitsu-orange-dim text-kitsu-orange"
                        : "border-kitsu-s4 bg-kitsu-s2 text-fg-muted hover:border-kitsu-s5 hover:bg-kitsu-s3 hover:text-fg",
                    className
                )}
                style={customStyle}
                {...props}
            >
                {label}
            </button>
        </div>
    )
}