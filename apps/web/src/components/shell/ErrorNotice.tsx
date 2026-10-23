'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getErrorKind } from '@fa/api-client/error-kind'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    error: unknown
    onRetry?: () => void
    className?: string
}

// `className` spaces the notice in its page, so it goes on a wrapper rather than on the alert's box.
export function ErrorNotice({ error, onRetry, className }: IProps) {
    const t = useTranslations('errors')

    return (
        <div className={className}>
            <Alert>
                <CircleAlert />
                <AlertDescription>{t(getErrorKind(error))}</AlertDescription>
                {onRetry && (
                    <div className="col-start-2 mt-2">
                        <Button variant="outline" size="sm" onClick={onRetry} className="touch:h-9">
                            <RefreshCw /> {t('retry')}
                        </Button>
                    </div>
                )}
            </Alert>
        </div>
    )
}
