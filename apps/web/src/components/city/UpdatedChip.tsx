'use client'

import { Hint } from '@/components/shell/Hint'
import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { cn } from '@/lib/cn'
import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from '@fa/shared/constants'
import { formatStepLabel, formatTime } from '@fa/shared/format'
import { getAgeHours } from '@fa/shared/time'
import { ClockAlert } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

interface IProps {
    issueTime: string
    fetchedAt: string
    timeZone: string
    now: Date | null
    // The overview card's phone row has room for icons only (author, 2026-10-13): a warning clock, its age in the hint.
    isIconOnPhones?: boolean
    className?: string
}

// How long ago the data on screen was fetched, the moment the chart starts at, shown once it is REFRESH_AFTER_HOURS
// old (when Refresh turns on). An age reads the same in every time zone, unlike a clock time that is the city's; the
// run's times, city and UTC, are in its hint (a tooltip, or a tap on touch screens).
export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, isIconOnPhones = false, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()

    const hours = now ? getAgeHours(fetchedAt, now) : 0

    if (hours < REFRESH_AFTER_HOURS) return null

    const isStale = hours > STALE_AFTER_HOURS
    const age = t('forecastAge', { hours })
    const title = t('forecastTitle', {
        time: formatStepLabel(issueTime, timeZone, locale),
        utc: `${formatTime(issueTime, 'UTC', locale, CLOCK)} UTC`,
        fetched: formatStepLabel(fetchedAt, timeZone, locale),
    })

    const details = isStale ? `${title} ${t('forecastOldTitle')}` : title

    return (
        <Hint
            content={
                <>
                    {isIconOnPhones && <span className="font-semibold sm:hidden">{age}. </span>}
                    {details}
                </>
            }
        >
            <button
                type="button"
                aria-label={isIconOnPhones ? age : undefined}
                className={cn(
                    'shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isIconOnPhones && 'max-sm:flex max-sm:size-8 max-sm:items-center max-sm:justify-center',
                    className,
                )}
            >
                <StatusChip
                    tone={isStale ? ChipTone.Warn : ChipTone.Ok}
                    className={cn('h-7', isIconOnPhones && 'max-sm:hidden')}
                >
                    {age}
                </StatusChip>
                {isIconOnPhones && <ClockAlert aria-hidden="true" className="size-5 text-warning sm:hidden" />}
            </button>
        </Hint>
    )
}
