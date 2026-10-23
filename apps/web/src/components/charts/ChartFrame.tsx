'use client'

import { TABLE_SCROLL } from '@/components/charts/table-cells'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useViewMode } from '@/hooks/useViewMode'
import { cn } from '@/lib/cn'
import { BarChart3, Loader2, Table2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'

interface IProps {
    title: ReactNode
    table?: ReactNode
    // Shown above the chart, not with the table, which already holds what they switch between.
    tabs?: ReactNode
    actions?: ReactNode
    footer?: ReactNode
    isFetching?: boolean
    className?: string
    children: ReactNode
}

export function ChartFrame({ title, table, tabs, actions, footer, isFetching, className, children }: IProps) {
    const t = useTranslations('chart')
    const { isTable, toggleTable } = useViewMode()

    return (
        <Card className={cn('gap-2', className)}>
            <CardHeader>
                <CardTitle className="font-semibold max-sm:text-lg">{title}</CardTitle>
                <CardAction className="flex items-center gap-1.5">
                    {actions}
                    {table && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="touch:h-9 max-sm:text-sm"
                            onClick={toggleTable}
                            aria-pressed={isTable}
                            aria-label={isTable ? t('showChart') : t('showTable')}
                        >
                            {isTable ? <BarChart3 /> : <Table2 />}
                            {isTable ? t('chart') : t('table')}
                        </Button>
                    )}
                </CardAction>
            </CardHeader>
            {tabs && !isTable && <div className="px-(--card-spacing)">{tabs}</div>}
            <CardContent
                // On phones the chart runs close to the card's left edge, while the table keeps the card's padding.
                className={cn(
                    'relative transition-opacity in-data-switching:opacity-60',
                    !isTable && 'max-sm:pl-1',
                    isFetching && 'opacity-60',
                )}
            >
                {isTable && table ? <div className={cn(TABLE_SCROLL, 'max-h-[26.25rem]')}>{table}</div> : children}
                {footer}
                {/* Only a switch slower than 300 ms shows it; the spin is a transform, which keeps turning while the chart is
                    computed. */}
                <Loader2
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-1/2 animate-spin text-muted-foreground opacity-0 transition-opacity in-data-switching:opacity-100 in-data-switching:delay-300"
                />
            </CardContent>
        </Card>
    )
}
