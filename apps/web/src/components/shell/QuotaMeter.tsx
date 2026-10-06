'use client'

import { useQuota } from '@/hooks/useQuota'
import { formatTime, getViewerTimeZone } from '@fa/shared/format'
import { Tooltip, TooltipContent, TooltipTrigger } from '@fa/ui/components/tooltip'
import { cn } from '@fa/ui/lib/cn'
import { useLocale, useTranslations } from 'next-intl'

const LOW_SHARE = 0.2
const RESET_TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

// Requests left today out of the daily quota. The reset time is shown in the viewer's own time zone.
export function QuotaMeter() {
    const t = useTranslations('shell.quota')
    const locale = useLocale()

    const { quota: data } = useQuota()

    if (!data) return null

    const left = Math.max(0, data.limit - data.used)
    const share = left / data.limit
    const resetsAt = formatTime(data.resetsAt, getViewerTimeZone(), locale, RESET_TIME_FORMAT)

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    role="meter"
                    tabIndex={0}
                    aria-label={t('label')}
                    aria-valuemin={0}
                    aria-valuemax={data.limit}
                    aria-valuenow={left}
                    aria-valuetext={t('value', { left, limit: data.limit })}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="hidden sm:inline">{t('short')}</span>
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                        <span
                            className={cn(
                                'block h-full rounded-full transition-[width]',
                                share <= LOW_SHARE ? 'bg-warning' : 'bg-primary',
                            )}
                            style={{ width: `${share * 100}%` }}
                        />
                    </span>
                    <span className="font-medium text-foreground tabular-nums">
                        {left}/{data.limit}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('resets', { time: resetsAt })}</TooltipContent>
        </Tooltip>
    )
}
