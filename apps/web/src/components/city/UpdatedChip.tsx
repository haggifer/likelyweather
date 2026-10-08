'use client'

import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { cn } from '@/lib/cn'
import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from '@fa/shared/constants'
import { formatStepLabel, formatTime } from '@fa/shared/format'
import { getAgeHours } from '@fa/shared/time'
import { useLocale, useTranslations } from 'next-intl'

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

interface IProps {
    issueTime: string
    fetchedAt: string
    timeZone: string
    now: Date | null
    className?: string
}

// How long ago the data on screen was fetched, the moment the chart starts at, shown once it is REFRESH_AFTER_HOURS
// old (when Refresh turns on). An age reads the same in every time zone, unlike a clock time that is the city's; the
// run's times, city and UTC, are in the tooltip.
export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const hours = now ? getAgeHours(fetchedAt, now) : 0

    if (hours < REFRESH_AFTER_HOURS) return null

    const isStale = hours > STALE_AFTER_HOURS
    const title = t('forecastTitle', {
        time: formatStepLabel(issueTime, timeZone, locale),
        utc: `${formatTime(issueTime, 'UTC', locale, CLOCK)} UTC`,
        fetched: formatStepLabel(fetchedAt, timeZone, locale),
    })

    return (
        <StatusChip
            tone={isStale ? ChipTone.Warn : ChipTone.Ok}
            className={cn('h-7', className)}
            title={isStale ? `${title} ${t('forecastOldTitle')}` : title}
        >
            {t('forecastAge', { hours })}
        </StatusChip>
    )
}
