import { cn } from 'cn'
import * as React from 'react'

// The app's Input (apps/mobile/src/components/ui/input.tsx): 40 px tall on phones, 36 px from `sm` up.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'h-10 w-full min-w-0 rounded-md border border-border bg-background px-3 py-1 text-base shadow-sm shadow-black/5 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 sm:h-9 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
                className,
            )}
            {...props}
        />
    )
}

export { Input }
