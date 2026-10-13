import type { ArchiveResponse } from './api'
import { DAY_MS, HOUR_MS } from './constants'
import { getLocalMidnight } from './format'
import { getLocalDateKey } from './time'

// A period of a city's past weather: whole local days, both ends included (`YYYY-MM-DD`).
export interface ArchiveRange {
    from: string
    to: string
}

// Open-Meteo counts a request of up to 14 days and 10 variables as one call; 12 days keep a margin (author,
// 2026-10-12), so an archive request never costs more than one call and one unit of the viewer's quota.
export const ARCHIVE_MAX_DAYS = 12
// ERA5 starts in 1940.
export const ARCHIVE_FIRST_DATE = '1940-01-01'
// How a chart's label speaks the period's ends; the period itself reads DD.MM.YYYY (`formatArchiveRange`).
export const ARCHIVE_LABEL_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
const DEFAULT_DAYS = 7
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const RANGE_SEPARATOR = '|'

// The stored hourly fields and the Historical Weather API variables they come from. Feels-like is Open-Meteo's own
// apparent temperature here, the formula the forecasts use at ingest.
export const ARCHIVE_FIELDS = [
    { field: 'temp', openMeteoKey: 'temperature_2m' },
    { field: 'feels', openMeteoKey: 'apparent_temperature' },
    { field: 'wind', openMeteoKey: 'wind_speed_10m' },
    { field: 'gusts', openMeteoKey: 'wind_gusts_10m' },
    { field: 'windDir', openMeteoKey: 'wind_direction_10m' },
    { field: 'pressure', openMeteoKey: 'pressure_msl' },
    { field: 'precip', openMeteoKey: 'precipitation' },
    { field: 'humidity', openMeteoKey: 'relative_humidity_2m' },
    { field: 'cloud', openMeteoKey: 'cloud_cover' },
] as const

export type ArchiveField = (typeof ARCHIVE_FIELDS)[number]['field']

const addDays = (dateKey: string, days: number) =>
    new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

export const countArchiveDays = ({ from, to }: ArchiveRange) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

// Yesterday in the city: today's later hours are still a forecast in the archive.
export const getLatestArchiveDate = (now: Date, timeZone: string) =>
    addDays(getLocalDateKey(now.toISOString(), timeZone), -1)

export const getDefaultArchiveRange = (now: Date, timeZone: string): ArchiveRange => {
    const to = getLatestArchiveDate(now, timeZone)

    return { from: addDays(to, 1 - DEFAULT_DAYS), to }
}

// A real calendar day: `Date.parse` would roll 30 February over into March.
const isDateKey = (value: string) =>
    DATE_KEY.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

export const isValidArchiveRange = (range: ArchiveRange, latest: string) =>
    isDateKey(range.from) &&
    isDateKey(range.to) &&
    range.from >= ARCHIVE_FIRST_DATE &&
    range.from <= range.to &&
    range.to <= latest &&
    countArchiveDays(range) <= ARCHIVE_MAX_DAYS

// The stored period, or the week up to yesterday when there is none or it is no longer one the API accepts.
export const resolveArchiveRange = (stored: ArchiveRange | null, now: Date, timeZone: string): ArchiveRange =>
    stored && isValidArchiveRange(stored, getLatestArchiveDate(now, timeZone))
        ? stored
        : getDefaultArchiveRange(now, timeZone)

// One string per period, for keying what is drawn from it.
export const getArchiveRangeKey = ({ from, to }: ArchiveRange) => `${from}${RANGE_SEPARATOR}${to}`

// DD.MM.YYYY in every language (author, 2026-10-13), built from the key itself rather than `Intl`, whose order and
// separators change with the locale.
export const formatArchiveDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-')

    return `${day}.${month}.${year}`
}

export const formatArchiveRange = ({ from, to }: ArchiveRange) =>
    `${formatArchiveDate(from)} – ${formatArchiveDate(to)}`

// A period the archive has no hours for: the hours come back, all empty.
export const isEmptyArchive = ({ values }: Pick<ArchiveResponse, 'values'>) => values.temp.every((v) => v === null)

// The UTC hours the local days cover, start included and end excluded, widened to whole hours for zones that are a
// half hour off UTC, since the archive is hourly in UTC.
export const getArchiveHours = ({ from, to }: ArchiveRange, timeZone: string) => {
    const start = getLocalMidnight(from, timeZone)
    const end = getLocalMidnight(addDays(to, 1), timeZone)

    return {
        start: new Date(Math.floor(start.getTime() / HOUR_MS) * HOUR_MS),
        end: new Date(Math.ceil(end.getTime() / HOUR_MS) * HOUR_MS),
    }
}
