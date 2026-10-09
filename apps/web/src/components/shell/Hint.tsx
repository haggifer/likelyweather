'use client'

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Slot } from 'radix-ui'
import { ReactElement, ReactNode, useState } from 'react'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

interface IProps {
    content: ReactNode
    children: ReactElement
    className?: string
}

// A tooltip opens on hover and focus, which a touch screen never gives, so on a coarse pointer the same text opens on a
// tap instead. The trigger must take focus and clicks: a disabled button goes inside a focusable wrapper. The popover
// opens from an anchor rather than a trigger, because a trigger's aria-expanded is not allowed on a meter or a plain
// wrapper; a tap outside closes it.
export function Hint({ content, children, className }: IProps) {
    const isTouch = useMediaQuery(COARSE_POINTER_QUERY)

    const [isOpen, setIsOpen] = useState(false)

    if (isTouch) {
        return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverAnchor asChild>
                    <Slot.Root onClick={() => setIsOpen(true)}>{children}</Slot.Root>
                </PopoverAnchor>
                <PopoverContent side="bottom" className={className}>
                    {content}
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="bottom" className={className}>
                {content}
            </TooltipContent>
        </Tooltip>
    )
}
