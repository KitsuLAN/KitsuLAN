import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/uikit/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] text-sm font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-kitsu-orange disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
      variants: {
        variant: {
          default:
              "bg-kitsu-orange text-white shadow hover:bg-kitsu-orange-hover border border-transparent",
          destructive:
              "bg-kitsu-dnd text-white shadow-sm hover:bg-kitsu-dnd/90",
          outline:
              "border border-kitsu-s4 bg-transparent shadow-sm hover:bg-kitsu-s2 hover:text-fg",
          secondary:
              "bg-kitsu-s2 text-fg shadow-sm hover:bg-kitsu-s3 border border-kitsu-s4",
          ghost: "hover:bg-kitsu-s2 hover:text-fg text-fg-muted",
          link: "text-kitsu-orange underline-offset-4 hover:underline normal-case tracking-normal",
        },
        size: {
          default: "h-9 px-4 py-2",
          sm: "h-8 px-3 text-xs",
          lg: "h-10 px-8",
          icon: "h-9 w-9",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, children, ...props }, ref) => {
      const Comp = asChild ? Slot : "button"
      return (
          <Comp
              className={cn(buttonVariants({ variant, size, className }))}
              ref={ref}
              disabled={loading || props.disabled}
              {...props}
          >
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </Comp>
      )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }