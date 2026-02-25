import * as React from "react"
import { cn } from "@/uikit/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-[3px] border border-kitsu-s4 bg-kitsu-s0 px-3 py-1 font-mono text-sm text-fg shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-fg-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-kitsu-orange disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }