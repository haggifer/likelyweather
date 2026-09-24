import { env } from '@/server/env'
import { fetchWithRetry } from '@/server/sources/fetchWithRetry'
import { STEP_HOURS } from '@/shared/constants'
import { addHours, toIsoMinute } from '@/shared/time'
import { ModelSeries } from '@/shared/variables'

interface MetnoDetails {
    air_temperature?: number
    wind_speed?: number
    wind_from_direction?: number
    air_pressure_at_sea_level?: number
    precipitation_amount?: number
}

interface MetnoEntry {
    time: string
    data: {
        instant: { details: MetnoDetails }
        next_1_hours?: { details: MetnoDetails }
        next_6_hours?: { details: MetnoDetails }
    }
}

export interface MetnoBody {
    properties: { meta: { updated_at: string }; timeseries: MetnoEntry[] }
}

export interface MetnoResult {
    status: 200 | 304
    body: MetnoBody | null
    lastModified: string | null
}

export const fetchMetno = async (lat: number, lon: number, ifModifiedSince?: string): Promise<MetnoResult> => {
    const params = new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) })
    const headers: Record<string, string> = { 'User-Agent': env.METNO_USER_AGENT }

    if (ifModifiedSince) headers['If-Modified-Since'] = ifModifiedSince

    const res = await fetchWithRetry(`${env.METNO_BASE}/weatherapi/locationforecast/2.0/compact?${params}`, { headers })

    if (res.status === 304) return { status: 304, body: null, lastModified: ifModifiedSince ?? null }

    return { status: 200, body: (await res.json()) as MetnoBody, lastModified: res.headers.get('last-modified') }
}

const round = (value: number) => Math.round(value * 100) / 100

// met.no mixes hourly and 6-hourly entries. Instant values are read at the step; precipitation is the amount of the
// `sumHours` hours ending at the step (on the 6-hour grid next_6_hours of step−6h, else the next_1_hours blocks),
// matching Open-Meteo.
const getPrecipEndingAt = (byTime: Map<string, MetnoEntry>, step: string, sumHours: number) => {
    if (sumHours === STEP_HOURS) {
        const sixHour = byTime.get(toIsoMinute(addHours(new Date(step), -STEP_HOURS)))?.data.next_6_hours?.details
            .precipitation_amount

        if (sixHour !== undefined) return sixHour
    }

    let total = 0

    for (let h = sumHours; h >= 1; h--) {
        const amount = byTime.get(toIsoMinute(addHours(new Date(step), -h)))?.data.next_1_hours?.details
            .precipitation_amount

        if (amount === undefined) return null

        total += amount
    }

    return round(total)
}

export const parseMetno = (body: MetnoBody, steps: string[], sumHours = STEP_HOURS): ModelSeries | null => {
    const byTime = new Map(body.properties.timeseries.map((e) => [toIsoMinute(new Date(e.time)), e]))
    const instant = (step: string, key: keyof MetnoDetails) => byTime.get(step)?.data.instant.details[key] ?? null
    const series: ModelSeries = {
        temp: steps.map((s) => instant(s, 'air_temperature')),
        wind: steps.map((s) => instant(s, 'wind_speed')),
        windDir: steps.map((s) => instant(s, 'wind_from_direction')),
        pressure: steps.map((s) => instant(s, 'air_pressure_at_sea_level')),
        pressureSfc: steps.map(() => null),
        precip: steps.map((s) => getPrecipEndingAt(byTime, s, sumHours)),
        rain: steps.map(() => null),
        snow: steps.map(() => null),
    }

    return series.temp.some((v) => v !== null) ? series : null
}
