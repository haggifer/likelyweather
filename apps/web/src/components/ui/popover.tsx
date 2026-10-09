'use client'

import { cn } from 'cn'
import { Popover as PopoverPrimitive } from 'radix-ui'
import * as React from 'react'

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
    return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
    return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

// Styled like the tooltip: on touch screens it carries the same hints a tooltip shows on hover.
function PopoverContent({
    className,
    sideOffset = 4,
    children,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                sideOffset={sideOffset}
                collisionPadding={8}
                className={cn(
                    'z-50 w-fit max-w-xs origin-(--radix-popover-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-background outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                    className,
                )}
                {...props}
            >
                {children}
                <PopoverPrimitive.Arrow className="fill-foreground" />
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
    )
}

export { Popover, PopoverAnchor, PopoverContent }
