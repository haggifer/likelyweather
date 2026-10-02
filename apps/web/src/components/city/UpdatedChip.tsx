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

// Which model run the page shows, in the city's time. UTC, the time model runs are named by, stays in the tooltip.
export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const age = now ? hoursBetween(issueTime, now) : 0
    const isStale = age > STALE_AFTER_HOURS
    const time = formatStepLabel(issueTime, timeZone, locale)
    const title = t('forecastTitle', {
        time,
        utc: `${formatTime(issueTime, 'UTC', locale, CLOCK)} UTC`,
        fetched: formatStepLabel(fetchedAt, timeZone, locale),
    })

    return (
        <StatusChip
            tone={isStale ? ChipTone.Warn : ChipTone.Ok}
            className={cn('h-7', className)}
            title={isStale ? `${title} ${t('forecastOldTitle')}` : title}
        >
            {isStale ? t('forecastFromOld', { time, hours: age }) : t('forecastFrom', { time })}
        </StatusChip>
    )
}
