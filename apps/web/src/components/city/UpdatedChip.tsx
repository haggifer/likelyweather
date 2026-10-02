'use client'

import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { STALE_AFTER_HOURS } from '@fa/shared/constants'
import { formatStepLabel, formatTime } from '@fa/shared/format'
import { hoursBetween } from '@fa/shared/time'
import { cn } from '@fa/ui/lib/cn'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    issueTime: string
    fetchedAt: string
    timeZone: string
    now: Date | null
    className?: string
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

// The age of the model run on screen. An age reads the same in every time zone, unlike a clock time that is the
// city's; the run's times, city and UTC, are in the tooltip.
export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    if (!now) return null

    const hours = hoursBetween(issueTime, now)
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
