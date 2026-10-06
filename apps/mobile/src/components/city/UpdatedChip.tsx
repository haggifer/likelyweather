import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from '@fa/shared/constants'
import { getAgeHours } from '@fa/shared/time'
import { useTranslations } from 'use-intl'
import { StatusChip } from '../ui/StatusChip'

interface IProps {
    fetchedAt: string
    now: Date
}

// How old the data on screen is, shown once Refresh turns on; amber once it is past the stale mark.
export function UpdatedChip({ fetchedAt, now }: IProps) {
    const t = useTranslations('city')

    const hours = getAgeHours(fetchedAt, now)

    if (hours < REFRESH_AFTER_HOURS) return null

    return <StatusChip tone={hours > STALE_AFTER_HOURS ? 'warn' : 'ok'} label={t('forecastAge', { hours })} />
}
