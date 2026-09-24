import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export type ChipTone = 'ok' | 'info' | 'warn' | 'fail' | 'muted'

interface IProps {
    tone: ChipTone
    title?: string
    className?: string
    children: ReactNode
}

// Styling follows the Theme Lab's status-chip axis (filled, outline, dot + text) via [data-chips] in globals.css.
export default function StatusChip({ tone, title, className, children }: IProps) {
    return (
        <span className={cn('fa-chip', tone !== 'muted' && `fa-chip-${tone}`, className)} title={title}>
            {children}
        </span>
    )
}
