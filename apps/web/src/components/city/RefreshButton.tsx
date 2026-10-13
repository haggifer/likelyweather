'use client'

import { Hint } from '@/components/shell/Hint'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    isAvailable: boolean
    isFetching?: boolean
    onRefresh?: () => void
    // A phone row with room for icons only keeps the label for screen readers.
    isIconOnPhones?: boolean
    className?: string
    wrapperClassName?: string
}

// Refresh is offered once the data on screen is REFRESH_AFTER_HOURS old, when its age chip appears; before that it
// is disabled and its hint says why.
export function RefreshButton({
    isAvailable,
    isFetching = false,
    onRefresh,
    isIconOnPhones = false,
    className,
    wrapperClassName,
}: IProps) {
    const t = useTranslations('city')
    const isEnabled = isAvailable && Boolean(onRefresh)
    const button = (
        <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={!isEnabled || isFetching}
            title={isEnabled ? t('refreshTitle') : undefined}
            className={className}
        >
            <RefreshCw className={cn(isFetching && 'animate-spin')} />
            <span className={cn(isIconOnPhones && 'max-sm:sr-only')}>{t('refresh')}</span>
        </Button>
    )

    if (isEnabled) return button

    return (
        <Hint content={t('upToDate', { hours: REFRESH_AFTER_HOURS })}>
            {/* A disabled button gets no pointer events, so the hint hangs on a focusable wrapper. */}
            <span
                tabIndex={0}
                className={cn(
                    'inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    wrapperClassName,
                )}
            >
                {button}
            </span>
        </Hint>
    )
}
