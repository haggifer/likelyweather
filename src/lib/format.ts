import { City, Locale } from '@/shared/api'
import { Variable, VARIABLE_BY_ID } from '@/shared/variables'

const FORMATTERS = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) => {
    const key = `${locale}|${timeZone}|${JSON.stringify(options)}`
    let formatter = FORMATTERS.get(key)

    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', { timeZone, ...options })
        FORMATTERS.set(key, formatter)
    }

    return formatter
}

export const formatTime = (iso: string | Date, timeZone: string, locale: string, options: Intl.DateTimeFormatOptions) =>
    getFormatter(locale, timeZone, options).format(new Date(iso))

export const formatStepLabel = (iso: string, timeZone: string, locale: string) =>
    formatTime(iso, timeZone, locale, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export const formatDayLabel = (iso: string, timeZone: string, locale: string) =>
    formatTime(iso, timeZone, locale, { weekday: 'short', day: 'numeric', month: 'short' })

export const formatUtc = (iso: string, locale: string) =>
    formatTime(iso, 'UTC', locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })

export const formatNumber = (value: number | null | undefined, decimals = 1) =>
    value === null || value === undefined || Number.isNaN(value) ? '–' : value.toFixed(decimals)

export const formatSigned = (value: number | null | undefined, decimals = 1) =>
    value === null || value === undefined ? '–' : `${value > 0 ? '+' : ''}${value.toFixed(decimals)}`

export const formatValue = (value: number | null | undefined, variable: Variable) => {
    const { decimals, unit } = VARIABLE_BY_ID[variable]

    return value === null || value === undefined ? '–' : `${value.toFixed(decimals)} ${unit}`
}

export const formatPercent = (value: number | null | undefined) =>
    value === null || value === undefined ? '–' : `${Math.round(value * 100)}%`

export const getCityName = (city: Pick<City, 'name' | 'nameLocal'>, locale: string) =>
    city.nameLocal?.[locale as Locale] ?? city.name

export const getCityLabel = (city: Pick<City, 'name' | 'nameLocal' | 'admin1' | 'country'>, locale: string) =>
    [getCityName(city, locale), city.admin1, city.country].filter(Boolean).join(', ')

// Offset of a time zone from UTC at a given instant, in minutes (positive east of Greenwich).
export const getTimeZoneOffsetMinutes = (date: Date, timeZone: string) => {
    const parts = getFormatter('en', timeZone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))

    return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000)
}

export const getLocalMidnights = (start: Date, end: Date, timeZone: string) => {
    const midnights: Date[] = []
    const offset = getTimeZoneOffsetMinutes(start, timeZone)
    const local = new Date(start.getTime() + offset * 60_000)
    let day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())

    for (let i = 0; i < 20; i++) {
        const guess = new Date(day)
        const utc = new Date(day - getTimeZoneOffsetMinutes(guess, timeZone) * 60_000)

        if (utc > end) break

        if (utc >= start) midnights.push(utc)

        day += 86_400_000
    }

    return midnights
}
