import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2",
        {
          "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80": variant === 'default',
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80": variant === 'secondary',
          "border-transparent bg-red-500 text-neutral-50 hover:bg-red-500/80": variant === 'destructive',
          "text-neutral-950": variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
