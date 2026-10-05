import { ModelId, OPEN_METEO_MODELS } from '@fa/shared/models'
import { indexHourlyTimes, toStepSeries } from '@fa/shared/resample'
import { ModelSeries, SERIES_FIELDS } from '@fa/shared/variables'
import { env } from '../env'
import { fetchJson } from './fetch-with-retry'

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

type TimeIndex = ReturnType<typeof indexHourlyTimes>

const HOURLY_KEYS = SERIES_FIELDS.map((f) => f.openMeteoKey).join(',')

const buildForecastUrl = (locations: LatLon[], models: ModelId[] = OPEN_METEO_MODELS) => {
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

// With a single model Open-Meteo drops the model suffix from the hourly keys.
const getHourlyValues = (hourly: OpenMeteoLocation['hourly'], key: string, model: ModelId, isSingleModel: boolean) =>
    hourly[`${key}_${model}`] ?? (isSingleModel ? hourly[key] : undefined)

const toModelSeries = (
    location: OpenMeteoLocation,
    timeIndex: TimeIndex,
    steps: string[],
    model: ModelId,
    isSingleModel: boolean,
) =>
    Object.fromEntries(
        SERIES_FIELDS.map(({ field, openMeteoKey, aggregation }) => [
            field,
            toStepSeries(
                timeIndex,
                getHourlyValues(location.hourly, openMeteoKey, model, isSingleModel),
                steps,
                aggregation,
                1,
            ),
        ]),
    ) as unknown as ModelSeries

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

export const parseOpenMeteoModels = (
    location: OpenMeteoLocation,
    steps: string[],
    models: ModelId[] = OPEN_METEO_MODELS,
): Partial<Record<ModelId, ModelSeries>> => {
    const timeIndex = indexHourlyTimes(location.hourly.time)
    const isSingleModel = models.length === 1
    const parsed: Partial<Record<ModelId, ModelSeries>> = {}

    for (const model of models) {
        const series = toModelSeries(location, timeIndex, steps, model, isSingleModel)

        if (series.temp.some((v) => v !== null)) parsed[model] = series
    }

    return parsed
}
