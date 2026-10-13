'use client'

import { cn } from 'cn'
import { Progress as ProgressPrimitive } from 'radix-ui'
import * as React from 'react'

// `indicatorClassName` as on the app's Progress (React Native Reusables), so both apps colour the bar the same way.
function Progress({
    className,
    value,
    indicatorClassName,
    ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            className={cn('relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted', className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                data-slot="progress-indicator"
                className={cn('size-full flex-1 bg-primary transition-all', indicatorClassName)}
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    )
}

export { Progress }
