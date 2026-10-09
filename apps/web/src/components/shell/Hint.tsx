'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ReactElement, ReactNode } from 'react'

const COARSE_POINTER_QUERY = '(pointer: coarse)'

interface IProps {
    content: ReactNode
    children: ReactElement
    className?: string
}

// A tooltip opens on hover and focus, which a touch screen never gives, so on a coarse pointer the same text opens on a
// tap instead. The trigger must take focus and clicks: a disabled button goes inside a focusable wrapper.
export function Hint({ content, children, className }: IProps) {
    const isTouch = useMediaQuery(COARSE_POINTER_QUERY)

    if (isTouch) {
        return (
            <Popover>
                <PopoverTrigger asChild>{children}</PopoverTrigger>
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
