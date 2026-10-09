'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { getErrorKind } from '@fa/api-client/error-kind'
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
                <Button variant="outline" size="sm" onClick={onRetry} className="pointer-coarse:h-9">
                    <RefreshCw /> {t('retry')}
                </Button>
            )}
        </div>
    )
}
