import { ChipTone } from '@/components/types'
import { cn } from '@fa/ui/lib/cn'
import { ReactNode } from 'react'

interface IProps {
    tone: ChipTone
    title?: string
    className?: string
    children: ReactNode
}

// Tone colors and the tinted pill come from .fa-chip in globals.css.
export function StatusChip({ tone, title, className, children }: IProps) {
    return (
        <span className={cn('fa-chip', tone !== 'muted' && `fa-chip-${tone}`, className)} title={title}>
            {children}
        </span>
    )
}
