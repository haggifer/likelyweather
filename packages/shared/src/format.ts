import { City, Locale } from './api'
import { DAY_MS } from './constants'
import { getOrCreate } from './memo'

export type DayLabelStyle = 'long' | 'short' | 'narrow'

const INTL_LOCALES: Record<Locale, string> = {
    [Locale.Uk]: 'uk-UA',
    [Locale.En]: 'en-GB',
    [Locale.Es]: 'es-ES',
    [Locale.De]: 'de-DE',
    [Locale.Fr]: 'fr-FR',
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }

const DAY_LABEL_OPTIONS: Record<DayLabelStyle, Intl.DateTimeFormatOptions> = {
    long: { weekday: 'short', day: 'numeric', month: 'short' },
    short: { weekday: 'short', day: 'numeric' },
    narrow: { weekday: 'short' },
}

const ZONED_PARTS: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
}

const MINUTE_MS = 60_000
const FORMATTERS = new Map<string, Intl.DateTimeFormat>()
const REGION_NAMES = new Map<string, Intl.DisplayNames>()

const getIntlLocale = (locale: string) => INTL_LOCALES[locale as Locale] ?? INTL_LOCALES[Locale.En]

const getFormatter = (locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) =>
    getOrCreate(
        FORMATTERS,
        `${locale}|${timeZone}|${JSON.stringify(options)}`,
        () => new Intl.DateTimeFormat(getIntlLocale(locale), { timeZone, ...options }),
    )

const getRegionNames = (locale: string) =>
    getOrCreate(REGION_NAMES, locale, () => new Intl.DisplayNames([getIntlLocale(locale)], { type: 'region' }))

export const formatTime = (iso: string | Date, timeZone: string, locale: string, options: Intl.DateTimeFormatOptions) =>
    getFormatter(locale, timeZone, options).format(new Date(iso))

export const formatStepLabel = (iso: string, timeZone: string, locale: string) =>
    formatTime(iso, timeZone, locale, { weekday: 'short', ...CLOCK })

// A total over a span, e.g. "Sat 03:00–06:00": the day is the start's, so a span ending at midnight reads "Sat 21:00–00:00".
export const formatPeriodLabel = (start: string, end: string, timeZone: string, locale: string) =>
    `${formatStepLabel(start, timeZone, locale)}–${formatTime(end, timeZone, locale, CLOCK)}`

export const formatDayLabel = (iso: string, timeZone: string, locale: string, style: DayLabelStyle = 'long') =>
    formatTime(iso, timeZone, locale, DAY_LABEL_OPTIONS[style])

// A local date key ("2026-10-02", already in the city's calendar) as that day: read at noon UTC, so no zone shifts it.
export const formatDateKey = (day: string, locale: string, options: Intl.DateTimeFormatOptions) =>
    formatTime(`${day}T12:00:00Z`, 'UTC', locale, options)

// The viewer's own zone, for times that belong to no city (the quota reset). Read it only after mount: the
// server renders in UTC, so using it in the first render would mismatch on hydration.
export const getViewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const formatNumber = (value: number | null | undefined, decimals = 1) =>
    value === null || value === undefined || Number.isNaN(value) ? '–' : value.toFixed(decimals)

export const formatPercent = (value: number | null | undefined) =>
    value === null || value === undefined ? '–' : `${Math.round(value * 100)}%`

export const getCityName = (city: Pick<City, 'name' | 'nameLocal'>, locale: string) =>
    city.nameLocal?.[locale as Locale] ?? city.name

export const getCountryName = (countryCode: string, fallback: string, locale: string) => {
    const names = getRegionNames(locale)

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
    const parts = getFormatter(Locale.En, timeZone, ZONED_PARTS).formatToParts(date)
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))

    return Math.round((asUtc - Math.floor(date.getTime() / MINUTE_MS) * MINUTE_MS) / MINUTE_MS)
}

// The offset at UTC midnight can differ from the one at local midnight on a daylight-saving day (Sydney's clocks
// go forward at 02:00 local, which is 16:00 UTC the day before), so the first estimate is corrected once.
const toLocalMidnight = (day: number, timeZone: string) => {
    const estimate = new Date(day - getTimeZoneOffsetMinutes(new Date(day), timeZone) * MINUTE_MS)

    return new Date(day - getTimeZoneOffsetMinutes(estimate, timeZone) * MINUTE_MS)
}

export const getLocalMidnights = (start: Date, end: Date, timeZone: string) => {
    const midnights: Date[] = []

    const offset = getTimeZoneOffsetMinutes(start, timeZone)
    const local = new Date(start.getTime() + offset * MINUTE_MS)
    let day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())

    for (let i = 0; i < 20; i++) {
        const utc = toLocalMidnight(day, timeZone)

        if (utc > end) break

        if (utc >= start) midnights.push(utc)

        day += DAY_MS
    }

    return midnights
}
