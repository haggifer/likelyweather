'use client'

import { REFRESH_AFTER_HOURS } from '@fa/shared/constants'
import { Button } from '@fa/ui/components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { cn } from '@fa/ui/lib/cn'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface IProps {
    isAvailable: boolean
    isFetching?: boolean
    onRefresh?: () => void
    className?: string
    wrapperClassName?: string
    labelClassName?: string
}

// Refresh is offered once the data on screen is REFRESH_AFTER_HOURS old, when its age chip appears; before that it
// is disabled and its tooltip says why.
export function RefreshButton({
    isAvailable,
    isFetching = false,
    onRefresh,
    className,
    wrapperClassName,
    labelClassName,
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
            <RefreshCw className={cn(isFetching && 'animate-spin')} />{' '}
            <span className={labelClassName}>{t('refresh')}</span>
        </Button>
    )

    if (isEnabled) return button

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {/* A disabled button gets no pointer events, so the tooltip hangs on a focusable wrapper. */}
                <span
                    tabIndex={0}
                    className={cn(
                        'inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        wrapperClassName,
                    )}
                >
                    {button}
                </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('upToDate', { hours: REFRESH_AFTER_HOURS })}</TooltipContent>
        </Tooltip>
    )
}
