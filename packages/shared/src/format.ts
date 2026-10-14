import { City, Locale } from './api'
import { DAY_MS, HOUR_MS } from './constants'
import { getOrCreate } from './memo'

export type DayLabelStyle = 'long' | 'short' | 'narrow'

const INTL_LOCALES: Record<Locale, string> = {
    [Locale.Uk]: 'uk-UA',
    [Locale.En]: 'en-GB',
    [Locale.Es]: 'es-ES',
    [Locale.De]: 'de-DE',
    [Locale.Fr]: 'fr-FR',
    [Locale.Ru]: 'ru-RU',
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
// A day tile's two lines on phones: the weekday, then the date (author, 2026-10-14).
export const formatDayTileLines = (day: string, locale: string) =>
    [
        formatDateKey(day, locale, { weekday: 'short' }),
        formatDateKey(day, locale, { day: 'numeric', month: 'short' }),
    ] as const

export const getViewerTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const formatNumber = (value: number | null | undefined, decimals = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '–'

    const text = value.toFixed(decimals)

    // "-0.0" is a rounding artefact of a small negative median, not a reading.
    return Number(text) === 0 ? text.replace('-', '') : text
}

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
// go forward at 02:00 local, which is 16:00 UTC the day before), so the first estimate is corrected once. A zone
// whose clocks jump forward at midnight itself (Santiago, Havana) has no 00:00 that day: the correction lands on
// 23:00 of the day before, and the day's first instant is one hour later.
const toLocalMidnight = (day: number, timeZone: string) => {
    const estimate = new Date(day - getTimeZoneOffsetMinutes(new Date(day), timeZone) * MINUTE_MS)
    const midnight = new Date(day - getTimeZoneOffsetMinutes(estimate, timeZone) * MINUTE_MS)
    const localMs = midnight.getTime() + getTimeZoneOffsetMinutes(midnight, timeZone) * MINUTE_MS

    return localMs < day ? new Date(midnight.getTime() + HOUR_MS) : midnight
}

// The instant a local calendar day (`2026-10-12`) starts in a time zone.
export const getLocalMidnight = (dateKey: string, timeZone: string) =>
    toLocalMidnight(Date.parse(`${dateKey}T00:00:00Z`), timeZone)

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

// A clock time in each language's usual notation: English in 12-hour time ("3:00 AM"), the others in 24-hour
// ("03:00"). The other formatters keep en-GB's 24-hour clock for chart labels, where a 12-hour time is too wide.
export const formatClockTime = (iso: string | Date, timeZone: string, locale: string) =>
    getOrCreate(
        FORMATTERS,
        `clock|${locale}|${timeZone}`,
        () =>
            new Intl.DateTimeFormat(locale === Locale.En ? 'en-US' : getIntlLocale(locale), {
                timeZone,
                hour: locale === Locale.En ? 'numeric' : '2-digit',
                minute: '2-digit',
            }),
    ).format(new Date(iso))

// A meteorological direction, where the wind comes from, as a compass point and degrees ("SW 225°"); `points` are the
// catalog's compass labels, clockwise from north.
export const formatWindDirection = (degrees: number, points: string[]) => {
    const bearing = ((degrees % 360) + 360) % 360
    const point = points[Math.round(bearing / (360 / points.length)) % points.length]

    return `${point} ${Math.round(bearing) % 360}°`
}
