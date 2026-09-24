import { env } from '@/server/env'
import { fetchJson } from '@/server/sources/fetchWithRetry'
import { STEP_HOURS } from '@/shared/constants'
import { ModelId, OPEN_METEO_MODELS } from '@/shared/models'
import { indexHourlyTimes, toStepSeries } from '@/shared/resample'
import { ModelSeries, SERIES_FIELDS } from '@/shared/variables'

export interface LatLon {
    lat: number
    lon: number
}

export interface OpenMeteoLocation {
    latitude: number
    longitude: number
    elevation?: number
    hourly: Record<string, (number | null)[]> & { time: string[] }
}

interface OpenMeteoError {
    error: true
    reason: string
}

export const OPEN_METEO_BATCH_SIZE = 50

const HOURLY_KEYS = SERIES_FIELDS.map((f) => f.openMeteoKey).join(',')

export const buildForecastUrl = (locations: LatLon[], models: ModelId[] = OPEN_METEO_MODELS) => {
    const params = new URLSearchParams({
        latitude: locations.map((l) => l.lat.toFixed(4)).join(','),
        longitude: locations.map((l) => l.lon.toFixed(4)).join(','),
        hourly: HOURLY_KEYS,
        models: models.join(','),
        past_days: '1',
        forecast_days: '6',
        timezone: 'UTC',
        wind_speed_unit: 'ms',
    })

    return `${env.OPEN_METEO_FORECAST_BASE}/v1/forecast?${params}`
}

export const fetchOpenMeteoForecast = async (locations: LatLon[], models: ModelId[] = OPEN_METEO_MODELS) => {
    const body = await fetchJson<OpenMeteoLocation | OpenMeteoLocation[] | OpenMeteoError>(
        buildForecastUrl(locations, models),
    )

    if (!Array.isArray(body) && 'error' in body) throw new Error(`Open-Meteo: ${body.reason}`)

    const results = Array.isArray(body) ? body : [body]

    if (results.length !== locations.length) {
        throw new Error(`Open-Meteo returned ${results.length} locations for ${locations.length} requested`)
    }

    return results
}

const getHourlyValues = (hourly: OpenMeteoLocation['hourly'], key: string, model: ModelId, single: boolean) =>
    hourly[`${key}_${model}`] ?? (single ? hourly[key] : undefined)

export const parseOpenMeteoModels = (
    location: OpenMeteoLocation,
    steps: string[],
    sumHours = STEP_HOURS,
    models: ModelId[] = OPEN_METEO_MODELS,
): Partial<Record<ModelId, ModelSeries>> => {
    const timeIndex = indexHourlyTimes(location.hourly.time)
    const single = models.length === 1
    const parsed: Partial<Record<ModelId, ModelSeries>> = {}

    for (const model of models) {
        const series = Object.fromEntries(
            SERIES_FIELDS.map(({ field, openMeteoKey, aggregation }) => [
                field,
                toStepSeries(
                    timeIndex,
                    getHourlyValues(location.hourly, openMeteoKey, model, single),
                    steps,
                    aggregation,
                    sumHours,
                ),
            ]),
        ) as unknown as ModelSeries

        if (series.temp.some((v) => v !== null)) parsed[model] = series
    }

    return parsed
}
