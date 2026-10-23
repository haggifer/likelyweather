'use client'

import { Hint } from '@/components/shell/Hint'
import { Progress } from '@/components/ui/progress'
import { useStoredQuota } from '@/hooks/useStoredQuota'
import { formatClockTime, getViewerTimeZone } from '@fa/shared/format'
import { getQuotaStatus } from '@fa/shared/quota'
import { useLocale, useTranslations } from 'next-intl'

// Requests left today out of the daily quota. The reset time is shown in the viewer's own time zone.
export function QuotaMeter() {
    const t = useTranslations('shell.quota')
    const locale = useLocale()

    const { quota: data } = useStoredQuota()

    if (!data) return null

    const { left, share, isLow } = getQuotaStatus(data)
    const resetsAt = formatClockTime(data.resetsAt, getViewerTimeZone(), locale)

    // The meter speaks for the bar inside it, which stays out of the accessibility tree.
    return (
        <Hint content={t('resets', { time: resetsAt })}>
            <div
                role="meter"
                tabIndex={0}
                aria-label={t('label')}
                aria-valuemin={0}
                aria-valuemax={data.limit}
                aria-valuenow={left}
                aria-valuetext={t('value', { left, limit: data.limit })}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs text-muted-foreground outline-none touch:h-9 focus-visible:ring-2 focus-visible:ring-ring"
            >
                <span className="hidden sm:inline">{t('short')}</span>
                <Progress
                    value={share * 100}
                    aria-hidden="true"
                    className="hidden h-1.5 w-16 sm:flex"
                    indicatorClassName={isLow ? 'bg-warning' : 'bg-primary'}
                />
                <span className="font-medium text-foreground tabular-nums">
                    {left}/{data.limit}
                </span>
            </div>
        </Hint>
    )
}
