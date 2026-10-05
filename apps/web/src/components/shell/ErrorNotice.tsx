'use client'

import { getErrorKind } from '@/lib/error-kind'
import { Button } from '@fa/ui/components/button'
import { cn } from '@fa/ui/lib/cn'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    error: unknown
    onRetry?: () => void
    className?: string
}

export function ErrorNotice({ error, onRetry, className }: IProps) {
    const t = useTranslations('errors')

    return (
        <div
            role="alert"
            className={cn('flex flex-col items-center gap-3 text-center text-sm text-muted-foreground', className)}
        >
            <p>{t(getErrorKind(error))}</p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RefreshCw /> {t('retry')}
                </Button>
            )}
        </div>
    )
}
