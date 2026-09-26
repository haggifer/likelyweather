import { cn } from '@fa/ui/lib/utils'
import { ReactNode } from 'react'

export type ChipTone = 'ok' | 'info' | 'warn' | 'fail' | 'muted'

interface IProps {
    tone: ChipTone
    title?: string
    className?: string
    children: ReactNode
}

// Tone colors and the tinted pill come from .fa-chip in globals.css.
export default function StatusChip({ tone, title, className, children }: IProps) {
    return (
        <span className={cn('fa-chip', tone !== 'muted' && `fa-chip-${tone}`, className)} title={title}>
            {children}
        </span>
    )
}
