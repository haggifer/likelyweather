'use client'

import StatusChip from '@/components/shell/StatusChip'
import { useCity, useLatest } from '@/hooks/queries'
import useNow from '@/hooks/useNow'
import { formatTime } from '@/lib/format'
import { STALE_AFTER_HOURS } from '@/shared/constants'
import { hoursBetween } from '@/shared/time'
import { useAppSelector } from '@/store'
import { useLocale, useTranslations } from 'next-intl'

interface IProps {
    slug: string
    className?: string
}

export default function UpdatedChip({ slug, className }: IProps) {
    const t = useTranslations('city')
    const locale = useLocale()
    const now = useNow()
    const variable = useAppSelector((s) => s.dashboard.variable)
    const { data: city } = useCity(slug)
    const { data: latest } = useLatest(slug, variable, Boolean(city))
    const issueTime = latest?.issueTime ?? city?.latestIssueTime

    if (!city || !issueTime || !now) return null

    const isStale = hoursBetween(issueTime, now) > STALE_AFTER_HOURS
    const utc = formatTime(issueTime, 'UTC', locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const local = formatTime(issueTime, city.timezone, locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

    return (
        <StatusChip
            tone={isStale ? 'warn' : 'ok'}
            className={className}
            title={t('updatedTitle', { utc: `${utc} UTC`, local, fetched: latest?.fetchedAt ?? '' })}
        >
            {isStale ? t('stale') : t('updated')} {utc} UTC · {local} {t('local')}
        </StatusChip>
    )
}
