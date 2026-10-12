import { ARCHIVE_FIELDS, ArchiveField } from '@fa/shared/archive'
import { env } from '../env'
import { fetchJson } from './fetch-with-retry'
import { LatLon } from './open-meteo'

export interface ArchiveHourValues {
    time: Date
    values: Record<ArchiveField, number | null>
}

interface ArchiveBody {
    hourly: Record<string, (number | null)[]> & { time: string[] }
}

interface OpenMeteoError {
    error: true
    reason: string
}

const HOURLY_KEYS = ARCHIVE_FIELDS.map((f) => f.openMeteoKey).join(',')

const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

// The request asks for the whole UTC days around the wanted hours (at most 14 for a 12-day local range, so still one
// call); the hours outside are dropped.
const buildArchiveUrl = ({ lat, lon }: LatLon, start: Date, end: Date) => {
    const params = new URLSearchParams({
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        start_date: toDateKey(start),
        end_date: toDateKey(new Date(end.getTime() - 1)),
        hourly: HOURLY_KEYS,
        timezone: 'GMT',
        wind_speed_unit: 'ms',
    })

    return `${env.OPEN_METEO_ARCHIVE_BASE}/v1/archive?${params}`
}

// Past hours of one place from Open-Meteo's Historical Weather API (ERA5, and the ECMWF IFS analysis for the last
// days). Times come back in GMT without an offset.
export const fetchArchiveHours = async (location: LatLon, start: Date, end: Date): Promise<ArchiveHourValues[]> => {
    const body = await fetchJson<ArchiveBody | OpenMeteoError>(buildArchiveUrl(location, start, end))

    if ('error' in body) throw new Error(`Open-Meteo archive: ${body.reason}`)

    return body.hourly.time.flatMap((iso, i) => {
        const time = new Date(`${iso}:00Z`)

        if (time < start || time >= end) return []

        const values = Object.fromEntries(
            ARCHIVE_FIELDS.map(({ field, openMeteoKey }) => [field, body.hourly[openMeteoKey]?.[i] ?? null]),
        ) as ArchiveHourValues['values']

        return [{ time, values }]
    })
}
