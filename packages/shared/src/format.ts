import { City, Locale } from './api'

const INTL_LOCALES: Record<Locale, string> = {
    [Locale.Uk]: 'uk-UA',
    [Locale.En]: 'en-GB',
    [Locale.Es]: 'es-ES',
    [Locale.De]: 'de-DE',
    [Locale.Fr]: 'fr-FR',
}

const FORMATTERS = new Map<string, Intl.DateTimeFormat>()
const REGION_NAMES = new Map<string, Intl.DisplayNames>()

const getIntlLocale = (locale: string) => INTL_LOCALES[locale as Locale] ?? INTL_LOCALES[Locale.En]

const getFormatter = (locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) => {
    const key = `${locale}|${timeZone}|${JSON.stringify(options)}`
    let formatter = FORMATTERS.get(key)

    if (!formatter) {
        formatter = new Intl.DateTimeFormat(getIntlLocale(locale), { timeZone, ...options })
        FORMATTERS.set(key, formatter)
    }

    return formatter
}

export const formatTime = (iso: string | Date, timeZone: string, locale: string, options: Intl.DateTimeFormatOptions) =>
    getFormatter(locale, timeZone, options).format(new Date(iso))

export const formatStepLabel = (iso: string, timeZone: string, locale: string) =>
    formatTime(iso, timeZone, locale, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

// A total over a span, e.g. "Sat 03:00–06:00": the day is the start's, so a span ending at midnight reads "Sat 21:00–00:00".
export const formatPeriodLabel = (start: string, end: string, timeZone: string, locale: string) =>
    `${formatStepLabel(start, timeZone, locale)}–${formatTime(end, timeZone, locale, CLOCK)}`

export type DayLabelStyle = 'long' | 'short' | 'narrow'

const DAY_LABEL_OPTIONS: Record<DayLabelStyle, Intl.DateTimeFormatOptions> = {
    long: { weekday: 'short', day: 'numeric', month: 'short' },
    short: { weekday: 'short', day: 'numeric' },
    narrow: { weekday: 'short' },
}

export const formatDayLabel = (iso: string, timeZone: string, locale: string, style: DayLabelStyle = 'long') =>
    formatTime(iso, timeZone, locale, DAY_LABEL_OPTIONS[style])

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

export const formatPercent = (value: number | null | undefined) =>
    value === null || value === undefined ? '–' : `${Math.round(value * 100)}%`

export const getCityName = (city: Pick<City, 'name' | 'nameLocal'>, locale: string) =>
    city.nameLocal?.[locale as Locale] ?? city.name

export const getCountryName = (countryCode: string, fallback: string, locale: string) => {
    let names = REGION_NAMES.get(locale)

    if (!names) {
        names = new Intl.DisplayNames([getIntlLocale(locale)], { type: 'region' })
        REGION_NAMES.set(locale, names)
    }

    try {
        return names.of(countryCode.toUpperCase()) ?? fallback
    } catch {
        return fallback
    }
}

export const getCityLabel = (
    city: Pick<City, 'name' | 'nameLocal' | 'admin1' | 'country' | 'countryCode'>,
    locale: string,
) =>
    [getCityName(city, locale), city.admin1, getCountryName(city.countryCode, city.country, locale)]
        .filter(Boolean)
        .join(', ')

// Offset of a time zone from UTC at a given instant, in minutes (positive east of Greenwich).
export const getTimeZoneOffsetMinutes = (date: Date, timeZone: string) => {
    const parts = getFormatter(Locale.En, timeZone, {
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
