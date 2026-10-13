import { REFRESH_AFTER_HOURS, STALE_AFTER_HOURS } from './constants'
import { formatStepLabel, formatTime } from './format'
import { StatusTone } from './status-tone'
import { getAgeHours } from './time'

interface ForecastAge {
    hours: number
    // Shown once Refresh turns on, REFRESH_AFTER_HOURS after the fetch.
    isShown: boolean
    isStale: boolean
    tone: StatusTone
}

// The `forecastTitle` message's values: the run's start in the city and in UTC, and when it was fetched. A Record, so
// it passes as message values, which take an index signature.
type ForecastTitleValues = Record<'time' | 'utc' | 'fetched', string>

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

export const getForecastAge = (fetchedAt: string, now: Date | null): ForecastAge => {
    const hours = now ? getAgeHours(fetchedAt, now) : 0
    const isStale = hours > STALE_AFTER_HOURS

    return { hours, isShown: hours >= REFRESH_AFTER_HOURS, isStale, tone: isStale ? 'warn' : 'ok' }
}

export const getForecastTitleValues = (
    issueTime: string,
    fetchedAt: string,
    timeZone: string,
    locale: string,
): ForecastTitleValues => ({
    time: formatStepLabel(issueTime, timeZone, locale),
    utc: `${formatTime(issueTime, 'UTC', locale, CLOCK)} UTC`,
    fetched: formatStepLabel(fetchedAt, timeZone, locale),
})
