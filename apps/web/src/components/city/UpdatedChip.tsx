'use client'

import { StatusChip } from '@/components/shell/StatusChip'
import { ChipTone } from '@/components/types'
import { STALE_AFTER_HOURS } from '@fa/shared/constants'
import { formatTime } from '@fa/shared/format'
import { hoursBetween } from '@fa/shared/time'
import { cn } from '@fa/ui/lib/cn'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    issueTime: string
    fetchedAt?: string
    timeZone: string
    now: Date | null
    className?: string
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

export function UpdatedChip({ issueTime, fetchedAt, timeZone, now, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const isStale = now ? hoursBetween(issueTime, now) > STALE_AFTER_HOURS : false
    const utc = formatTime(issueTime, 'UTC', locale, TIME_FORMAT)
    const local = formatTime(issueTime, timeZone, locale, TIME_FORMAT)

    return (
        <StatusChip
            tone={isStale ? ChipTone.Warn : ChipTone.Ok}
            className={cn('h-7', className)}
            title={t('updatedTitle', { utc: `${utc} UTC`, local, fetched: fetchedAt ?? '' })}
        >
            {isStale ? t('stale') : t('updated')} {utc} UTC · {local} {t('local')}
        </StatusChip>
    )
}
