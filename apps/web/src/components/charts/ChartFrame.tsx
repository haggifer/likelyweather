'use client'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { BarChart3, Table2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ReactNode, useState } from 'react'

interface IProps {
    title: ReactNode
    description?: ReactNode
    table?: ReactNode
    actions?: ReactNode
    footer?: ReactNode
    isFetching?: boolean
    className?: string
    children: ReactNode
}

export function ChartFrame({ title, description, table, actions, footer, isFetching, className, children }: IProps) {
    const t = useTranslations('chart')
    const [isTable, setIsTable] = useState(false)

    return (
        <Card className={cn('gap-3', className)}>
            <CardHeader>
                <CardTitle className="font-semibold">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                <CardAction className="flex items-center gap-1.5">
                    {actions}
                    {table && (
                        <Button
                            variant="ghost"
                            size="sm"
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
            <CardContent className={cn('transition-opacity', isFetching && 'opacity-60')}>
                {isTable && table ? <div className="max-h-[26.25rem] overflow-auto">{table}</div> : children}
                {footer}
            </CardContent>
        </Card>
    )
}
