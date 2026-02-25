import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/uikit/lib/utils"

function Avatar({
                  className,
                  size = "md",
                  ...props
                }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Root> & {
  size?: "sm" | "md" | "lg"
}) {
  return (
      <AvatarPrimitive.Root
          data-size={size}
          className={cn(
              "relative flex shrink-0 overflow-hidden rounded-[3px] border border-kitsu-s4",
              size === "sm" && "size-6",
              size === "md" && "size-8",
              size === "lg" && "size-10",
              className
          )}
          {...props}
      />
  )
}

function AvatarImage({
                       className,
                       ...props
                     }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Image>) {
  return (
      <AvatarPrimitive.Image
          className={cn("aspect-square h-full w-full object-cover", className)}
          {...props}
      />
  )
}

function AvatarFallback({
                          className,
                          ...props
                        }: React.ComponentPropsWithRef<typeof AvatarPrimitive.Fallback>) {
  return (
      <AvatarPrimitive.Fallback
          className={cn(
              "flex h-full w-full items-center justify-center bg-kitsu-s3 font-mono font-medium text-fg",
              "text-xs",
              "[[data-size=sm]_&]:text-[10px]",
              "[[data-size=lg]_&]:text-sm",
              className
          )}
          {...props}
      />
  )
}

function AvatarBadge({
                       className,
                       ...props
                     }: React.ComponentPropsWithRef<"span">) {
  return (
      <span
          className={cn(
              "absolute -bottom-0.5 -right-0.5 z-10 inline-flex items-center justify-center rounded-full border border-kitsu-s4 bg-kitsu-p1",
              "[[data-size=sm]_&]:h-1.5 [[data-size=sm]_&]:w-1.5",
              "[[data-size=md]_&]:h-2 [[data-size=md]_&]:w-2",
              "[[data-size=lg]_&]:h-2.5 [[data-size=lg]_&]:w-2.5",
              "[[data-size=sm]_&]:[&>svg]:hidden",
              "[[data-size=md]_&]:[&>svg]:h-1.5 [[data-size=md]_&]:[&>svg]:w-1.5",
              "[[data-size=lg]_&]:[&>svg]:h-2 [[data-size=lg]_&]:[&>svg]:w-2",
              className
          )}
          {...props}
      />
  )
}

function AvatarGroup({
                       className,
                       ...props
                     }: React.ComponentPropsWithRef<"div">) {
  return (
      <div
          className={cn(
              "flex -space-x-1.5",
              "*:border-2 *:border-kitsu-bg",
              className
          )}
          {...props}
      />
  )
}

function AvatarGroupCount({
                            className,
                            size = "md",
                            ...props
                          }: React.ComponentPropsWithRef<"div"> & {
  size?: "sm" | "md" | "lg"
}) {
  return (
      <div
          className={cn(
              "relative flex shrink-0 items-center justify-center rounded-[3px] border-2 border-kitsu-bg bg-kitsu-s3 font-mono font-medium text-fg",
              size === "sm" && "h-[18px] w-[18px] text-[8px]",
              size === "md" && "h-[22px] w-[22px] text-[9px]",
              size === "lg" && "h-[26px] w-[26px] text-[10px]",
              "[&>svg]:h-3 [&>svg]:w-3",
              size === "sm" && "[&>svg]:h-2.5 [&>svg]:w-2.5",
              size === "lg" && "[&>svg]:h-3.5 [&>svg]:w-3.5",
              className
          )}
          {...props}
      />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}