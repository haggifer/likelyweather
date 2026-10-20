'use client'

import { TABLE_SCROLL } from '@/components/charts/table-cells'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { BarChart3, Table2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ReactNode, useState } from 'react'

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
    const [isTable, setIsTable] = useState(false)

    return (
        <Card className={cn('gap-3', className)}>
            <CardHeader>
                <CardTitle className="font-semibold max-sm:text-lg">{title}</CardTitle>
                <CardAction className="flex items-center gap-1.5">
                    {actions}
                    {table && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="max-sm:text-sm"
                            onClick={() => setIsTable((v) => !v)}
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
                    'transition-opacity in-data-switching:opacity-60',
                    !isTable && 'max-sm:pl-1',
                    isFetching && 'opacity-60',
                )}
            >
                {isTable && table ? <div className={cn(TABLE_SCROLL, 'max-h-[26.25rem]')}>{table}</div> : children}
                {footer}
            </CardContent>
        </Card>
    )
}
